// CAST for pr-anyps5-12609: the Vice seal (ctx.seal), the partner and the police guest as full heroes, the four vehicles, pinned per drawing to the painted band.
import { Group, Vector3 } from "three";
import { castHero } from "../../framework/seal.js";
import { groundShadow } from "../../../pup.js";
import { depthFor, pin, shotAt } from "../cams.js";
import { layout } from "../layout.js";
import { partner as partnerLook, guest as guestLook } from "./looks.js";
import { convertible, cruiser, jetSki, lightBar, runabout } from "./vehicles.js";

const Y = new Vector3(0, 1, 0);
const SC = { ski: 1, boat: 0.78, cruiser: 0.78, car: 0.85 }; // vehicles are smaller than the plate towers so the skyline reads
// [t, pose, expr] steps: each holds until the next starts (poses and faces blend through the 0.1 s envelopes)
const seq = (steps, end = 12) => steps.flatMap(([t, pose, expr], i) => { const h = (steps[i + 1]?.[0] ?? end) - t; return [{ t, pose, dur: 0.1, hold: h, out: 0.1 }, { t, expr, dur: 0.1, hold: h, out: 0.1 }]; });
const PARTNER = [...seq([[0, "idle", "grin"], [3.5, "sit", "grin"], [5.5, "sit", "smug"], [10.5, "sit", "grin"]]), { t: 0, set: { head: { rz: 0.18 } }, dur: 0.1, hold: 0.9 }];
const GUEST = seq([[2.0, "sit", "calm"], [3.5, "sit", "rage"], [7.0, "idle", "rage"], [8.1667, "cower", "terror"], [9.3333, "kneel", "sad"]]);

