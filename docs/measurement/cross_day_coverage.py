"""Score archived USGS IV responses with a 30-minute availability assumption."""

import json
import math
import sys
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from statistics import quantiles


SITES = ("01646500", "02424000", "14105700")
TRAIN_START = datetime(2024, 1, 2, tzinfo=timezone.utc)
TEST_START = datetime(2024, 1, 17, tzinfo=timezone.utc)
TEST_END = date(2024, 2, 1)
HORIZON = timedelta(minutes=45)
SOURCE_LAG = timedelta(minutes=30)


def load_approved(path, site):
    document = json.loads(path.read_bytes())
    series, = document["value"]["timeSeries"]
    assert series["sourceInfo"]["siteCode"][0]["value"] == site
    assert series["variable"]["unit"]["unitCode"] == "ft3/s"
    assert series["variable"]["variableCode"][0]["value"] == "00060"
    observations = {}
    for block in series["values"]:
        for row in block["value"]:
            timestamp = datetime.fromisoformat(row["dateTime"]).astimezone(timezone.utc)
            value = float(row["value"])
            if "A" in row["qualifiers"] and math.isfinite(value) and value >= 0:
                assert timestamp not in observations
                observations[timestamp] = value
    return observations


def interval_error(center, observed):
    return abs(observed - center)


def replay(observations):
    calibration = sorted(
        interval_error(observations[timestamp - HORIZON], value)
        for timestamp, value in observations.items()
        if TRAIN_START <= timestamp - HORIZON and timestamp + SOURCE_LAG < TEST_START
        and timestamp.minute % 15 == 0 and timestamp - HORIZON in observations
    )
    rank = math.ceil(.9 * (len(calibration) + 1))
    if rank > len(calibration):
        raise ValueError("insufficient calibration observations for the requested rank")
    radius = calibration[rank - 1]
    training_centers = [
        value for timestamp, value in observations.items()
        if TRAIN_START <= timestamp and timestamp + SOURCE_LAG < TEST_START
        and timestamp.minute % 15 == 0
    ]
    threshold = quantiles(training_centers, n=10, method="inclusive")[-1]
    groups = defaultdict(lambda: {"scored": 0, "hits": 0, "days": set()})
    missing = 0
    timestamp = TEST_START + HORIZON
    end = datetime.combine(TEST_END, time(), timezone.utc)
    while timestamp < end:
        center = observations.get(timestamp - HORIZON)
        outcome = observations.get(timestamp)
        if center is None or outcome is None:
            missing += 1
        else:
            entry = groups["high" if center >= threshold else "ordinary"]
            entry["hits"] += interval_error(center, outcome) <= radius
            entry["scored"] += 1
            entry["days"].add(timestamp.date().isoformat())
        timestamp += timedelta(minutes=15)
    for entry in groups.values():
        entry["days"] = sorted(entry["days"])
    return {
        "calibration": len(calibration),
        "highThresholdCfs": threshold,
        "radiusCfs": radius,
        "missing": missing,
        "groups": dict(groups),
    }


if __name__ == "__main__":
    directory = Path(sys.argv[1])
    result = {site: replay(load_approved(directory / f"approved-{site}.json", site)) for site in SITES}
    print(json.dumps(result, indent=2))
