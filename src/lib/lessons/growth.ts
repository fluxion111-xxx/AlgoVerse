export function countWork(n: number) {
  let steps = 0;
  for (let i = 0; i < 7; i++) steps++;
  for (let pass = 0; pass < 2; pass++) {
    for (let item = 0; item < n; item++) steps++;
  }
  return steps;
}

export function growthAt(n: number) {
  return { linear: 2 * n + 7, quadratic: n * n, nLogN: Math.ceil(n * Math.log2(n)) };
}

export function verifyLinearUpperBound(multiplier: number, start: number) {
  const earliest = multiplier > 2 ? Math.ceil(7 / (multiplier - 2)) : null;
  return { earliest, valid: earliest !== null && start >= earliest, cost: growthAt(start).linear, upper: multiplier * start };
}
