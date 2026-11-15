"""Issue and score an auditable classroom forecast from archived USGS responses."""

import argparse
import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import quantiles
from urllib.parse import urlencode
from urllib.request import urlopen


SITES = {"01100000", "05420500", "11447650", "01646500"}
GRID_MINUTES = 30
CONTINUOUS = "https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items"


def issue(snapshot, targets):
    now = datetime.now(timezone.utc)
    if len(set(targets)) != len(targets) or any(
        target <= now or target.utcoffset() != timezone.utc.utcoffset(now)
        or target.minute % GRID_MINUTES or target.second or target.microsecond for target in targets
    ):
        raise ValueError("targets must be distinct future UTC half-hour marks")
    content = snapshot.read_bytes()
    rows = []
    for series in json.loads(content)["value"]["timeSeries"]:
        site = series["sourceInfo"]["siteCode"][0]["value"]
        if site not in SITES:
            continue
        assert series["variable"]["variableCode"][0]["value"] == "00060"
        assert series["variable"]["unit"]["unitCode"] == "ft3/s"
        values = {}
        for block in series["values"]:
            for row in block["value"]:
                stamp = datetime.fromisoformat(row["dateTime"]).astimezone(timezone.utc)
                value = float(row["value"])
                if stamp <= now and stamp.minute % GRID_MINUTES == 0 and stamp.second == 0 and math.isfinite(value) and value >= 0:
                    values[stamp] = value
        times = sorted(values)
        anchor = times[-1]
        center = values[anchor]
        threshold = quantiles([values[t] for t in times[:-20]], n=10, method="inclusive")[-1]
        for target in targets:
            span = target - anchor
            errors = sorted(abs(values[t] - values[t - span]) for t in times if t - span in values)
            if len(errors) < 80:
                raise ValueError(f"insufficient historical pairs for {site}, {target}")
            radius = errors[math.ceil(.9 * (len(errors) + 1)) - 1]
            rows.append({
                "site": site, "targetUtc": target.isoformat(), "center": center,
                "anchorUtc": anchor.isoformat(), "highCutoff": threshold,
                "condition": "high" if center > threshold else "ordinary",
                "historyPairs": len(errors), "lo": max(0, center - radius), "hi": center + radius,
            })
    assert {row["site"] for row in rows} == SITES
    return {
        "purpose": "Classroom demonstration. Nominal intervals, not operational alerts.",
        "unit": "ft3/s", "parameter": "00060", "issuedLocalUtc": now.isoformat(),
        "baselineSha256": hashlib.sha256(content).hexdigest(),
        "forecasts": sorted(rows, key=lambda row: (row["targetUtc"], row["site"])),
    }


def read_observations(response_files):
    observed = {}
    for path in response_files:
        for feature in json.loads(path.read_bytes())["features"]:
            row = feature["properties"]
            assert row["parameter_code"] == "00060"
            assert row["unit_of_measure"] == "ft^3/s"
            key = (row["monitoring_location_id"].removeprefix("USGS-"),
                   datetime.fromisoformat(row["time"]).astimezone(timezone.utc))
            if key in observed:
                raise ValueError(f"duplicate observation: {key}")
            observed[key] = row
    return observed


def numeric_value(outcome):
    if outcome is None or outcome["value"] is None:
        return None
    try:
        value = float(outcome["value"])
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) and value >= 0 else None


def frozen_forecasts(forecast):
    document = json.loads(forecast.read_bytes())
    if "forecasts" in document:
        return document["forecasts"]
    return document["predictions"]


def snapshot(forecast, destination):
    groups = defaultdict(list)
    collected = datetime.now(timezone.utc)
    for row in frozen_forecasts(forecast):
        stamp = datetime.fromisoformat(row["targetUtc"])
        if stamp <= collected:
            groups[row["site"]].append(stamp)
    if not groups:
        raise ValueError("no forecast targets have passed yet")
    destination.mkdir()
    receipts = []
    for site, targets in sorted(groups.items()):
        first, last = min(targets), max(targets)
        interval = first.isoformat() if first == last else f"{first.isoformat()}/{last.isoformat()}"
        query = urlencode({
            "monitoring_location_id": f"USGS-{site}", "parameter_code": "00060",
            "datetime": interval, "limit": 1000,
        })
        try:
            with urlopen(f"{CONTINUOUS}?{query}", timeout=20) as response:
                raw = response.read()
                http_date = response.headers.get("Date")
        except OSError as error:
            receipts.append({"site": site, "error": str(error)})
            continue
        received = datetime.now(timezone.utc)
        data = json.loads(raw)
        if any(link.get("rel") == "next" for link in data.get("links", [])):
            receipts.append({"site": site, "error": "observation response has another page"})
            continue
        (destination / f"{site}.json").write_bytes(raw)
        receipts.append({
            "site": site, "receivedUtc": received.isoformat(), "serverDate": http_date,
            "bytesSha256": hashlib.sha256(raw).hexdigest(),
        })
    (destination / "receipts.json").write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
    if not any("bytesSha256" in item for item in receipts):
        raise ValueError("all observation requests failed; see receipts.json")


def score(forecast, response_files):
    observed = read_observations(response_files)
    for row in frozen_forecasts(forecast):
        outcome = observed.get((row["site"], datetime.fromisoformat(row["targetUtc"])))
        if (value := numeric_value(outcome)) is not None:
            print(row["site"], row["targetUtc"], row["condition"], outcome["approval_status"], value,
                  "hit" if row["lo"] <= value <= row["hi"] else "miss")
        else:
            print(row["site"], row["targetUtc"], row["condition"], "pending")


def compare_approvals(forecast, before, after):
    original = read_observations(before)
    latest = read_observations(after)
    paired = []
    for row in frozen_forecasts(forecast):
        key = row["site"], datetime.fromisoformat(row["targetUtc"])
        prior, current = original.get(key), latest.get(key)
        if not prior or not current or (prior["approval_status"], current["approval_status"]) != (
                "Provisional", "Approved"):
            continue
        first, final = numeric_value(prior), numeric_value(current)
        if first is None or final is None:
            continue
        paired.append({
            "site": row["site"], "targetUtc": row["targetUtc"], "condition": row["condition"],
            "provisional": first, "approved": final, "delta": final - first,
            "firstHit": row["lo"] <= first <= row["hi"], "approvedHit": row["lo"] <= final <= row["hi"],
        })
    return paired


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    issue_parser = commands.add_parser("issue")
    issue_parser.add_argument("snapshot", type=Path)
    issue_parser.add_argument("output", type=Path)
    issue_parser.add_argument("targets", nargs="+", type=datetime.fromisoformat)
    score_parser = commands.add_parser("score")
    score_parser.add_argument("forecast", type=Path)
    score_parser.add_argument("responses", nargs="+", type=Path)
    compare_parser = commands.add_parser("pair-approvals")
    compare_parser.add_argument("forecast", type=Path)
    compare_parser.add_argument("--before", nargs="+", type=Path, required=True)
    compare_parser.add_argument("--after", nargs="+", type=Path, required=True)
    snapshot_parser = commands.add_parser("snapshot")
    snapshot_parser.add_argument("forecast", type=Path)
    snapshot_parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    if args.command == "issue":
        content = (json.dumps(issue(args.snapshot, args.targets), indent=2) + "\n").encode()
        with args.output.open("xb") as output:
            output.write(content)
    elif args.command == "score":
        score(args.forecast, args.responses)
    elif args.command == "pair-approvals":
        print(json.dumps(compare_approvals(args.forecast, args.before, args.after), indent=2))
    else:
        snapshot(args.forecast, args.destination)
