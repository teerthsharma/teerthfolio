// RYUK-SEAL (the control): ~0.9 m costumed seal crouched on the parapet at (1.55, 0.55, -2.35), facing the hero.
// Parts: spiked hair (kit clumps), slit eyes on yellow sclera over black sockets, 14 triangular teeth, silver earring,
// ragged wings 2.2 m span (7 feather cards a side, #3a3544 lit / #0a0a0c shade), belt with chain and a black notebook, claw arm (palm up) with ring and wrist band.
// Beats: take 3.25 (claw closes, grin widens); 3.7 to 5.4 watches; write 5.4 (slow strokes); each toll the claw stalls and wings flare 20 deg
// (20 e^-5 s); flare 9.95 grin flattens; flick 10.4 the claw flicks the core.
import { CircleGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, BoxGeometry } from "three";
import { ryukSpec } from "./costumes.js";
import { T, TL, sm, lerp, win, decay, sinceToll, figProp, pivoted, mesh } from "./util.js";

export const RYUK_AT = [1.55, 0.55, -2.35];
const D2 = Math.PI / 180;
const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
const CLAW = [0.3, 0.3, 0.56]; // palm centre, pup-local

export function buildRyuk(ctx) {
  const { kit } = ctx;
  const h = kit.costumedSeal(ctx.engine, ryukSpec(kit));
  h.place(...RYUK_AT, 0).lookAtPoint(ctx.seal.at[0], ctx.seal.at[2]);
  const body = h.body;

  // black eye sockets: dark discs on the head under the decals (decal lift 0.004, socket 0.002)
  for (const s of [1, -1]) {
    const f = kit.faceOnHead(HEAD, s * 0.122, 0.572, 0.002);
    const m = mesh(new CircleGeometry(0.085, 20), "#050506"); m.scale.set(1, 1.15, 1);
    m.position.copy(f.p); m.lookAt(f.p.clone().add(f.n)); body.add(m);
  }
  // grin: 14 triangular teeth on a crescent, apex down, #f2f2ee; a dark gum bar behind them
  const grin = new Group(); grin.position.set(0, 0.452, 0.255);
  for (let i = 0; i < 14; i++) {
    const u = i / 13 * 2 - 1; // -1..1 across the mouth
    const tooth = figProp(ctx, new ConeGeometry(0.0125, 0.045 * (1 - 0.35 * Math.abs(u)), 3).rotateX(Math.PI), "#f2f2ee", "#c9c9c4", { pos: [u * 0.115, 0.018 * u * u - 0.01, -0.05 * u * u], lineMul: 0.4 });
    tooth.rotation.z = -u * 0.2; grin.add(tooth);
  }
  const gum = mesh(new BoxGeometry(0.24, 0.012, 0.01), "#050506"); gum.position.set(0, 0.014, -0.01); grin.add(gum);
  body.add(grin);
  // belly patch #3a3a42
  body.add(figProp(ctx, new SphereGeometry(0.13, 14, 10), "#3a3a42", "#26262c", { pos: [0, 0.2, 0.275], scl: [1, 1.3, 0.3], lineMul: 0.5 }));
  // silver earring #c9cdd1
  body.add(figProp(ctx, new TorusGeometry(0.03, 0.007, 6, 14), "#c9cdd1", "#565c64", { pos: [0.265, 0.5, 0.0], rot: [0, 1.4, 0], lineMul: 0.4 }));
  // belt chain (6 silver links) and the black notebook hanging at the hip
  const chain = new Group();
  for (let i = 0; i < 6; i++) chain.add(figProp(ctx, new TorusGeometry(0.018, 0.005, 5, 10), "#c9cdd1", "#565c64", { pos: [-0.3 + i * 0.012, 0.16 - i * 0.026, 0.22 - i * 0.03], rot: [i % 2 ? 1.57 : 0, 0.4, 0], lineMul: 0.3 }));
  body.add(chain);
  const book = new Group();
  book.add(figProp(ctx, new BoxGeometry(0.16, 0.2, 0.03), "#15151a", "#0a0a0c", { lineMul: 0.7 }), figProp(ctx, new BoxGeometry(0.13, 0.17, 0.034), "#f4efe3", "#c9c5b8", { pos: [0.008, 0, 0], lineMul: 0.4 }));
  body.add(book);

  // wings: 7 ragged feather cards a side, fanned from the shoulder, lengths 0.55 to 1.0, each a flat tapered cone
  const wings = [];
  for (const s of [1, -1]) {
    const w = new Group();
    for (let i = 0; i < 7; i++) {
      const len = 0.55 + 0.45 * Math.sin((i / 6) * Math.PI * 0.9 + 0.3) + (i % 2 ? -0.07 : 0.05); // ragged: alternate lengths
      const f = figProp(ctx, new ConeGeometry(0.06, len, 3).translate(0, len / 2, 0), "#3a3544", "#0a0a0c", { lineMul: 0.7 });
      f.scale.z = 0.14;
      const a = 0.35 + i * 0.2; // fan angle from vertical, outward
      f.rotation.set(-0.5 - i * 0.06, 0, -s * a);
      w.add(f);
    }
    const pv = pivoted(w, [0, 0, 0]); pv.position.set(s * 0.2, 0.42, -0.2);
    body.add(pv); wings.push({ pv, s });
  }

  // claw arm: palm up, forward. 3 claw fingers close on `take`
  const arm = new Group(); arm.position.set(...CLAW);
  arm.add(figProp(ctx, new CylinderGeometry(0.035, 0.045, 0.34, 8).rotateX(Math.PI / 2), "#1b1a20", "#0a0a0c", { pos: [-0.0, 0, -0.17], lineMul: 0.8 }));
  arm.add(figProp(ctx, new SphereGeometry(0.06, 10, 8), "#1b1a20", "#0a0a0c", { scl: [1, 0.7, 1.1], lineMul: 0.8 }));
  arm.add(figProp(ctx, new TorusGeometry(0.047, 0.01, 6, 14), "#c9cdd1", "#565c64", { pos: [0, 0, -0.1], lineMul: 0.4 })); // wrist band
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const p = pivoted(figProp(ctx, new ConeGeometry(0.014, 0.1, 5).translate(0, 0.05, 0), "#f2f2ee", "#9a9a94", { lineMul: 0.4 }), [0, 0, 0]);
    p.position.set((i - 1) * 0.035, 0.0, 0.05); arm.add(p); fingers.push({ p, i });
  }
  arm.add(figProp(ctx, new TorusGeometry(0.014, 0.005, 5, 10), "#c9cdd1", "#565c64", { pos: [0.035, 0.0, 0.06], lineMul: 0.3 })); // claw ring
  body.add(arm);
  const clawPoint = new Group(); clawPoint.position.set(0, 0.07, 0.07); arm.add(clawPoint); // where the apple sits

  h.arm = arm; h.clawPoint = clawPoint;
  const crouch = 0.5;
  return {
    h, root: h.group, clawPoint,
    update(t, cue) {
      const take = T(cue, "take"), write = T(cue, "write"), flare = T(cue, "flare"), flick = T(cue, "flick");
      const st = sinceToll(cue, t), tollK = decay(st, 5);
      // crouched, knees up; sits lower after the wings are set
      h.setPose("kneel", crouch);
      h.setPose("stagger", 0);
      // grin: widens at the take (x1.25), flattens at the flare (y 0.25), back to a smirk after the flick
      const widen = sm(take, take + 0.3, t), flat = sm(flare, flare + 0.15, t) * (1 - sm(flick + 0.4, flick + 1.2, t));
      grin.scale.set(lerp(1, 1.25, widen) * lerp(1, 0.9, flat), lerp(1, 0.25, flat), 1);
      h.expression(flat > 0.5 ? "neutral" : "smug", 1 - flat * 0.5);
      // wings: base ruffle, 20 deg flare on each toll (20 e^-5 s)
      for (const w of wings) w.pv.rotation.z = -w.s * (4 * D2 + 20 * D2 * tollK) + Math.sin(t * 2.1) * 0.01;
      // claw: open palm; closes (fingers curl 75 deg) at the take; writing strokes from 5.4 stall at each toll and recover over 0.8 s
      const curl = sm(take, take + 0.18, t) * (1 - sm(flick, flick + 0.12, t)) * 75 * D2;
      for (const f of fingers) f.p.rotation.x = -curl - (f.i - 1) * 0.05;
      const amp = t >= write ? sm(0, 0.8, st) : 0; // stalled right after a toll
      arm.position.set(CLAW[0], CLAW[1] + 0.01 * Math.sin(t * 5) * amp, CLAW[2]);
      const flickK = win(t, flick, flick + 0.35, 0.05, 0.2);
      arm.rotation.set(-0.3 * flickK, 0, 0); // the flick tosses the wrist up
      // notebook: on the belt, then held on the knee and opened at the write beat, strokes bob
      const open = sm(write, write + 0.5, t);
      book.position.set(lerp(-0.3, 0.14, open), lerp(0.1, 0.12, open), lerp(0.2, 0.43, open));
      book.rotation.set(lerp(0, -0.6, open), lerp(0.4, -0.15, open), 0);
      book.scale.x = lerp(0.5, 1, open);
      h.update(t);
    },
    dispose() { h.dispose(); },
  };
}