export default function build(ctx) {
  const { engine } = ctx, group = new Group();
  ctx.scene.seal.hero.extras?.(engine, ctx.seal.hero);
  const hero = ctx.seal;
  const partner = castHero(engine, partnerLook, { at: [0, 0, 0], scale: 0.95, track: PARTNER });
  const guest = castHero(engine, guestLook, { at: [0, 0, 0], scale: 1, track: GUEST });
  const V = { ski: jetSki(engine), boat: runabout(engine), cruiser: cruiser(engine), car: convertible(engine) };
  const bars = lightBar(engine);
  for (const o of [partner.group, guest.group, ...Object.values(V), bars.red, bars.blue]) { o.userData.layer = 1; group.add(o); }
  const lay = (o) => o.traverse((c) => { c.layers.set(1); });
  Object.values(V).forEach(lay); lay(bars.red); lay(bars.blue);
  for (const l of [bars.red, bars.blue]) l.scale.setScalar(1.45);
  const shadows = {};
  for (const [k, r] of [["ski", 1.1], ["boat", 1.3], ["cruiser", 1.2], ["car", 1.7]]) { const s = groundShadow(r, r * 0.55, "#0b0a10", 0.45); s.userData.layer = 1; s.layers.set(1); s.visible = false; shadows[k] = s; group.add(s); }

  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const seatAt = (base, yaw, x, y, z, out) => out.set(x, y, z).applyAxisAngle(Y, yaw).add(base);
  const emit = (fig, k) => fig.userData.mat.uniforms.uEmit.value.setRGB(k * 1.0, k * 0.5, k * 0.5);

  return {
    group,
    update(ts) {
      const t = ts, L = layout(t), s = shotAt(t), A = ctx.aspect(), az = Math.atan2(s.eye[0], s.eye[2]);
      const at = (o) => pin(s, t, A, o.u, o.v, depthFor(s, t, A, 0.85, o.hh), new Vector3());
      const alt = Math.floor(t * 12 + 0.02) % 2;
      for (const k of Object.keys(V)) { V[k].visible = false; shadows[k].visible = false; }
      partner.group.visible = guest.group.visible = bars.red.visible = bars.blue.visible = false;
      ctx.seal.hero.vice.up.visible = !(t >= 3.5 && t < 5.5); ctx.seal.hero.vice.down.visible = t >= 3.5 && t < 5.5;
      let hp = null, hy = az, sitting = false;
      const veh = (k, o, yawBias) => {
        const base = at(o), yaw = az + yawBias, sc = k === "cruiser" && t < 5.5 ? 1 : SC[k];
        V[k].visible = true; V[k].position.copy(base); V[k].rotation.set(0, yaw, 0); V[k].scale.setScalar(sc);
        shadows[k].visible = true; shadows[k].position.copy(base); shadows[k].position.y -= 0.02; shadows[k].rotation.y = yaw; shadows[k].scale.setScalar(sc);
        return { base, yaw, sc };
      };
      const seat = (v, x, y, z, out) => seatAt(v.base, v.yaw, x * v.sc, y * v.sc, z * v.sc, out);
      const put = (h, seatPos, yaw) => { h.at = [seatPos.x, seatPos.y, seatPos.z]; h.yaw = yaw; h.group.visible = true; };

      if (L.shot === 1) {
        hp = at(L.hero); hy = az - 0.1;
        put(partner, at(L.partner), az + 0.25);
      } else if (L.shot === 2) {
        hp = at(L.hero); hy = az + 0.55;
      } else if (L.shot === 3) {
        hp = at(L.hero); hy = az - 0.15;
        const v = veh("cruiser", L.cruiser, 0.15);
        put(guest, seat(v, 0.15, 0.5, 0.15, a), v.yaw + 0.2);
        const l1 = seat(v, -0.55, 1.52, 0.1, b), l2 = seat(v, -0.05, 1.52, 0.1, c);
        bars.red.visible = bars.blue.visible = true; bars.red.position.copy(l1); bars.blue.position.copy(l2); bars.red.rotation.y = bars.blue.rotation.y = v.yaw;
      } else if (L.shot === 4) {
        const v = veh("ski", L.ski, 0.1);
        hp = seat(v, -0.1, 0.4, 0.02, a).clone(); hy = az + 0.9; sitting = true;
        put(partner, seat(v, -0.62, 0.42, 0.02, b), az + 0.7);
        const w = veh("cruiser", L.cruiser, 0.15);
        put(guest, seat(w, 0.15, 0.5, 0.15, c), w.yaw + 0.2);
        bars.red.visible = bars.blue.visible = true;
        bars.red.position.copy(seat(w, -0.55, 1.52, 0.1, new Vector3())); bars.blue.position.copy(seat(w, -0.05, 1.52, 0.1, new Vector3()));
        bars.red.rotation.y = bars.blue.rotation.y = w.yaw;
      } else if (L.shot <= 7) {
        const v = veh("boat", L.boat, 0.25);
        hp = seat(v, 0.12, 0.38, 0.1, a).clone(); hy = az + 0.7; sitting = true;
        put(partner, seat(v, -0.62, 0.38, -0.05, b), az - 0.1);
        if (L.cruiser.u < 1.1) {
          const w = veh("cruiser", L.cruiser, 0.1);
          const onRoof = t >= 7.8333;
          put(guest, seat(w, onRoof ? -0.2 : 0.15, onRoof ? 1.42 : 0.5, onRoof ? 0 : 0.15, c), az + 0.1);
          bars.red.visible = bars.blue.visible = t < 10.5;
          bars.red.position.copy(seat(w, 0.5, 1.5, 0.4, new Vector3())); bars.blue.position.copy(seat(w, 0.5, 1.5, -0.4, new Vector3()));
          bars.red.rotation.y = bars.blue.rotation.y = w.yaw;
        }
      } else {
        const v = veh("car", L.car, 0.12);
        hp = seat(v, 0.45, 0.6, 0.12, a).clone(); hy = az + 0.3; sitting = true;
        put(partner, seat(v, -0.55, 0.6, 0.1, b), az + 0.1);
      }
      const gd = hero.group.userData; gd.ski = L.ski ? seatAt(V.ski.position, V.ski.rotation.y, -1.0, 0.3, 0, new Vector3()) : null; gd.floor = hp ? new Vector3(hp.x, hp.y - 0.0, hp.z) : null;
      bars.red.scale.setScalar(t < 5.5 ? 1.8 : 0.85); guest.scale = L.shot >= 5 ? 1.3 : 1; bars.blue.scale.copy(bars.red.scale);
      emit(bars.red, alt === 0 ? (ctx.atTier(2) ? 1.2 : 0.6) : 0); emit(bars.blue, alt === 1 ? (ctx.atTier(2) ? 1.2 : 0.6) : 0);
      if (partner.group.visible) partner.update(ts);
      if (guest.group.visible) guest.update(ts);
      hero.group.position.copy(hp); hero.group.rotation.y = hy;
      if (hero.shadow) hero.shadow.visible = hero.shadow.visible && !sitting;
      for (const h of [partner, guest]) if (h.shadow) h.shadow.visible = h.shadow.visible && !(L.shot >= 3);
    },
    dispose() { partner.dispose(); guest.dispose(); },
  };
}
