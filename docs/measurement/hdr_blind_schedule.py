"""Prepare masked ABX runs. Output contains no observations or calibration results."""

import argparse
import csv
import random
from pathlib import Path


def prepare(directory, clips, participants, seed):
    rng = random.Random(seed)
    public, operator = [], []
    assignments = {}
    for clip in clips:
        assignments[clip] = [(order, answer) for order in ("AB", "BA") for answer in (0, 1)] * (participants // 4)
        rng.shuffle(assignments[clip])

    for number in range(participants):
        subject = f"P{number + 1:03d}"
        sequence = list(clips)
        rng.shuffle(sequence)
        for position, clip in enumerate(sequence, start=1):
            order, correct = assignments[clip][number]
            first, second = order
            trial = f"{subject}-{position:02d}"
            public.append((subject, trial, "", ""))
            operator.append((trial, clip, first, second, order[correct], correct + 1))

    directory.mkdir()
    for name, headers, rows in (
        ("viewer.csv", ("participant", "trial", "choice", "incident"), public),
        ("operator-only.csv", ("trial", "clip", "first", "second", "x", "correct"), operator),
    ):
        with (directory / name).open("x", encoding="utf-8", newline="") as output:
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--clips", nargs="+", required=True)
    parser.add_argument("--participants", type=int, required=True)
    parser.add_argument("--seed", type=int, required=True)
    args = parser.parse_args()
    if args.participants < 4 or args.participants % 4 or len(set(args.clips)) != len(args.clips):
        parser.error("use distinct clip IDs and a positive participant count divisible by four")
    prepare(args.directory, args.clips, args.participants, args.seed)
