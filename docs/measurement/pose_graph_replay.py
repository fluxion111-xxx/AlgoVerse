"""Compare chain odometry and closure optimization on measured SE(2) graphs."""

import argparse
import json
import time
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares
from scipy.sparse import csr_matrix


def read_edges(path):
    edges = []
    with path.open() as source:
        for line in source:
            fields = line.split()
            if not fields or fields[0] != "EDGE_SE2":
                continue
            i, j = map(int, fields[1:3])
            dx, dy, heading, a, b, c, d, e, f = map(float, fields[3:])
            information = np.array([[a, b, c], [b, d, e], [c, e, f]])
            edges.append((i, j, (dx, dy, heading), np.linalg.cholesky(information).T))
    return edges


def wrap(angle):
    return np.arctan2(np.sin(angle), np.cos(angle))


def rotation(angle):
    c, s = np.cos(angle), np.sin(angle)
    return np.array([[c, s], [-s, c]])


def chain(edges, count):
    poses = np.zeros((count, 3))
    forward = [(i, observed) for i, j, observed, _ in edges if j == i + 1]
    consecutive = dict(forward)
    if len(forward) != count - 1 or set(consecutive) != set(range(count - 1)):
        raise ValueError("expected one forward odometry edge per step")
    for i in range(count - 1):
        dx, dy, heading = consecutive[i]
        poses[i + 1, :2] = poses[i, :2] + rotation(poses[i, 2]).T @ [dx, dy]
        poses[i + 1, 2] = poses[i, 2] + heading
    return poses


def solve(edges, start, loss):
    i, j = np.array([(i, j) for i, j, _, _ in edges]).T
    measurements = np.array([relative for _, _, relative, _ in edges])
    whiten = np.array([matrix for _, _, _, matrix in edges])
    rows = np.broadcast_to(np.arange(len(edges) * 3).reshape(-1, 3, 1), (len(edges), 3, 6))
    variables = np.c_[i[:, None] * 3 + np.arange(3), j[:, None] * 3 + np.arange(3)] - 3
    columns = np.broadcast_to(variables[:, None, :], rows.shape)
    free = columns >= 0
    shape = (len(edges) * 3, (len(start) - 1) * 3)

    def local(vector):
        poses = np.vstack((start[0], vector.reshape(-1, 3)))
        relative = poses[j] - poses[i]
        c, s = np.cos(poses[i, 2]), np.sin(poses[i, 2])
        x = c * relative[:, 0] + s * relative[:, 1]
        y = -s * relative[:, 0] + c * relative[:, 1]
        return relative, x, y, c, s

    def residual(vector):
        relative, x, y, _, _ = local(vector)
        errors = np.c_[x, y, relative[:, 2]] - measurements
        errors[:, 2] = wrap(errors[:, 2])
        return (whiten @ errors[..., None]).ravel()

    def jacobian(vector):
        _, x, y, c, s = local(vector)
        gradient = np.zeros(rows.shape)
        gradient[:, 0, 0], gradient[:, 0, 1], gradient[:, 0, 2] = -c, -s, y
        gradient[:, 1, 0], gradient[:, 1, 1], gradient[:, 1, 2] = s, -c, -x
        gradient[:, 2, 2] = -1
        gradient[:, :, 3:5] = -gradient[:, :, :2]
        gradient[:, 2, 5] = 1
        return csr_matrix(((whiten @ gradient)[free], (rows[free], columns[free])), shape=shape)

    vector = start[1:].ravel()
    if len(edges) < 20:
        for index in range(len(vector)):
            step = np.zeros_like(vector)
            step[index] = 1e-6
            derivative = (residual(vector + step) - residual(vector - step)) / (2e-6)
            np.testing.assert_allclose(derivative, jacobian(vector)[:, index].toarray().ravel(), atol=1e-6)
    initial_residual = residual(vector)
    if loss == "linear":
        initial = float(np.dot(initial_residual, initial_residual) / 2)
    else:
        initial = float(np.sum(np.hypot(1, initial_residual) - 1))
    t0 = time.perf_counter()
    result = least_squares(
        residual, vector, jac=jacobian, method="trf", tr_solver="lsmr", x_scale="jac", loss=loss,
        ftol=1e-6, xtol=1e-7, gtol=1e-6, max_nfev=180,
        tr_options={"maxiter": 250, "atol": 1e-6, "btol": 1e-6},
    )
    return np.vstack((start[0], result.x.reshape(-1, 3))), {
        "initialCost": initial,
        "finalCost": result.cost,
        "status": result.status,
        "evaluations": result.nfev,
        "optimality": result.optimality,
        "seconds": time.perf_counter() - t0,
    }


def evaluate(source, truth=None, oracle=None, loss="linear"):
    edges = read_edges(source)
    if oracle:
        pairs = {tuple(sorted(map(int, line.split()))) for line in oracle.read_text().splitlines() if line.strip()}
        edges = [edge for edge in edges if abs(edge[0] - edge[1]) == 1 or tuple(sorted(edge[:2])) in pairs]
    count = 1 + max(max(i, j) for i, j, _, _ in edges)
    initial = chain(edges, count)
    fitted, report = solve(edges, initial, loss)
    loops = [abs(i - j) for i, j, _, _ in edges if abs(i - j) > 1]
    report |= {
        "loss": loss,
        "oracle": bool(oracle),
        "nodes": count,
        "loops": len(loops),
        "longestLoopIndexGap": max(loops, default=0),
        "odometryLengthM": np.linalg.norm(np.diff(initial[:, :2], axis=0), axis=1).sum(),
    }
    if truth:
        reference = chain(read_edges(truth), count)
        report["referenceLengthM"] = np.linalg.norm(np.diff(reference[:, :2], axis=0), axis=1).sum()
        report["firstPoseAlignedRmseM"] = [
            np.sqrt(np.mean(np.sum((p[:, :2] - reference[:, :2]) ** 2, axis=1)))
            for p in (initial, fitted)
        ]
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("truth", type=Path, nargs="?")
    parser.add_argument("--oracle", type=Path, help="Only use ground-truth-labelled closures for a controlled comparison.")
    parser.add_argument("--loss", choices=("linear", "soft_l1"), default="linear")
    args = parser.parse_args()
    evaluate(args.source, args.truth, args.oracle, args.loss)
