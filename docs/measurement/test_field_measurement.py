import csv
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from exposure_delivery import summarize
from hdr_blind_schedule import prepare
from live_water_forecast import compare_approvals


class FieldMeasurementTests(unittest.TestCase):
    def test_only_real_status_pair_is_eligible_for_scoring(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            forecast, first, later = (root / name for name in ("forecast.json", "first.json", "later.json"))
            timestamp = "2026-11-14T13:30:00+00:00"
            forecast.write_text(json.dumps({"forecasts": [
                {"site": "01100000", "targetUtc": timestamp, "condition": "high", "lo": 1, "hi": 3},
            ]}))

            def observation(stamp, state, value):
                return {"features": [{"properties": {
                    "monitoring_location_id": "USGS-01100000", "parameter_code": "00060",
                    "unit_of_measure": "ft^3/s", "time": stamp, "approval_status": state, "value": value,
                }}]}

            first.write_text(json.dumps(observation("2026-11-14T08:30:00-05:00", "Provisional", 2)))
            later.write_text(json.dumps(observation(timestamp, "Approved", 4)))
            paired, = compare_approvals(forecast, [first], [later])
            self.assertEqual((paired["delta"], paired["firstHit"], paired["approvedHit"]), (2, True, False))
            self.assertEqual(compare_approvals(forecast, [first], [first]), [])

    def test_blind_schedule_balances_both_orders_by_clip_and_keeps_viewer_blank(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "schedule"
            prepare(root, ["apple", "lake"], 8, 2938)
            with (root / "operator-only.csv").open() as source:
                operator = list(csv.DictReader(source))
            with (root / "viewer.csv").open() as source:
                viewer = list(csv.DictReader(source))
            counts = Counter((r["clip"], r["first"] + r["second"], r["x"]) for r in operator)
            self.assertEqual(len(counts), 8)
            self.assertEqual(set(counts.values()), {2})
            self.assertEqual({r["trial"] for r in viewer}, {r["trial"] for r in operator})
            self.assertTrue(all(not row["choice"] and "correct" not in row for row in viewer))

    def test_latency_reports_drop_duplicates_and_reordering(self):
        camera = {"epoch": "camera", "fromNs": 0, "throughNs": 100_000_000,
                  "offsetNs": 0, "referenceNs": 0, "rate": 1, "worstErrorNs": 1000}
        calibration = {"exposure": camera, "receipt": {**camera, "epoch": "consumer"}}

        def event(identifier, milliseconds, epoch):
            return {"id": identifier, "timestampNs": milliseconds * 1_000_000, "clockEpoch": epoch}

        exposure = [event(1, 0, "camera"), event(2, 10, "camera"), event(3, 20, "camera")]
        receipts = [event(2, 15, "consumer"), event(1, 16, "consumer"), event(1, 18, "consumer")]
        report = summarize(exposure, receipts, calibration, 10_000_000)
        self.assertEqual([report[key] for key in ("missing", "duplicates", "outOfOrder", "definitelyLate")], [1] * 4)
        self.assertEqual((report["p50Ms"], report["p95Ms"]), (10.5, 16))
        with self.assertRaisesRegex(ValueError, "precedes exposure"):
            summarize(exposure, [event(2, 1, "consumer")], calibration, 10_000_000)


if __name__ == "__main__":
    unittest.main()
