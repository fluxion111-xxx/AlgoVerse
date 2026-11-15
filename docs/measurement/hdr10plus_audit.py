"""Compare two complete HEVC renditions using FFprobe and hdr10plus_tool."""

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path


def media_json(probe, file):
    raw = subprocess.check_output([
        probe, "-v", "error", "-select_streams", "v:0", "-show_frames",
        "-show_entries", "frame=best_effort_timestamp_time:frame_side_data",
        "-of", "json", str(file),
    ])
    return dict(json.loads(raw, object_pairs_hook=list))["frames"]


def metadata(frames, label):
    return [
        [pairs for pairs in dict(frame).get("side_data_list", []) if label in dict(pairs).get("side_data_type", "")]
        for frame in frames
    ]


def times(frames):
    values = [float(dict(frame)["best_effort_timestamp_time"]) for frame in frames]
    if any(after <= before for before, after in zip(values, values[1:])):
        raise ValueError("duplicate or unordered frame timestamp")
    return [value - values[0] for value in values]


def scene_info(ffmpeg, tool, video, temporary):
    elementary = video
    if video.suffix.lower() != ".hevc":
        elementary = temporary.with_suffix(".hevc")
        subprocess.run([
            ffmpeg, "-nostdin", "-v", "error", "-i", str(video), "-map", "0:v:0", "-c", "copy",
            "-bsf:v", "hevc_mp4toannexb", "-f", "hevc", str(elementary),
        ], check=True)
    subprocess.run([tool, "extract", str(elementary), "-o", str(temporary)], stdout=subprocess.DEVNULL, check=True)
    return json.loads(temporary.read_bytes())["SceneInfo"]


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        while block := source.read(1024 * 1024):
            result.update(block)
    return result.hexdigest()


def compare(args):
    frames = [media_json(args.probe, path) for path in (args.source, args.output)]
    if not frames[0] or len(frames[0]) != len(frames[1]):
        raise ValueError(f"frame counts differ: {list(map(len, frames))}")
    offset = None
    if not args.raw_frame_order:
        offset = max(abs(a - b) for a, b in zip(*map(times, frames)))
        if offset > args.time_tolerance:
            raise ValueError(f"frame timestamp deviation is {offset:.6f}s")
    rows = {}
    for name, label in [
        ("dynamic", "2094-40"), ("mastering", "Mastering display metadata"), ("contentLight", "Content light level metadata"),
    ]:
        source, rendered = (metadata(sequence, label) for sequence in frames)
        rows[name] = {
            "source": sum(map(bool, source)), "output": sum(map(bool, rendered)),
            "equalPresent": sum(bool(a) and a == b for a, b in zip(source, rendered)),
        }
    with tempfile.TemporaryDirectory(dir=args.scratch) as directory:
        scratch = Path(directory)
        left, right = [
            scene_info(args.ffmpeg, args.tool, path, scratch / f"{index}.json")
            for index, path in enumerate((args.source, args.output))
        ]
    return {
        "frames": len(frames[0]), "maxOffsetSeconds": offset, "ffprobe": rows,
        "sceneInfoCounts": [len(left), len(right)], "sceneInfoEqual": left == right,
        "sourceSha256": digest(args.source),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--probe", default="ffprobe")
    parser.add_argument("--tool", default="hdr10plus_tool")
    parser.add_argument("--scratch", type=Path, default=Path.cwd())
    parser.add_argument("--time-tolerance", type=float, default=.002)
    parser.add_argument("--raw-frame-order", action="store_true", help="Match by display index for a raw untimestamped HEVC fixture.")
    print(json.dumps(compare(parser.parse_args()), indent=2))
