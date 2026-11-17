// FOREGROUND FRAMING. bgForeground(ctx, look, list) places dark near pieces at the edge of named shots, the way a painter frames a cut with a
// branch, a rafter, a pillar or rubble. Each entry: { shot: 3, kind: "leaves"|"branch"|"rubble"|"pillar"|"cables"|"ribs", side: "tl"|"tr"|"bl"|"br"|"l"|"r"|"t"|"b",
//   size: 0.55 (share of the frame height), dist: 1.4 (m from the lens), dark, mid, rim, glow, seed, flip }
// The piece is a baked card sitting in front of the lens of that shot (held shots; the plate bakes it once), visible only while that shot plays.
// Returns { group, update(t, dt, cue), dispose }: add it to the world layer and call update from the layer's update.
import { Group, Vector3 } from "three";
import { bgCard } from "./cards.js";

const ASPECT = { leaves: 1.0, branch: 2.0, rubble: 3.0, pillar: 0.22, cables: 3.0, ribs: 2.4 };

export function shotPose(ctx, n, aspect = 16 / 9) {
  const d = ctx.camera, sh = d.shots.find((s) => s.n === n) ?? d.shots[Math.min(n - 1, d.shots.length - 1)];
  const keep = { li: d.lastIndex, sh: d.shot };
  const o = d.at(sh.t0 + 1e-3, aspect);
  const pose = { eye: new Vector3(...o.eye), look: new Vector3(...o.look), fov: o.fov, dutch: o.dutch, i: sh.i, n: sh.n };
  d.lastIndex = keep.li; d.shot = keep.sh;
  return pose;
}

export function bgForeground(ctx, look, list, aspect = 16 / 9) {
  const group = new Group(), items = [];
  for (const e of list) {
    const pose = shotPose(ctx, e.shot, aspect);
    const fwd = pose.look.clone().sub(pose.eye).normalize(), right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0)).normalize(), up = new Vector3().crossVectors(right, fwd).normalize();
    const dist = e.dist ?? 1.4, vh = 2 * dist * Math.tan((pose.fov * Math.PI) / 360), vw = vh * aspect;
    const kind = e.kind ?? "leaves", ar = ASPECT[kind] ?? 1, h = vh * (e.size ?? 0.55), w = h * ar;
    const side = e.side ?? "tl", sx = side.includes("l") ? -1 : side.includes("r") ? 1 : 0, sy = side.includes("t") ? 1 : side.includes("b") ? -1 : 0;
    const cx = sx * (vw / 2 - w / 2 * (kind === "pillar" ? 0.4 : 0.85)), cy = sy * (vh / 2 - h / 2 * 0.85);
    const card = bgCard(ctx, kind, { ...e, w: kind === "pillar" ? 256 : 1024, h: Math.round((kind === "pillar" ? 256 : 1024) / ar), size: [w, h], billboard: true, seed: e.seed ?? 3 + items.length, at: [0, 0, 0] });
    card.position.copy(pose.eye).addScaledVector(fwd, dist).addScaledVector(right, cx).addScaledVector(up, cy);
    if (e.flip) card.scale.x = -1;
    card.visible = false; group.add(card); items.push({ card, n: e.shot, i: pose.i });
  }
  return {
    group,
    update(t, dt, cue) { for (const it of items) it.card.visible = cue.shot?.i === it.i || cue.shotN === it.n; },
    dispose() { for (const it of items) it.card.userData.dispose?.(); },
  };
}
