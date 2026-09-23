// Pure layout for the "units" sculpture (google-deepmind/mujoco #3396): where
// each cube of the coral block sits, in the order it should appear.
//
// Mirrors the landing figure's own fill order (fig.js, "units — mujoco-3396"):
// a near-cube footprint b-by-b, filled one horizontal layer at a time from
// the back corner outward, so any count up to b^3 has an exact, deterministic
// shape. At 1,282 that is b=11 (ten full layers of 121, 72 more on top).

export function unitsBlock(count, edge) {
  const b = Math.max(1, Math.ceil(Math.cbrt(count) - 1e-9));
  const nb = b * b;
  const cells = [];
  for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) cells.push([i, j]);
  cells.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[0] - q[0]); // back corner first

  const half = (b - 1) / 2;
  const positions = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    const [i, j] = cells[n % nb];
    positions[n * 3] = (i - half) * edge;
    positions[n * 3 + 1] = Math.floor(n / nb) * edge + edge / 2;
    positions[n * 3 + 2] = (j - half) * edge;
  }
  return { b, layers: Math.ceil(count / nb), positions };
}
