"""Replay UZH-FPV images and gyro. Ground truth is used only for scoring."""

import argparse
import io
import json
import time
from pathlib import Path
from zipfile import ZipFile

import cv2
import numpy as np
import yaml
from scipy.spatial.transform import Rotation, Slerp


def gyro_orientation(imu, camera_times, extrinsic):
    dt = np.diff(imu[:, 1])
    bias = np.median(imu[imu[:, 1] < imu[0, 1] + 2, 2:5], axis=0)
    increments = Rotation.from_rotvec(((imu[:-1, 2:5] + imu[1:, 2:5]) / 2 - bias) * dt[:, None])
    orientations = [Rotation.identity().as_quat()]
    current = Rotation.identity()
    for increment in increments:
        current = current * increment
        orientations.append(current.as_quat())
    valid = (camera_times >= imu[0, 1]) & (camera_times <= imu[-1, 1])
    rotation = Slerp(imu[:, 1], Rotation.from_quat(orientations))(
        np.clip(camera_times, imu[0, 1], imu[-1, 1]))
    return rotation * Rotation.from_matrix(extrinsic[:3, :3]).inv(), valid


def collapse_imu_duplicates(imu):
    if not np.isfinite(imu).all() or np.any(np.diff(imu[:, 1]) < 0):
        raise ValueError("IMU values must be finite and ordered")
    times, starts, counts = np.unique(imu[:, 1], return_index=True, return_counts=True)
    unique = imu[starts].copy()
    unique[:, 1] = times
    unique[:, 2:] = np.add.reduceat(imu[:, 2:], starts, axis=0) / counts[:, None]
    return unique


def features(archive, paths, camera):
    intrinsic = camera["intrinsics"]
    fx, fy, cx, cy = intrinsic
    matrix = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]])
    distortion = np.array(camera["distortion_coeffs"])
    orb = cv2.ORB_create(nfeatures=750, fastThreshold=12)
    result = []
    for name in paths:
        image = cv2.imdecode(np.frombuffer(archive.read(name), np.uint8), cv2.IMREAD_GRAYSCALE)
        keypoints, descriptors = orb.detectAndCompute(image, None)
        if descriptors is None:
            result.append((np.empty((0, 2)), None))
            continue
        pixels = np.array([p.pt for p in keypoints]).reshape(-1, 1, 2)
        result.append((cv2.fisheye.undistortPoints(pixels, matrix, distortion).reshape(-1, 2), descriptors))
    return result


def ratio_matches(matcher, query, database):
    if query is None or database is None or len(database) < 2:
        return []
    return [a for pair in matcher.knnMatch(query, database, k=2)
            if len(pair) == 2 for a, b in [pair] if a.distance < .75 * b.distance]


def relative_pose(first, second, minimum):
    essential, mask = cv2.findEssentialMat(first, second, np.eye(3), cv2.RANSAC, .999, .006)
    if essential is None or essential.shape != (3, 3):
        return None
    support, rotation, translation, mask = cv2.recoverPose(essential, first, second, np.eye(3), mask=mask)
    if support < minimum or support / len(first) < .38:
        return None
    return rotation, translation, mask.ravel() != 0, support


def local_landmarks(anchor, helper, matcher):
    points, anchor_descriptors = anchor
    helper_points, helper_descriptors = helper
    matches = ratio_matches(matcher, anchor_descriptors, helper_descriptors)
    if len(matches) < 18:
        return {}
    keys = np.array([match.queryIdx for match in matches])
    first = points[keys]
    second = helper_points[[match.trainIdx for match in matches]]
    pose = relative_pose(first, second, 18)
    if pose is None:
        return {}
    rotation, translation, mask, _ = pose
    first, second, keys = first[mask], second[mask], keys[mask]
    xyzw = cv2.triangulatePoints(np.eye(3, 4), np.c_[rotation, translation], first.T, second.T).T
    valid = np.abs(xyzw[:, 3]) > 1e-9
    xyz = xyzw[valid, :3] / xyzw[valid, 3, None]
    xyz_other = xyz @ rotation.T + translation.ravel()
    valid_depth = (xyz[:, 2] > .01) & (xyz[:, 2] < 50) & (xyz_other[:, 2] > .01)
    return dict(zip(keys[valid][valid_depth], xyz[valid_depth]))


