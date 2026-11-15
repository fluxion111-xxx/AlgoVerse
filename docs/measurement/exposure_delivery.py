"""Join exposure and downstream records by ID using two calibrated clock maps."""

import argparse
import json
from pathlib import Path
from statistics import median
from math import isfinite


def load_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def map_epoch(event, clock):
    if event["clockEpoch"] != clock["epoch"]:
        raise ValueError("event belongs to an uncalibrated clock epoch")
    tick = event["timestampNs"]
    if not clock["fromNs"] <= tick <= clock["throughNs"]:
        raise ValueError("event falls outside clock calibration")
    return clock["referenceNs"] + round((tick - clock["offsetNs"]) * clock["rate"])


def summarize(exposures, receipts, calibration, deadline_ns):
    exposure_clock, receipt_clock = calibration["exposure"], calibration["receipt"]
    if deadline_ns <= 0 or any(
        not isfinite(clock["rate"]) or clock["rate"] <= 0 or clock["worstErrorNs"] < 0
        for clock in (exposure_clock, receipt_clock)
    ):
        raise ValueError("clock rates and deadline must be positive; clock error cannot be negative")
    error_ns = exposure_clock["worstErrorNs"] + receipt_clock["worstErrorNs"]
    expected, earliest = {}, {}
    duplicates = out_of_order = 0
    for row in exposures:
        key = row["id"]
        if key in expected:
            raise ValueError(f"duplicate exposure ID: {key}")
        expected[key] = map_epoch(row, exposure_clock)
    for row in receipts:
        key = row["id"]
        if key not in expected:
            raise ValueError(f"unknown receipt ID: {key}")
        t = map_epoch(row, receipt_clock)
        if key in earliest:
            duplicates += 1
            earliest[key] = min(earliest[key], t)
        else:
            earliest[key] = t
    latest_exposure = None
    delays = []
    for key, receipt_time in sorted(earliest.items(), key=lambda pair: pair[1]):
        exposure_time = expected[key]
        if latest_exposure is not None and exposure_time < latest_exposure:
            out_of_order += 1
        latest_exposure = max(exposure_time, latest_exposure) if latest_exposure is not None else exposure_time
        delay = receipt_time - exposure_time
        if delay < -error_ns:
            raise ValueError(f"receipt precedes exposure beyond calibration error: {key}")
        delays.append(delay)
    delays.sort()
    if not expected:
        raise ValueError("no exposure records")
    return {
        "expected": len(expected), "delivered": len(delays), "missing": len(expected) - len(delays),
        "duplicates": duplicates, "outOfOrder": out_of_order, "maxClockErrorNs": error_ns,
        "definitelyLate": sum(delay - error_ns > deadline_ns for delay in delays),
        "deadlineUncertain": sum(delay - error_ns <= deadline_ns < delay + error_ns for delay in delays),
        "p50Ms": median(delays) / 1e6 if delays else None,
        "p95Ms": delays[(95 * len(delays) + 99) // 100 - 1] / 1e6 if delays else None,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("exposures", type=Path)
    parser.add_argument("receipts", type=Path)
    parser.add_argument("calibration", type=Path)
    parser.add_argument("--deadline-ms", type=float, required=True)
    args = parser.parse_args()
    print(json.dumps(summarize(
        load_jsonl(args.exposures), load_jsonl(args.receipts),
        json.loads(args.calibration.read_bytes()), round(args.deadline_ms * 1e6),
    ), indent=2))
