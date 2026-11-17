// CAST for pr-polychrom-79: the King and the pale pup swap at the turn and at the return. The crown grows on the pale pup from 0.55 s, the King shakes in the build-ups and holds the Key,
// and at BACK the King shrinks frame by frame to the pup's size before the pup pops in. Ea (cast/ea.js) is held in camera space and is wired here.
import { Group, Mesh, Vector3 } from "three";
import { sitePup } from "./pup.js";
import { buildCrown } from "./crown.js";
import { buildEa } from "./ea.js";
import { BACK, F, PUP, RET, SEAL, T, TURN } from "../clock.js";
import { lin, PAL } from "../pal.js";
import { goldMaterial, keyGeometry } from "../live/set.js";

const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const disposeTree = (o) => o.traverse((x) => { x.geometry?.dispose?.(); x.material?.dispose?.(); });
const KEY_OFF = new Vector3(0, 0, 0.04), END = 0.62; // END: King scale at frame RET.pop-1, matched to the pup box at 21.5 s
const KEY_ON = [T.key[0], T.keyAway[1]];
const GROW_ON = TURN + F(1), GROW_T = [T.grow[0], T.grow[1]];
const KICK = [[7.0, 8.1], [14.5, 16.4]];
const POP = [1.14, 1.14, 0.96, 0.96];
const crownK = (t) => {
  const u = (t - GROW_T[0]) / (GROW_T[1] - GROW_T[0]);
  return u <= 0 ? 0 : u >= 1 ? 1 : Math.min(1.08, 1.08 * Math.sin(u * Math.PI * 0.5 * 1.25));
};
// a 5 cm sideways step per 12 grid frame in the build-ups, alternating, ramping in; zero in the hold
const kickAt = (t) => {
  const row = KICK.find(([a, b]) => t >= a && t < b);
  if (!row) return 0;
  const sign = Math.floor(t * 12 + 1e-6) % 2 ? 1 : -1, ramp = 0.5 + 0.5 * clamp01((t - row[0]) / (row[1] - row[0]));
  return 0.05 * sign * ramp;
};

export default function build(ctx) {
  const { seal } = ctx, sh = ctx.engine.shared, group = new Group(), tmp = new Vector3();
  const stand = ctx.scene?.stand ?? [
    { t: 0, p: PUP.home, yaw: SEAL.yaw },
    { t: BACK, p: PUP.back, yaw: SEAL.yaw },
    { t: T.edge, p: PUP.edge, yaw: SEAL.yaw + Math.PI },
    { t: T.home, p: PUP.home, yaw: SEAL.yaw },
  ];
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], blink: [24.6], hop: T.hop }, stand });
  const standS = (t) => { let s = 1; for (const e of stand) if (e.t <= t) s = e.s ?? 1; return s; };
  group.add(pup.group);
  const crown = buildCrown();
  pup.head.add(crown.group);

  const key = new Mesh(keyGeometry(), goldMaterial());
  key.scale.setScalar(1.3); key.visible = false; group.add(key);
  const ea = buildEa(ctx);
  group.add(ea.group);

  const sync = () => {
    tmp.copy(seal.named().handR);
    group.updateWorldMatrix(true, false);
    group.worldToLocal(tmp);
  };
  let kicked = 0;

  return {
    group,
    update(t) {
      const frame = t >= BACK ? Math.floor((t - BACK) * 24 + 1e-6) : -1;
      const inStage = t >= GROW_ON && t < BACK, kingBack = frame >= 0 && frame < RET.pop;
      seal.group.visible = inStage || kingBack;
      pup.group.visible = t < GROW_ON || frame >= RET.pop;
      pup.update(t);
      crown.set(t >= GROW_T[0] && t < GROW_ON ? crownK(t) : 0);
      if (inStage) {
        const into = Math.floor((t - TURN) * 12 + 1e-6);
        squash(seal.group, [0.5, 1.16, 0.97][into] ?? 1, SEAL.scale);
      } else if (kingBack) {
        const ks = frame < RET.plate ? 0 : Math.min(1, (frame - RET.plate + 1) / RET.shrink);
        squash(seal.group, 1, SEAL.scale * (1 - (1 - END) * ks));
      }
      if (frame >= RET.pop) squash(pup.group, frame - RET.pop < POP.length ? POP[frame - RET.pop] : 1, standS(t));
      else squash(pup.group, 1, standS(t));
      if (sh.uRimCol) sh.uRimCol.value.setRGB(...lin(PAL.rim));
      if (sh.uRimDir) sh.uRimDir.value.set(0, 0.3, -1);

      const k = kickAt(t);
      seal.group.position.x += k - kicked;
      kicked = k;

      sync();
      key.visible = t >= KEY_ON[0] && t < KEY_ON[1];
      key.position.copy(tmp).add(KEY_OFF);
      key.rotation.y = t * 2.6;
      ea.update(t, ctx.player.camera);
    },
    dispose() {
      pup.dispose(); crown.dispose(); ea.dispose();
      disposeTree(key); key.removeFromParent();
      seal.group.visible = true;
    },
  };
}
