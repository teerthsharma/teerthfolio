// CAST timeline for pr-mujoco-3450. Every time here is a pure function of the clock (scrubbing equals playing).
// The bible counts frames at 24 fps with the strike drawn at f94. TP (the punch) is resolved ONCE from the scene's beats by
// name (the direction layer's own cue); every other anchor is a bible frame OFFSET from TP, in seconds. If the beats are absent
// (stub scene) the bible's own absolute frames are used.
export const F = 24;
export const BIBLE_TP = 94;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };       // smoothstep
export const eo3 = (x) => 1 - Math.pow(1 - clamp01(x), 3);                        // ease-out cubic
export const win = (t, a, b) => clamp01((t - a) / Math.max(1e-6, b - a));         // 0..1 ramp across [a, b]
export const lerp = (a, b, k) => a + (b - a) * k;

// cue names that mean each anchor, in priority order (the first name that exists in scene.beats wins; earliest beat of that name)
export const CUE = {
  punch: ["punch", "strike", "serious-punch", "fist", "impact"],
  crouch: ["crouch", "windup", "wind-up"],
  born: ["hull", "born", "hull-born", "storm", "rays", "spray"],
};

export function resolve(ctx) {
  const beats = ctx.scene.beats ?? [];
  const earliest = (pred) => { let b = null; for (const x of beats) if (pred(x) && (!b || x.t < b.t)) b = x; return b; };
  const byName = (list) => { for (const n of list) { const b = earliest((x) => x.name === n); if (b) return b.t; } return null; };
  const TP = byName(CUE.punch) ?? BIBLE_TP / F;
  const at = (f) => TP + (f - BIBLE_TP) / F; // bible frame -> clock seconds
  const crouch = earliest((x) => x.name === "pose" && x.pose === "crouch")?.t ?? byName(CUE.crouch) ?? at(70);
  const born = byName(CUE.born) ?? at(41);
  return { TP, at, crouch, born, F };
}

// seal-local (x right, y up, z forward) <-> world, about the seal's INITIAL placement (victims stand in the world; they never follow the seal)
export function frameOf(scene) {
  const S = scene.seal ?? {}, at = S.at ?? [0, 0, 0], yaw = S.yaw ?? 0, sc = S.scale ?? 1, cy = Math.cos(yaw), sy = Math.sin(yaw);
  return {
    at, yaw, sc,
    toWorld: (x, y, z) => [at[0] + (x * cy + z * sy) * sc, at[1] + y * sc, at[2] + (-x * sy + z * cy) * sc],
    toLocal: (wx, wy, wz) => { const dx = (wx - at[0]) / sc, dz = (wz - at[2]) / sc; return [dx * cy - dz * sy, (wy - at[1]) / sc, dx * sy + dz * cy]; },
  };
}