def pnp_in_local_map(landmarks, points, matches, gyro, maximum_error):
    these = [match for match in matches if match.trainIdx in landmarks]
    if len(these) < 8:
        return None
    xyz = np.array([landmarks[match.trainIdx] for match in these])
    xy = points[[match.queryIdx for match in these]]
    success, rvec, _, inliers = cv2.solvePnPRansac(
        xyz, xy, np.eye(3), None, iterationsCount=200, reprojectionError=.008,
        confidence=.999, flags=cv2.SOLVEPNP_EPNP,
    )
    if not success or inliers is None or len(inliers) < 8:
        return None
    orientation = Rotation.from_rotvec(rvec.ravel())
    angle = np.degrees((gyro.inv() * orientation).magnitude())
    return (int(len(inliers)), orientation) if angle <= maximum_error else None


def evaluate(options):
    cv2.setNumThreads(1)
    cv2.setRNGSeed(425)
    with ZipFile(options.calibration) as calibration:
        name = next(name for name in calibration.namelist() if "/camchain-imucam-" in name)
        camera = yaml.safe_load(calibration.read(name))["cam0"]
    with ZipFile(options.sequence) as archive:
        image_rows = np.loadtxt(io.BytesIO(archive.read("images.txt")), dtype=str, skiprows=1)
        all_times = image_rows[:, 1].astype(float)
        original_imu = np.loadtxt(io.BytesIO(archive.read("imu.txt")))
        imu = collapse_imu_duplicates(original_imu)
        selected = image_rows[::options.stride]
        times = selected[:, 1].astype(float)
        attitudes, gyro_available = gyro_orientation(
            imu, times + camera["timeshift_cam_imu"], np.array(camera["T_cam_imu"]))
        descriptors = features(archive, selected[:, 2], camera)
        reference = np.loadtxt(io.BytesIO(archive.read("groundtruth.txt")))

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    results, pnp_candidates, recovered, elapsed = [], [], [], []
    pose_estimates = {}
    landmark_cache = {}
    for query in range(1, len(times)):
        tick = time.perf_counter_ns()
        points, descriptors_q = descriptors[query]
        if descriptors_q is None:
            continue
        candidates = []
        for index in range(query - 1):
            if times[query] - times[index] < options.minimum_gap:
                continue
            matches = ratio_matches(matcher, descriptors_q, descriptors[index][1])
            if len(matches) >= 12:
                candidates.append((len(matches), index, matches))
        for _, anchor, matches in sorted(candidates, reverse=True)[:3]:
            first = descriptors[anchor][0][[m.trainIdx for m in matches]]
            second = points[[m.queryIdx for m in matches]]
            pose = relative_pose(first, second, 12)
            if pose is None:
                continue
            visual, _, _, support = pose
            angular_error = None
            if gyro_available[query] and gyro_available[anchor]:
                gyro = attitudes[query].inv() * attitudes[anchor]
                angular_error = np.degrees((gyro.inv() * Rotation.from_matrix(visual)).magnitude())
                if options.local_pnp and angular_error <= options.gyro_gate_degrees:
                    pnp_candidates.append((query, anchor, matches, gyro, angular_error))
            results.append((query, anchor, support, angular_error))
        elapsed.append((time.perf_counter_ns() - tick) / 1e6)

    for query, anchor, matches, gyro, angular_error in pnp_candidates:
        helper = np.searchsorted(times, times[anchor] + .35)
        if helper >= query:
            continue
        if anchor not in landmark_cache:
            cv2.setRNGSeed(426 + anchor)
            landmark_cache[anchor] = local_landmarks(descriptors[anchor], descriptors[helper], matcher)
        cv2.setRNGSeed(427 + query + anchor)
        pose = pnp_in_local_map(
            landmark_cache[anchor], descriptors[query][0], matches, gyro, options.gyro_gate_degrees)
        if pose is not None:
            support, orientation = pose
            recovered.append((query, anchor, support, angular_error))
            pose_estimates[query, anchor] = orientation

    gated = [row for row in results if row[3] is not None and row[3] <= options.gyro_gate_degrees]
    position = np.column_stack([np.interp(times, reference[:, 0], axis) for axis in reference[:, 1:4].T])

    def score(edges):
        return score_edges(edges, times, reference[[0, -1], 0], position)

    report = {
        "imageRows": len(image_rows), "imuRows": len(original_imu), "imuDuplicates": len(original_imu) - len(imu),
        "videoSeconds": float(all_times[-1] - all_times[0]),
        "referenceSeconds": float(reference[-1, 0] - reference[0, 0]), "featureFrames": len(times),
        "minimumGapSeconds": options.minimum_gap, "gyroGateDegrees": options.gyro_gate_degrees,
        "visionEdgesWithoutGyro": sum(row[3] is None for row in results),
        "visionOnly": score(results), "visionPlusGyro": score(gated),
        "longestAcceptedGapSeconds": max((times[q] - times[a] for q, a, _, _ in gated), default=0),
        "longestVerifiedNearGapSeconds": longest_near_gap(gated, times, reference),
        "perQuerySearchMsP50P95": np.quantile(elapsed, [.5, .95]).tolist(),
    }
    if options.local_pnp:
        report["localPnP"] = score(recovered)
        report["localPnPLongestVerifiedNearGapSeconds"] = longest_near_gap(recovered, times, reference)
        report["localLandmarkMaps"] = sum(bool(points) for points in landmark_cache.values())
        report["localPnPNearRotationError"] = near_rotation_errors(
            pose_estimates, times, reference, np.array(camera["T_cam_imu"]))
    return report


