// The per-frame bodies of the live move as pure functions of the scene clock tt (scene seconds, unwarp of real).
import { Vector3 } from "three";
import { U, sm } from "./look.js";
import { CURB_H } from "./roof.js";
import { T, gaugesAt, tollPulse } from "./timeline.js";
import { TOWER } from "./tower.js";

const BLOOM_END = 1.6;
const TIP = new Vector3();
const W = new Vector3();
const A0 = new Vector3();
const V = new Vector3();
const MOUTH0 = new Vector3(1.55, CURB_H + 2.0, -2.5 + 0.78);

let cullOn = true;
const SCENE_GROUPS = (m) => [m.roof.group, m.city.group, m.tower.group, m.realm.group];

export function tickWorld(m, tt, cam, brk, { origin }) {
  const flood = sm(T.screens, T.screens + 0.7, tt);
  U.uOrigin.value.copy(origin);
  U.uTime.value = tt;
  U.uBreak.value = brk > 0 ? brk : -1;
  const on = !(brk > 0);
  if (on !== cullOn) {
    cullOn = on;
    for (const g of SCENE_GROUPS(m)) g.traverse((o) => { if (o.userData.cull) o.frustumCulled = on; });
  }
  m.grains.mesh.visible = tt >= T.grains - 0.6;
  m.splashes.mesh.visible = tt >= T.rain - 0.1;
  U.uKeyOn.value = 1 - 0.42 * flood;
  U.uScreenGlow.value = 1 + 3.2 * flood;
  U.uDoorK.value = 1 - 0.5 * flood;
  U.uCrack.value = sm(T.crack[0], T.crack[1], tt) * 170;
  U.uToll.value = tollPulse(tt);
  const rainOn = sm(T.rain, T.rain + 0.9, tt);
  m.rain.set(rainOn);
  m.motes.tick(tt);
  m.splashes.tick(tt, rainOn, U.uKeyOn.value);
  m.grains.tick(tt);
  m.roof.tick(tt, gaugesAt(tt));
  m.tower.place(cam.aspect < 1 ? -4.8 : TOWER.x);
  m.tower.tick(tt);
  m.realm.tick(tt);
  m.city.tick(tt, sm(T.screens, T.screens + 0.3, tt), tollPulse(tt));
}

export function tickFigures(f, tt, tip, cuff, cam) {
  f.L.tick(tt);
  f.colony.tick(tt);
  const broken = tt > T.crunch;
  TIP.copy(tip).add(W.set(0.04, 0.09, 0));
  let bite = 0;
  for (const b of [T.take + 0.85, T.take + 1.6, T.take + 2.4]) if (tt > b) bite = Math.max(bite, Math.exp(-(tt - b) * 10));
  f.ryuk.tick(tt, TIP, bite);
  f.chain.tick(tt, cuff, f.L.wrist, cam, Math.sin(tt * 2.2) * 0.4);

  const ap = f.apples;
  const held = sm(T.reach[0], T.reach[0] + 0.35, tt);
  if (tt < T.reach[0] || tt > T.core + 4) ap.hide(0);
  else if (tt < T.take) {
    ap.set(0, TIP.x, TIP.y, TIP.z, (0.4 + 0.6 * held) * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, (tt - T.reach[0]) / 0.4))));
  } else if (tt < T.take + 0.85) {
    const k = (tt - T.take - 0.2) / 0.65;
    A0.copy(f.ryuk.hand);
    if (k > 0) A0.lerp(f.ryuk.mouth, Math.min(1, k));
    ap.set(0, A0.x, A0.y, A0.z, 1, 0.2, 0.4);
  } else if (tt < T.core + 0.25) {
    const sz = tt < T.take + 1.6 ? 0.92 : tt < T.take + 2.4 ? 0.8 : 0.66;
    ap.set(0, f.ryuk.mouth.x - 0.04, f.ryuk.mouth.y - 0.1, f.ryuk.mouth.z + 0.05, sz, 0.2, 0.4);
  } else {
    const d = tt - T.core - 0.25;
    ap.set(0, MOUTH0.x - 0.8 * d, MOUTH0.y + 3.2 * d - 4.9 * d * d, MOUTH0.z - 4.6 * d, 0.5, d * 6, d * 4);
  }
  for (let i = 0; i < 8; i++) {
    if (tt < BLOOM_END || broken) ap.hide(1 + i);
    else {
      f.colony.appleAt(i, tt, V);
      ap.set(1 + i, V.x, V.y, V.z, 0.26);
    }
  }
  ap.flush();
}
