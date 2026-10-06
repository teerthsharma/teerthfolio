// CAST actors for pr-mujoco-3396: 12 costumed small seals and the script each plays. Every state is a PURE FUNCTION of the
// stepped time t (no integration), so scrubbing equals playing. World axes: the Wall lies toward -z of the seal; the camera
// law's chase pose sits at +z. Positions are offsets from the seal's build-time base (sx, sz).
//
//   5 Marleyan riflemen  (ranks facing the Wall; kneel; stagger, rifle dropped; run left; cover heads; thrown by the swell; gawk; recover)
//   1 Marleyan officer   (the poster man: back to us on the tower base, sabre at the Wall; the only one who holds until f174)
//   4 Survey scouts      (run across the square, skid, plant, look up; cloak blown back; salute the seal; scout 0 reaches toward it)
//   2 Civilians          (cream coat + red armband; poster pose; fall at f118; sit up at f300; lit by embers)
//
// Time constants are the bible's frames at 24 fps; any beat of the same name in scene.beats overrides the default (see timeline()).
import { costumeSpecs, adorn, VICTIM_SCALE } from "./costumes.js";

const PI = Math.PI;
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lin = (a, b, t) => cl((t - a) / (b - a));
const sm = (a, b, t) => { const u = cl((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const mix = (a, b, k) => a + (b - a) * k;
const wrap = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
const lerpAng = (a, b, k) => a + wrap(b - a) * k;
const toward = (x, z, tx, tz) => Math.atan2(tx - x, tz - z); // the kit's yaw convention: +z forward

// the bible's frames, overridable by same-named beats in scene.beats (read once at build: deterministic, no jump on scrub)
export function timeline(ctx) {
  const f = (n) => n / 24;
  const B = (name, def) => { const b = ctx.scene?.beats?.find((x) => x.name === name); return b && Number.isFinite(b.t) ? b.t : def; };
  const T = {
    stand0: f(30),            // shot 2: the ranks stand
    kneel: B("lineA", f(77)), // f77 kneel (the crack follows at f79)
    stand98: B("stand", f(98)), // f98 skin falls, the Wall Titans stand, eyes light
    run: B("flee", f(118)),   // f118 run left
    strike: B("strike", f(162)), // f162 bolt
    swell0: B("swell", f(164)),  // f164 swell begins
    eat0: B("eat", f(177)),   // f177 eating begins
    gap: B("gap", f(247)),    // f247 the gap opens
    flip: B("flip", f(280)),  // f280 flip and salute
    fist: B("fist", f(300)),  // f300 fist
  };
  T.runEnd = T.run + 36 / 24;   // f154
  T.back = T.strike + 1 / 24;   // f163 the officer backs off a step
  T.swell1 = T.swell0 + 10 / 24; // f174
  T.eat1 = T.eat0 + 70 / 24;    // f247
  T.shrink1 = T.gap + 13 / 24;  // f260
  T.catch = T.flip + 16 / 24;   // f296
  // footfalls: every 0.9 s from 4.6 s to 15.6 s (beats named footfall win)
  const ffb = (ctx.scene?.beats ?? []).filter((x) => x.name === "footfall").map((x) => x.t);
  T.ff = ffb.length ? ffb : Array.from({ length: 13 }, (_, n) => 4.6 + 0.9 * n);
  return T;
}

const blank = (x, z, yaw) => ({ x, z, y: 0, yaw, tilt: 0, roll: 0, poses: {}, expr: "neutral", ek: 0, look: [0, 0], tint: 0 });
const add = (st, n, k) => { if (k > 0) st.poses[n] = (st.poses[n] ?? 0) + k; };

export function buildActors(ctx, P, root, T) {
  const sx = ctx.seal.at[0], sz = ctx.seal.at[2];
  const SP = () => [ctx.seal.at[0], ctx.seal.at[2]]; // live seal base (a pure function of t)
  const specs = costumeSpecs(ctx);
  const list = [];

  // a footfall makes a standing victim's knees buckle for 4 frames (bible: 0.2 m)
  const knee = (t) => { for (const f of T.ff) { const s = t - f; if (s >= 0 && s < 4 / 24) return Math.sin((PI * s) / (4 / 24)); } return 0; };
  // the swell's shock: away from the seal
  const away = (x, z, amt) => { const [px, pz] = SP(); let dx = x - px, dz = z - pz; const d = Math.hypot(dx, dz) || 1; return [x + (dx / d) * amt, z + (dz / d) * amt]; };
  const spin = (x, z, cx, cz, a) => { const dx = x - cx, dz = z - cz, c = Math.cos(a), s = Math.sin(a); return [cx + dx * c - dz * s, cz + dx * s + dz * c]; };
  const pulse = (t) => 0.5 + 0.5 * Math.sin(t * ((2 * PI) / 0.58)); // the gulp: a recoil every 0.58 s through the eat

  const spawn = (kind, spec, p0, fn, extra = {}) => {
    const h = ctx.kit.costumedSeal(ctx.engine, spec);
    h.group.rotation.order = "YXZ"; // yaw first, then the lean in the seal's own frame
    root.add(h.group);
    const a = { kind, h, p0, fn, tint: "#ff9a3c", ...adorn(kind, h, P, ctx), ...extra };
    if (kind === "scout") a.blade = h.props.children[h.props.children.length - 2]; // right blade (the left one was added last)
    else if (kind === "officer") a.blade = h.props.children[h.props.children.length - 1];
    list.push(a);
    if (a.rifle) root.add(a.rifle); // starts in the world group; the script parents it to the body while held
    return a;
  };

  // ---------------------------------------------------------------- RIFLEMEN x5
  // ranks of two rows, 5.6 and 6.9 m ahead of the seal. Frames: f30-77 stand; f77-98 kneel; f98-118 stagger, rifle dropped;
  // f118-154 run left; f162 cover heads; f163-174 thrown prone (lower-left three spiral: the Last Judgment egg, f163-185);
  // then gawk upward and fall to knees on the swell; recover to grim at f300.
  for (let i = 0; i < 5; i++) {
    const p0 = [sx - 4.5 + 3 * i, sz - 5.6 - (i % 2) * 1.3];
    const sp = i < 3, sc = [sx - 6.5, sz - 3.0];
    const state = (t) => {
      const st = blank(p0[0], p0[1], PI);
      const runDur = T.runEnd - T.run, U = Math.min(Math.max(t - T.run, 0), runDur);
      let x = p0[0] - 2.4 * U, z = p0[1] + 0.9 * sm(T.stand98, T.run, t);
      // the shock
      const th = sm(T.swell0, T.swell1, t);
      if (th > 0) { [x, z] = away(x, z, 2.4 * th); if (sp) [x, z] = spin(x, z, sc[0], sc[1], 2.2 * th); }
      st.x = x; st.z = z;
      // yaw: wall, then left while running, then toward the seal once thrown
      let yaw = PI + (PI / 2) * sm(T.run, T.run + 0.2, t);
      yaw = lerpAng(yaw, toward(x, z, ...SP()), sm(T.swell0 - 0.1, T.swell0 + 0.2, t));
      st.yaw = yaw + (sp ? 3.5 * th : 1.2 * th);
      // poses (all additive windows)
      const kneel1 = sm(T.kneel, T.kneel + 0.4, t) * (1 - sm(T.stand98, T.stand98 + 0.25, t));
      const stag = sm(T.stand98, T.stand98 + 0.2, t) * (1 - sm(T.run, T.run + 0.15, t));
      const runW = sm(T.run, T.run + 0.15, t) * (1 - sm(T.runEnd, T.runEnd + 0.15, t));
      const cower = sm(T.strike, T.strike + 0.12, t) * (1 - sm(T.swell0, T.swell0 + 0.1, t));
      const blown = sm(T.swell0, T.swell0 + 0.35, t) * (1 - sm(T.swell1, T.swell1 + 0.25, t));
      const fall = sm(T.swell1, T.swell1 + 0.25, t) * (1 - sm(T.swell1 + 0.45, T.swell1 + 0.95, t));
      const kneel2 = sm(T.swell1 + 0.45, T.swell1 + 1.0, t) * (1 - sm(T.fist, T.fist + 0.6, t));
      add(st, "kneel", kneel1 + kneel2);
      add(st, "stagger", stag + 0.35 * runW + 0.3 * sm(T.runEnd, T.runEnd + 0.2, t) * (1 - sm(T.strike, T.strike + 0.1, t)));
      add(st, "recoil", 0.6 * stag + (t > T.eat0 && t < T.eat1 ? 0.3 * pulse(t) * kneel2 : 0));
      add(st, "cower", cower);
      add(st, "blown", blown);
      add(st, "fallen", fall);
      const standing = (t < T.kneel - 0.05 || t > T.fist + 0.7) ? 0.3 * knee(t) : 0; // footfall: knees buckle 4 frames
      if (t > T.stand0 && standing) add(st, "kneel", standing);
      st.y = runW * Math.abs(Math.sin(U * 15)) * 0.07;
      st.tilt = 0.14 * runW;
      // face: terror eyes (white, pinprick pupils) throughout; awe in the lull; grim at f300
      if (t < T.fist) { st.expr = t > T.eat1 ? "awe" : "terror"; st.ek = t > T.eat1 ? 0.8 : t < T.kneel ? 0.4 : t < T.stand98 ? 0.7 : 1; }
      else { st.expr = "calm"; st.ek = 0.6 * sm(T.fist, T.fist + 0.5, t); }
      st.look = [0, 0.9 * sm(T.swell1 + 0.5, T.swell1 + 1, t) * (1 - sm(T.fist, T.fist + 0.5, t))];
      return st;
    };
    spawn("rifleman", specs.rifleman(i), p0, state);
  }

  // ---------------------------------------------------------------- OFFICER x1 (the poster man)
  {
    const p0 = [sx + 10.0, sz - 6.2];
    const state = (t) => {
      const st = blank(p0[0], p0[1] + 0.5 * sm(T.back, T.back + 0.25, t), PI);
      st.yaw = PI - 0.12 * sm(T.swell1 - 0.3, T.swell1 + 0.3, t);
      const k = sm(T.swell1, T.swell1 + 0.45, t) * (1 - sm(T.fist, T.fist + 0.6, t));
      add(st, "kneel", k);
      add(st, "recoil", t > T.eat0 && t < T.eat1 ? 0.25 * pulse(t) * k : 0);
      add(st, "stagger", 0.35 * sm(T.back, T.back + 0.15, t) * (1 - sm(T.back + 0.15, T.back + 0.4, t)));
      st.expr = t < T.fist ? "terror" : "calm";
      st.ek = t < T.fist ? mix(0.55, 1, sm(T.stand98, T.stand98 + 0.5, t)) : 0.6 * sm(T.fist, T.fist + 0.5, t);
      st.look = [0, t < T.swell1 ? 0.6 : 0.9];
      return st;
    };
    spawn("officer", specs.officer(), p0, state);
  }

  // ---------------------------------------------------------------- SCOUTS x4
  // plant positions P_i; they start 5 to 8 m to the right and run left f118-154 with the blades forward and the cloak streaming
  const PL = [[sx - 3.0, sz - 1.9], [sx + 0.9, sz - 7.1], [sx + 4.3, sz - 8.2], [sx + 7.7, sz - 7.1]];
  const CREATION = [sx - 1.4, sz - 0.7]; // scout 0: face to face with the seal's flipper reach (the Creation of Adam, f300-312)
  for (let i = 0; i < 4; i++) {
    const P0 = PL[i], S0 = [P0[0] + 5 + 1.1 * i, P0[1]];
    const state = (t) => {
      const run = lin(T.run, T.runEnd, t), e = 1 - Math.pow(1 - run, 1.6);
      let x = mix(S0[0], P0[0], e), z = P0[1];
      const walk = i === 0 ? sm(T.flip + 0.45, T.fist - 0.05, t) : 0;
      if (walk > 0) { x = mix(P0[0], CREATION[0], walk); z = mix(P0[1], CREATION[1], walk); }
      const st = blank(x, z, PI);
      const runW = sm(T.run, T.run + 0.15, t) * (1 - sm(T.runEnd, T.runEnd + 0.3, t));
      // yaw: wall -> left (run) -> toward the seal (skid, plant) -> scout 0 faces the seal's flipper at the Creation spot
      let yaw = PI + (PI / 2) * sm(T.run, T.run + 0.2, t);
      yaw = lerpAng(yaw, toward(x, z, ...SP()), sm(T.runEnd, T.back + 0.1, t));
      st.yaw = yaw;
      st.y = (runW * Math.abs(Math.sin((t - T.run) * 16)) + walk * (1 - walk) * 4 * Math.abs(Math.sin(t * 12))) * 0.07;
      st.tilt = 0.18 * runW + 0.06 * walk * (1 - walk) * 4;
      add(st, "stagger", 0.55 * sm(T.runEnd + 0.1, T.runEnd + 0.3, t) * (1 - sm(T.back + 0.1, T.back + 0.4, t)));
      add(st, "salute", sm(T.flip, T.flip + 0.35, t) * (1 - sm(T.fist + 1.5, T.fist + 2.0, t)));
      add(st, "bow", 0.22 * sm(T.flip, T.flip + 0.5, t) * (1 - sm(T.fist, T.fist + 0.5, t))); // defeated respect
      // eyes: set jaw, narrow; the swell's white-eyed stare; awe; relax
      if (t < T.back) { st.expr = "calm"; st.ek = 0.7; st.look = [0, 0.5 * (t < T.run ? 1 : 0)]; }
      else if (t < T.eat0 + 0.1) { st.expr = "terror"; st.ek = sm(T.back, T.back + 0.2, t); st.look = [0, 0.7]; }
      else if (t < T.shrink1) { st.expr = "awe"; st.ek = 0.85; st.look = [0, 0.7 * (1 - sm(T.gap, T.shrink1, t))]; }
      else { st.expr = "calm"; st.ek = 0.6; st.look = [0, 0]; }
      return st;
    };
    spawn("scout", specs.scout(i), P0, state, { idx: i, S0, P0 });
  }

  // ---------------------------------------------------------------- CIVILIANS x2 (the poster composition: back to us, looking up)
  for (let i = 0; i < 2; i++) {
    const p0 = i === 0 ? [sx - 2.0, sz - 4.0] : [sx + 2.6, sz - 4.6], dly = 0.25 * i;
    const state = (t) => {
      const back = sm(T.stand98 + dly, T.stand98 + dly + 0.4, t);
      let x = p0[0], z = p0[1] + 0.6 * back;
      const th = sm(T.swell0, T.swell1, t);
      if (th > 0) [x, z] = away(x, z, 1.5 * th);
      const st = blank(x, z, PI);
      st.yaw = lerpAng(PI, toward(x, z, ...SP()), sm(T.run + dly, T.run + dly + 0.4, t));
      const fallK = sm(T.run + dly, T.run + dly + 0.5, t);
      const rise = sm(T.fist, T.fist + 0.9, t);
      add(st, "fallen", fallK * (1 - rise * 0.85));
      add(st, "kneel", 0.6 * rise);
      add(st, "recoil", 0.5 * back * (1 - fallK));
      add(st, "terror", 0.6 * fallK * (1 - rise));
      st.expr = rise > 0.3 ? "calm" : "terror";
      st.ek = rise > 0.3 ? 0.8 : mix(0.3, 1, back);
      st.look = [0, t < T.run ? 0.9 : 0.5 * (1 - rise)];
      st.tint = 0.12; // embers #ff9a3c on the lower body
      return st;
    };
    spawn("civilian", specs.civilian(i), p0, state);
  }

  // ---------------------------------------------------------------- per-frame
  const BL = { // right-blade targets (x, z of its Euler); the second blade hangs low
    rest: [0.25, -0.35], run: [1.7, 0], up: [0, -0.05], point: [PI / 2, 0],
  };
  const bladeFor = (a, t) => {
    if (a.kind === "officer") { // the sabre: pointed at the Wall until f98, then drops
      const d = sm(T.stand98, T.stand98 + 0.3, t);
      return [mix(1.15, 0.35, d), mix(0, -0.2, d)];
    }
    // scout
    let [x, z] = BL.rest;
    const run = sm(T.run - 0.1, T.run + 0.1, t) * (1 - sm(T.runEnd + 0.1, T.runEnd + 0.4, t));
    x = mix(x, BL.run[0], run); z = mix(z, BL.run[1], run);
    const up = sm(T.flip, T.flip + 0.35, t) * (1 - sm(T.fist + 1.5, T.fist + 2.0, t));
    x = mix(x, BL.up[0], up); z = mix(z, BL.up[1], up);
    if (a.idx === 0) { const pt = sm(T.fist, T.fist + 0.4, t) * (1 - sm(T.fist + 1.5, T.fist + 2.0, t)); x = mix(x, BL.point[0], pt); z = mix(z, BL.point[1], pt); }
    return [x, z];
  };

  const update = (t) => {
    for (const a of list) {
      const st = a.fn(t, a), v = a.h;
      v.place(st.x, st.y, st.z, st.yaw);
      v.group.rotation.x = st.tilt; v.group.rotation.z = st.roll;
      for (const n of ["kneel", "recoil", "blown", "terror", "petrified", "cower", "bow", "salute", "fallen", "stagger"]) v.setPose(n, Math.min(1.3, st.poses[n] ?? 0));
      v.expression(st.expr, st.ek);
      v.tint(a.tint, st.tint);
      v.eyes?.userData.look(st.look[0], st.look[1]);
      if (a.blade) { const [bx, bz] = bladeFor(a, t); a.blade.rotation.set(bx, 0, bz); }
      if (a.blade2) { const run = sm(T.run - 0.1, T.run + 0.1, t) * (1 - sm(T.runEnd + 0.1, T.runEnd + 0.4, t)); a.blade2.rotation.set(mix(0.25, 1.7, run), 0, mix(0.35, 0, run)); }
      if (a.cloak) { // 3 folds' worth of motion: stream while running, blown back by the swell's wind (+0.4 rad), idle sway
        const runW = sm(T.run, T.run + 0.15, t) * (1 - sm(T.runEnd, T.runEnd + 0.4, t));
        const wind = 0.4 * sm(T.swell0, T.swell0 + 0.25, t) * (1 - 0.65 * sm(T.swell1 + 0.3, T.swell1 + 1.5, t));
        const th = Math.max(0.05 + 0.025 * Math.sin(t * 2.2 + a.idx), runW * (0.32 + 0.08 * Math.sin(t * 18 + a.idx)), wind * (1 + 0.1 * Math.sin(t * 15 + a.idx)));
        P.setFlap(a.cloak, th);
      }
      v.update(t);
      // the rifle: in the hand until f98, then dropped where it fell
      if (a.rifle) {
        const held = t < T.stand98;
        if (held) {
          if (a.rifle.parent !== v.body) v.body.add(a.rifle);
          a.rifle.position.set(0.24, 0.3, 0.28); a.rifle.rotation.set(-0.45, 0.1, -0.35); a.rifle.scale.setScalar(1);
        } else {
          if (a.rifle.parent !== root) root.add(a.rifle);
          const fall = sm(T.stand98, T.stand98 + 0.35, t), s = VICTIM_SCALE, y0 = T.stand98;
          // world position of the grip at the drop moment, from the same state function
          const dst = a.fn(y0, a), c = Math.cos(dst.yaw), sn = Math.sin(dst.yaw), lx = 0.24 * s, lz = 0.28 * s;
          a.rifle.position.set(dst.x + lx * c + lz * sn, mix(0.3 * s, 0.035, fall), dst.z - lx * sn + lz * c);
          a.rifle.rotation.set(mix(-0.45, 0, fall), dst.yaw + mix(0.1, 0.9, fall), mix(-0.35, 0, fall));
          a.rifle.scale.setScalar(s);
        }
      }
    }
  };
  const dispose = () => {
    for (const a of list) { a.h.dispose(); a.rifle?.traverse((o) => { o.material?.dispose?.(); }); }
    P.dispose();
    list.length = 0;
  };
  return { list, update, dispose, positions: () => list.map((a) => a.h.group.position) };
}