def score_edges(records, times, window, positions):
    counts = {"acceptedEdges": len(records), "within4m": 0, "atLeast12m": 0,
              "ambiguous4to12m": 0, "outsideTruth": 0}
    for query, anchor, _, _ in records:
        if times[anchor] < window[0] or times[query] > window[1]:
            counts["outsideTruth"] += 1
            continue
        distance = np.linalg.norm(positions[query] - positions[anchor])
        if distance <= 4:
            counts["within4m"] += 1
        elif distance >= 12:
            counts["atLeast12m"] += 1
        else:
            counts["ambiguous4to12m"] += 1
    return counts


def longest_near_gap(edges, times, reference):
    time_first, time_last = reference[[0, -1], 0]
    xyz = np.column_stack([np.interp(times, reference[:, 0], axis) for axis in reference[:, 1:4].T])
    return max((
        times[query] - times[anchor] for query, anchor, _, _ in edges
        if time_first <= times[anchor] and times[query] <= time_last
        and np.linalg.norm(xyz[query] - xyz[anchor]) <= 4
    ), default=0)


def near_rotation_errors(estimates, times, reference, extrinsic):
    first, last = reference[[0, -1], 0]
    imu_world = Slerp(reference[:, 0], Rotation.from_quat(reference[:, 4:8]))(np.clip(times, first, last))
    imu_positions = np.column_stack([np.interp(times, reference[:, 0], axis) for axis in reference[:, 1:4].T])
    camera_to_imu = np.linalg.inv(extrinsic)
    camera_world = imu_world * Rotation.from_matrix(camera_to_imu[:3, :3])
    positions = imu_positions + imu_world.apply(camera_to_imu[:3, 3])
    errors = [
        np.degrees(((camera_world[query].inv() * camera_world[anchor]).inv() * estimate).magnitude())
        for (query, anchor), estimate in estimates.items()
        if first <= times[anchor] and times[query] <= last
        and np.linalg.norm(positions[query] - positions[anchor]) <= 4
    ]
    return {"edges": len(errors), "medianDegrees": float(np.median(errors)) if errors else None,
            "maxDegrees": max(errors, default=None)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("sequence", type=Path)
    parser.add_argument("calibration", type=Path)
    parser.add_argument("--stride", type=int, default=12)
    parser.add_argument("--minimum-gap", type=float, default=5)
    parser.add_argument("--gyro-gate-degrees", type=float, default=25)
    parser.add_argument("--local-pnp", action="store_true", help="Check PnP against a local two-view unit-baseline map.")
    args = parser.parse_args()
    if args.stride < 1 or args.minimum_gap <= 0 or not 0 < args.gyro_gate_degrees <= 180:
        parser.error("stride and minimum gap must be positive, and the gyro gate must be in (0, 180]")
    print(json.dumps(evaluate(args), indent=2))
