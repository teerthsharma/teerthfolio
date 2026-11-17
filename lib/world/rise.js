// The Fountain's ice rise (PLAN-FINAL section 4): a flat crown 6 m out, 2.4 m high, smoothstep down to the plain at 13 m.
import { S } from "./scale.js";

export const RISE = { x: S(31.5, 58)[0], z: S(31.5, 58)[1], top: 2.4, flat: 6, edge: 13 };

export function riseHeight(x, z) {
  const d = Math.hypot(x - RISE.x, z - RISE.z);
  if (d >= RISE.edge) return 0;
  if (d <= RISE.flat) return RISE.top;
  const t = (d - RISE.flat) / (RISE.edge - RISE.flat);
  return RISE.top * (1 - t * t * (3 - 2 * t));
}
