// FX layer for p-separatrix (JoJo Golden Wind, Colosseum finale): every effect of the bible's FX section, one pass of data.
// Layer 1. Every effect is a PURE function of the stepped clock `t` and the beat windows (scrub == play).
// The seal is never covered: all fullscreen/sprite/instanced fx fade through the seal's screen ellipse, and nothing here is emissive on it.
// Impact frames (5.8, 11.85) and the reserved speedlines/shock/trauma beats belong to scene.js (sakuga); this layer adds its own
// magenta/gold streaks, spokes and glints around them.
//
// CUE NAMES (a scene.js beat of this name wins; otherwise the bible's default window below is used):
//   ringwipe 0-1.3   costume 0.5-1.0   bloom 0.75-1.2   cosmos 3.0-5.3   kingcrimson 3.0-8.2   erase 3.7-5.3 (alias timeskip)
//   coin 4.2   arrow 5.15-5.8   gild 6.45-7.7   reverse 8.2-9.3   clear (x3 TING + ripple)   beacon 9.3   muda 10.35-11.85
//   lastblow 11.85   claim 12.1-15.4   tbc 14.7-15.4   zero 15.2-16.4   chime 16.4   sepia 16.4-17.4   collapse 16.6-17.0   wipe 17.0-17.4
//   lettering: gogogo don zzzt shing tink ting (the MUDA arc reuses the muda beat)
// Arena guesses (Diavolo mark, pools, beacon) are F0-local and overridable from scene.fx (see util.js arena()).
import { clamp, lerp, sm, hash, makeWin, active, prog, arena, col } from "./util.js";
import { uberMaterial, cosmosMaterial } from "./screen.js";
import { makeInstances } from "./instances.js";
import { makeGild } from "./gild.js";
import { erasePlaster } from "./erase-plaster.js";
import { lettersCanvas, tbcCanvas, makeSprite, placeAway, CELLS } from "./lettering.js";

const TAU = Math.PI * 2;
const ease = (u) => u * u * (3 - 2 * u);
const ease3 = (u) => 1 - Math.pow(1 - u, 3);
// pop on twos: 0->1.25 in 0.1 s, back to 1.0 by 0.2 s, gentle drift after (bible: pop 0.1 s overshoot 1.25)
const pop = (age) => (age < .1 ? 1.25 * (age / .1) : age < .2 ? 1.25 - .25 * ((age - .1) / .1) : 1 + .03 * (age - .2));

export default function build(ctx) {
  const { THREE, scene, engine } = ctx;
  const group = new THREE.Group();
  const win = makeWin(scene);
  const F = arena(THREE, scene);
  const C = {
    gold: col(THREE, "#f2bd45"), pale: col(THREE, "#fff0a0"), mag: col(THREE, "#ff2adf"), crim: col(THREE, "#ff2a5a"),
    cream: col(THREE, "#fbf6e8"), sino: col(THREE, "#b9573a"), cold: col(THREE, "#1c2448"), sepia: col(THREE, "#8a6a3a"),
    ink: col(THREE, "#1a1020"), black: col(THREE, "#0b0612"), pink: col(THREE, "#ff9be0"), disc: col(THREE, "#f4b8a0"),
    trav: col(THREE, "#d9a441"), lav: col(THREE, "#e8d8f0"), coral: col(THREE, "#ff6a5a"), blue: col(THREE, "#bfe0ff"), white: [1, 1, 1],
    magL: [1, .42, .88],
  };
  // shared uniform objects (one value object each, referenced by every material)
  const U = { uAsp: { value: 1.78 }, uT: { value: 0 }, uPx: { value: 2 / 720 }, uSeal: { value: new THREE.Vector4(0, 0, 1e-3, 1e-3) }, uDia: { value: new THREE.Vector4(0, 0, 1e-3, 1e-3) } };

  // ---- windows ------------------------------------------------------------------------------------------------------------
  const W = {
    ringwipe: win("ringwipe", [{ t: 0, dur: 1.3 }]), bloom: win("bloom", [{ t: .75, dur: .45 }]),
    cosmos: win("cosmos", [{ t: 3.0, dur: 2.3 }]), kc: win("kingcrimson", [{ t: 3.0, dur: 5.2 }]),
    erase: win("erase", [{ t: 3.7, dur: 1.6 }]), skip: win("timeskip", [{ t: 3.7, dur: 1.6 }], "erase"),
    coin: win("coin", [{ t: 4.2, dur: .3 }]), arrow: win("arrow", [{ t: 5.15, dur: .65 }]), gild: win("gild", [{ t: 6.45, dur: 1.25 }]),
    reverse: win("reverse", [{ t: 8.2, dur: 1.1 }]), clear: win("clear", [{ t: 9.35, dur: .9 }, { t: 9.65, dur: .9 }, { t: 9.95, dur: .9 }]),
    beacon: win("beacon", [{ t: 9.3, dur: .5 }]), muda: win("muda", [{ t: 10.35, dur: 1.5 }]), last: win("lastblow", [{ t: 11.85, dur: .4 }]),
    claim: win("claim", [{ t: 12.1, dur: 3.3 }]), tbc: win("tbc", [{ t: 14.7, dur: .7 }]), zero: win("zero", [{ t: 15.2, dur: 1.2 }]),
    chime: win("chime", [{ t: 16.4, dur: .8 }]), sepia: win("sepia", [{ t: 16.4, dur: 1.0 }]), collapse: win("collapse", [{ t: 16.6, dur: .4 }]),
    wipe: win("wipe", [{ t: 17.0, dur: .4 }]),
    gogogo: win("gogogo", [{ t: .2, dur: 1.1 }, { t: 3.0, dur: .9 }]), don: win("don", [{ t: 6.4, dur: 1.3 }]), zzzt: win("zzzt", [{ t: 3.7, dur: 1.6 }]),
    shing: win("shing", [{ t: 5.8, dur: .5 }]), tink: win("tink", [{ t: 1.7, dur: .5 }, { t: 2.0, dur: .5 }, { t: 2.3, dur: .5 }, { t: 2.6, dur: .5 }]),
    ting: win("ting", [{ t: 9.35, dur: .6 }, { t: 9.65, dur: .6 }, { t: 9.95, dur: .6 }]),
  };
  // costume sparkle window (0.5-1.0 s): gold glints on a ring around the seal
  const costumeW = win("costume", [{ t: .5, dur: .5 }]);

  // ---- objects ------------------------------------------------------------------------------------------------------------
  const inst = makeInstances(THREE, U, 1500);
  const uber = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), uberMaterial(THREE, U, C));
  uber.frustumCulled = false; uber.renderOrder = 90;
  const cosmos = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cosmosMaterial(THREE, U, C));
  cosmos.frustumCulled = false; cosmos.renderOrder = 10; cosmos.visible = false;
  const gild = makeGild(THREE, C.gold);
  const plaster = erasePlaster();
  group.add(cosmos, ...gild.group, inst.mesh, uber, plaster.mesh);

  // lettering atlas + sprite pool + TBC card
  const sprites = [];
  let atlasTex = null, tbcTex = null, tbc = null;
  const cellUV = (s, cell) => s.mat.uniforms.uOff.value.set((cell % 4) * .25, 1 - (Math.floor(cell / 4) + 1) * .5);
  const lc = lettersCanvas(ctx.rng);
  if (lc) {
    atlasTex = new THREE.CanvasTexture(lc);
    if (THREE.SRGBColorSpace) atlasTex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 20; i++) { const s = makeSprite(THREE, U, atlasTex, [0, .5], [.25, .5], 1); sprites.push(s); group.add(s.mesh); }
    tbcTex = new THREE.CanvasTexture(tbcCanvas());
    if (THREE.SRGBColorSpace) tbcTex.colorSpace = THREE.SRGBColorSpace;
    tbc = makeSprite(THREE, U, tbcTex, [0, 0], [1, 1], 1024 / 384); group.add(tbc.mesh);
  }
  ctx.setLayer?.(group, 1);

  // ---- scratch ------------------------------------------------------------------------------------------------------------
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), camR = new THREE.Vector3(), camU = new THREE.Vector3(), camP = new THREE.Vector3();
  const chest = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  let sealBox = { cx: 0, cy: 0, rx: 1e-3, ry: 1e-3 }, diaBox = { cx: 0, cy: 0, rx: 1e-3, ry: 1e-3 };
  const A0 = F.W([0, 0, 0]);
  const DIA = F.W(F.dia);
  const P = (l) => F.W(l).toArray();

  function ellipse(cam, a, b, asp, wScale, pad) {
    v1.copy(a).project(cam); v2.copy(b).project(cam);
    if (v1.z > 1 || v2.z > 1 || v1.z < -1) return { cx: 0, cy: 0, rx: 1e-3, ry: 1e-3 };
    const ry = Math.abs(v1.y - v2.y) / 2 * 1.15 + pad;
    return { cx: (v1.x + v2.x) / 2 * asp, cy: (v1.y + v2.y) / 2, rx: ry * wScale, ry };
  }
  const radial = (c, ang, rr, camRv, camUv) => [c[0] + (camRv.x * Math.cos(ang) + camUv.x * Math.sin(ang)) * rr, c[1] + (camRv.y * Math.cos(ang) + camUv.y * Math.sin(ang)) * rr, c[2] + (camRv.z * Math.cos(ang) + camUv.z * Math.sin(ang)) * rr];

  function update(t, dt, cue) {
    const cam = ctx.player?.camera;
    if (!cam) return;
    cam.updateMatrixWorld(true); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const asp = cue?.aspect || ctx.aspect?.() || 1.78;
    const sh = ctx.seal, ss = sh.scale || 1, sa = sh.at;
    const hH = typeof sh.height === "number" && sh.height > 0 ? sh.height : .9 * ss;
    const rH = engine.renderer?.domElement?.height || 720;
    U.uAsp.value = asp; U.uT.value = t; U.uPx.value = 2 / rH;
    plaster.uniforms.uT.value = t;
    plaster.uniforms.uErase.value = prog(W.erase[0], t);
    camR.setFromMatrixColumn(cam.matrixWorld, 0); camU.setFromMatrixColumn(cam.matrixWorld, 1); camP.setFromMatrixPosition(cam.matrixWorld);
    chest.set(sa[0], sa[1] + .4 * ss, sa[2]);

    // screen ellipses of the seal and of Diavolo+KC (the masks every fx obeys)
    sealBox = ellipse(cam, pa.set(sa[0], sa[1], sa[2]), pb.set(sa[0], sa[1] + hH, sa[2]), asp, .85, .04);
    diaBox = ellipse(cam, pa.set(DIA.x, 0, DIA.z), pb.set(DIA.x, 3.9, DIA.z), asp, .55, .06);
    U.uSeal.value.set(sealBox.cx, sealBox.cy, sealBox.rx, sealBox.ry);
    U.uDia.value.set(diaBox.cx, diaBox.cy, diaBox.rx, diaBox.ry);
    pa.copy(chest).project(cam);
    const sX = pa.x * asp, sY = pa.y;

    // handy world vectors
    const away = new THREE.Vector3(DIA.x - camP.x, 0, DIA.z - camP.z).normalize();             // camera -> Diavolo on the ground
    const dirSD = new THREE.Vector3(DIA.x - sa[0], 0, DIA.z - sa[2]).normalize();                // seal -> Diavolo
    const Dc = [DIA.x, DIA.y + .15, DIA.z];
    const S0 = [chest.x + dirSD.x * .6, chest.y + .15, chest.z + dirSD.z * .6];
    const lineAng = (a, b) => { v2.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); return Math.atan2(v2.dot(camU), v2.dot(camR)); };

    inst.begin();
    const push = inst.push;

    // ======== MOTES (dust, all film) =====================================================================================
    // 150 gold dust motes: wrapped rise y=(s3*9+t*(.25+.4*s4)) mod 9, lazy sway, flicker; denser at the parcel drops (1.2-3.5 s)
    const moteA = 1 - sm(15.2, 16.2, t);
    const dense = 1 + .8 * sm(1.2, 1.7, t) * (1 - sm(3.2, 3.6, t));
    if (moteA > .01) for (let i = 0; i < 150; i++) {
      const s1 = hash(i * 3.1), s2 = hash(i * 5.7 + 1), s3 = hash(i * 7.3 + 2), s4 = hash(i * 11.9 + 3);
      const x = sa[0] + (s1 - .5) * 30 + Math.sin(t * .3 + s4 * TAU) * .8;
      const z = sa[2] + (s2 - .5) * 30 + Math.cos(t * .27 + s1 * TAU) * .8;
      const y = ((s3 * 9 + t * (.25 + .4 * s4)) % 9) + .2;
      const sz = (.04 + .1 * s4) * (1 + .3 * (dense - 1));
      push(0, [x, y, z], [sz, sz, 0, .35 * moteA * dense * (.5 + .5 * Math.sin(t * 3 + s1 * 20))], C.gold);
    }

    // ======== COSTUME SPARKLE (0.5-1.0): 18 gold glints on a ring round the seal, rising ===================================
    { const a = active(costumeW, t);
      if (a) for (let i = 0; i < 18; i++) { const ang = i / 18 * TAU + a.age * 2, e = Math.sin(clamp(a.u * 1.2 - hash(i) * .2) * Math.PI);
        push(6, [sa[0] + Math.cos(ang) * 1.0 * ss, sa[1] + (.15 + .9 * a.u * (.4 + hash(i * 3))) * ss, sa[2] + Math.sin(ang) * 1.0 * ss], [.22 * e, .22 * e, 0, e], i % 2 ? C.pale : C.gold, { seed: 0 }); } }

    // ======== ROUNDING DISCS (shot 2): #f4b8a0 coins drifting down with a flutter ===========================================
    { const t0 = 1.3, life = 1.8;
      for (let i = 0; i < 28; i++) {
        const age = t - t0 - i * .045; if (age < 0 || age > life) continue;
        const u = age / life, h1 = hash(i * 2.3), h2 = hash(i * 4.1 + 5), h3 = hash(i * 6.7 + 9);
        const l = [(h1 - .5) * 8 + Math.sin(age * 3 + h3 * 6) * .25, 7 - 6.6 * ease(u), 1 + h2 * 7];
        const sz = .13 + .07 * h3;
        push(1, P(l), [sz, sz * (.55 + .45 * Math.abs(Math.cos(age * 4 + h1 * 6))), age * (1 + h2), 1 - sm(.8, 1, u)], C.disc);
      }
    }

    // ======== COSMOS plane (3.0-5.3) + KING CRIMSON EDGE GLOW + Diavolo edge ================================================
    {
      const cw = W.cosmos[0];
      const cv = sm(cw.t, cw.t + .12, t) * (1 - sm(cw.t + cw.dur - .12, cw.t + cw.dur, t));
      cosmos.visible = cv > .02;
      if (cosmos.visible) {
        const dCam = Math.max(camP.distanceTo(DIA), camP.distanceTo(chest)) + 4.5;
        const n = cam.near, f = cam.far;
        cosmos.material.uniforms.uDepth.value = (f + n) / (f - n) - (2 * f * n) / ((f - n) * dCam);
        cosmos.material.uniforms.uCosmos.value = cv;
      }
      // KC halo: rises 3.0-3.7, sinks over the last .5 s of its window (8.0). Billboard BEHIND Diavolo, interior left clear.
      const kw = W.kc[0], ku = t - kw.t;
      const rise = ku < 0 ? 0 : sm(0, .7, ku) * (1 - sm(kw.dur - .5, kw.dur, ku));
      if (rise > .01) {
        const H = 2.6 * rise;
        push(8, [DIA.x + away.x * 1.0, (rise - 1) * 2 + 1.9, DIA.z + away.z * 1.0], [H, H, 0, 1], C.crim, { seed: .1 });
      }
      // Diavolo's own edge, 3.0-5.6
      const dd = prog({ t: 3.0, dur: .2 }, t) * (1 - sm(5.3, 5.6, t));
      if (dd > .01) push(8, [DIA.x + away.x * .25, DIA.y + .5, DIA.z + away.z * .25], [.78, .78, 0, .85 * dd], C.crim, { seed: .9 });
    }

    // ======== COIN GLINT (easter egg 1: heads at once, 4.2 s) ===============================================================
    { const a = active(W.coin, t);
      if (a) { const e = Math.sin(a.u * Math.PI); push(6, P([F.dia[0] + .38, F.dia[1] + .9, F.dia[2] + .12]), [.5 * e + .1, .5 * e + .1, a.age * 3, e], C.pale, { seed: 1 }); } }

    // ======== PLASTER ERASURE flakes (3.7-5.3): 90 flakes .32-2.2 m falling and spinning, sinopia rim ========================
    { const ew = W.erase[0];
      for (let i = 0; i < 90; i++) {
        const h1 = hash(i * 1.7), h2 = hash(i * 3.3 + 2), h3 = hash(i * 5.9 + 4), h4 = hash(i * 8.1 + 6);
        const age = t - ew.t - h4 * .8; if (age < 0) continue;
        const y = 11 - age * (2.5 + 3.5 * h3); if (y < -.3) continue;
        const x = A0.x + (h1 - .5) * 24, z = A0.z + (h2 - .2) * 20;
        if (Math.hypot(x - sa[0], z - sa[2]) < 1.8) continue;
        const sz = (.32 + Math.pow(h3, 3) * 1.9) * .5;                   // sprite half-size => full .32-2.2 m flakes
        const c = h4 < .5 ? C.cream : h4 < .85 ? C.trav : C.sino;
        push(2, [x, y, z], [sz, sz, age * (1 + 2 * h1), 1], c, { seed: h1 });
      } }

    // ======== ARROW (5.15-5.8): gold streak from upper left, pierce glint + spikes at 5.8 ===================================
    { const aw = W.arrow[0], u = (t - aw.t) / aw.dur;
      const tgt = [chest.x, chest.y + .05, chest.z];
      const o = P([-6.5, 3.3, 6.0]);
      if (u >= 0 && u <= 1) {
        const pp = Math.pow(u, 2.2), pt = (q) => [lerp(o[0], tgt[0], q), lerp(o[1], tgt[1], q), lerp(o[2], tgt[2], q)];
        const tail = pt(Math.max(0, pp - .28)), tip = pt(pp);
        push(5, tail, [.28, 1, 0, 1], C.gold, { b: tip });
        push(5, tail, [.08, 1, 0, 1], C.white, { b: tip });
        for (let j = 0; j < 3; j++) { const off = [(hash(j * 3.1) - .5) * .6, (hash(j * 5.7) - .5) * .6, 0];
          push(5, [tail[0] + off[0], tail[1] + off[1], tail[2]], [.06, 1, 0, .8], C.gold, { b: [tip[0] + off[0], tip[1] + off[1], tip[2]] }); }
        for (let j = 0; j < 4; j++) push(3, pt(Math.max(0, pp - hash(j * 2.9) * .3)), [.18, .18, j, .9], C.pale);
      } else if (u > 1) {
        const ag = (t - aw.t - aw.dur) / .4;
        if (ag >= 0 && ag <= 1) {                                          // pierce: star glint + 6 radial gold spikes (the green starburst is the eye decal's job)
          const e = 1 - ag;
          push(6, tgt, [.9 * e, .9 * e, 0, e], C.pale, { seed: 1 });
          for (let j = 0; j < 6; j++) push(5, tgt, [.1 * e, 1, 0, e], C.gold, { b: radial(tgt, j / 6 * TAU + .3, 1.6 * ease3(ag), camR, camU) });
        }
      } }

    // ======== GILD RING (6.45-7.7): ground front + cylinder shell + glints on the ring ======================================
    { const gw = W.gild[0], u = (t - gw.t) / gw.dur;
      gild.set(u >= 0 && u <= 1 ? u : -1, sa[0], sa[2], t);
      if (u >= 0 && u <= 1) {
        const R = 70 * (1 - Math.pow(1 - u, 2.2));
        for (let j = 0; j < 36; j++) { const ang = j / 36 * TAU + hash(j) * .3, h = hash(j * 4.3 + 1);
          const sz = (.3 + .3 * h) * (1 - u * .5);
          push(3, [sa[0] + Math.cos(ang) * R, .3 + h * 2.2, sa[2] + Math.sin(ang) * R], [sz, sz, j, (1 - u) * .9], j % 2 ? C.pale : C.gold); }
      } }

    // ======== REVERSE TRAILS (8.2-9.3): pale-violet streaks racing BACK along the arena axis ================================
    { const a = active(W.reverse, t);
      if (a) for (let i = 0; i < 18; i++) {
        const lane = (hash(i * 2.1) - .5) * 1.1, y = .35 + .3 * hash(i * 3.7), ph = (a.u + i * .07) % 1;
        const z = 13 - 11 * ph, len = 2.2, fade = Math.sin(ph * Math.PI);
        push(5, P([lane, y, z + len]), [.05 + .04 * hash(i), 1, 0, .55 * fade], i % 3 ? C.lav : C.gold, { b: P([lane, y, z]) });
      } }

    // ======== CLEAR PARCELS: ring ripples in the pools (0.9 s pulse) ========================================================
    W.clear.forEach((w, i) => {
      const age = t - w.t; if (age < 0 || age > w.dur) return;
      const pg = age / w.dur, pool = i % 2 ? F.poolR : F.poolL;
      push(10, P(pool), [2.4, 2.4, 0, 1 - pg * .3], C.blue, { prog: pg, mask: 0 });
      push(6, P([pool[0], .5, pool[2]]), [.35 * (1 - pg), .35 * (1 - pg), 0, 1 - pg], C.pale, { seed: 0 });
    });
    // ======== BEACON (first tear, coral #ff6a5a flash) ===================================================================
    { const a = active(W.beacon, t);
      if (a) { const e = Math.sin(a.u * Math.PI); push(6, P(F.beacon), [1.7 * e, 1.7 * e, 0, e], C.coral, { seed: 1, mask: 0 });
        push(10, P([F.beacon[0], .05, F.beacon[2]]), [5, 5, 0, e], C.coral, { prog: a.u, mask: 0 }); } }

    // ======== MUDA BARRAGE (10.35-11.85) on twos: 8-14 gold fist afterimages, white 4-point sparks, smear crescent ===========
    { const a = active(W.muda, t);
      if (a) {
        const s = Math.floor(t * 12 + 1e-6), N = 8 + Math.floor(hash(s * 1.7) * 7), ang = lineAng(S0, Dc);
        const dn = [Dc[0] - S0[0], Dc[1] - S0[1], Dc[2] - S0[2]], dl = Math.hypot(...dn) || 1, dnn = dn.map((x) => x / dl);
        for (let j = 0; j < N; j++) {
          const r1 = hash(s * 13.1 + j * 3.7), r2 = hash(s * 7.9 + j * 5.3), r3 = hash(s * 3.3 + j * 9.1);
          const q = Math.pow(r1, 1.2);
          const p = [lerp(S0[0], Dc[0], q) + (r2 - .5) * .9, lerp(S0[1], Dc[1], q) + (r3 - .5) * .9, lerp(S0[2], Dc[2], q) + (r2 - .5) * .5];
          const sz = .28 + .3 * r3;
          for (let g = 0; g < 3; g++) {                                         // head + two ghosts behind (the afterimage)
            const back = g * .76 * sz;
            push(4, [p[0] - dnn[0] * back, p[1] - dnn[1] * back, p[2] - dnn[2] * back], [sz, sz * .75, ang + (r2 - .5) * .3, [.85, .38, .17][g]], g ? C.gold : C.pale);
          }
        }
        for (let j = 0; j < 6; j++) { const r1 = hash(s * 5.1 + j), r2 = hash(s * 9.3 + j * 2), r3 = hash(s * 2.7 + j * 7);
          const sz = .22 + .3 * r3;
          push(3, [Dc[0] + (r1 - .5) * 1.1, Dc[1] + .1 + r2 * .7, Dc[2] + (r3 - .5) * .8], [sz, sz, r1 * 3, 1], C.white); }
        const mid = [(S0[0] + Dc[0]) / 2, (S0[1] + Dc[1]) / 2 + .2, (S0[2] + Dc[2]) / 2];
        push(12, mid, [1.7, 1.2, ang, .9], C.gold);                            // 2-3 frame smear (one step = 1/12 s)
      }
      const l = active(W.last, t);                                              // easter egg 3: the seventh pulse is the last blow
      if (l) { const e = 1 - l.u; push(6, Dc, [2 * e + .2, 2 * e + .2, 0, e], C.pale, { seed: 1 });
        for (let j = 0; j < 10; j++) push(5, Dc, [.09 * e, 1, 0, e], j % 2 ? C.mag : C.gold, { b: radial(Dc, j / 10 * TAU, 2.4 * ease3(l.u), camR, camU) }); } }

    // ======== CLAIM (12.1-15.4): rising gold/magenta sparks, a ring of eight pose glints ====================================
    { const a = active(W.claim, t);
      if (a) {
        for (let i = 0; i < 70; i++) {
          const h1 = hash(i * 2.9), h2 = hash(i * 4.3 + 1), h3 = hash(i * 6.1 + 2), ang = h1 * TAU, rr = 1.5 + 4.5 * h2;
          const y = ((h3 * 6 + a.age * (.5 + .7 * h2)) % 6);
          push(0, [sa[0] + Math.cos(ang) * rr, y, sa[2] + Math.sin(ang) * rr], [.07 + .06 * h3, .07 + .06 * h3, 0, .8 * sm(0, .4, a.age) * (1 - sm(2.9, 3.3, a.age))], i % 2 ? C.gold : C.magL);
        }
        for (let k = 0; k < 8; k++) { const age = a.age - .2 - k * .07; if (age < 0 || age > .55) continue;
          const e = Math.sin(age / .55 * Math.PI), ang = k / 8 * TAU;
          push(6, [sa[0] + Math.cos(ang) * 4.4, 1.2, sa[2] + Math.sin(ang) * 4.4], [.8 * e, .8 * e, 0, e], k % 2 ? C.pale : C.magL, { seed: 1 }); }
      } }

    // ======== COLLAPSE dust (16.6-17.0) =====================================================================================
    { const a = active(W.collapse, t);
      if (a) for (let i = 0; i < 18; i++) { const h1 = hash(i * 2.3), h2 = hash(i * 4.9 + 1), ang = i / 18 * TAU + h1, rr = 3 + 5 * h2;
        const e = ease3(a.u);
        push(7, [sa[0] + Math.cos(ang) * rr, .3 + e * 1.5 * h2, sa[2] + Math.sin(ang) * rr], [.9 + e * 1.2, .9 + e * 1.2, 0, .55 * (1 - a.u)], C.trav, { seed: h1 }); } }

    inst.end();

    // ======== FULLSCREEN uber ===============================================================================================
    const uu = uber.material.uniforms;
    const env = (w, i = .08, o = .08) => { const a = (t - w.t) / w.dur; return a < 0 || a > 1 ? 0 : sm(0, i, a) * (1 - sm(1 - o, 1, a)); };
    {
      // ring A: ring wipe (0-1.3) then the zero chime (16.4); centre = the seal
      const rw = W.ringwipe[0], ru = (t - rw.t) / rw.dur, cw = W.chime[0], cu = (t - cw.t) / cw.dur;
      if (ru >= 0 && ru <= 1) uu.uRingA.value.set(ru, sX, sY, .55 * (1 - .4 * ru));
      else if (cu >= 0 && cu <= 1) uu.uRingA.value.set(cu, sX, sY, .5);
      else uu.uRingA.value.set(-1, 0, 0, 0);
      const gw = W.gild[0], gu = (t - gw.t) / gw.dur;
      uu.uRingB.value.set(gu >= 0 && gu <= 1 ? gu : -1, sX, sY, .6);
      const bw = W.bloom[0], bu = (t - bw.t) / bw.dur;
      uu.uBloom.value = bu >= 0 && bu <= 1 ? Math.sin(bu * Math.PI) : 0;
      const sk = W.skip[0];
      uu.uStreak.value = env(sk); uu.uSketch.value = env(sk, .12, .2) * .9;
      const gk = (t - sk.t) / sk.dur;
      uu.uGrey.value = gk < 0 ? 0 : sm(0, .12, gk) * (1 - sm(1, 1.2, gk));
      uu.uMuda.value = env(W.muda[0], .05, .07) * .85;
      uu.uClaim.value = env(W.claim[0], .09, .15);
      const zw = W.zero[0], zu = (t - zw.t) / zw.dur;
      uu.uZero.value.set(zu < 0 ? -1 : ease(clamp(zu)), sX, sY, .9);
      const sp = W.sepia[0], su = (t - sp.t) / sp.dur;
      uu.uSepia.value = su < 0 ? 0 : sm(0, .5, su * 2) * .42;              // sepia hold on the final frame
      const ww = W.wipe[0], wu = (t - ww.t) / ww.dur;
      uu.uWipe.value = wu >= 0 && wu <= 1 ? wu : -1;
    }

    // ======== LETTERING sprites + TBC card ==================================================================================
    if (sprites.length) {
      let si = 0;
      const lay = (cell, w, x, y, h, rot, tint, rise, keep) => {
        if (si >= sprites.length) return;
        const age = t - w.t, life = w.dur; if (age < 0 || age > life) return;
        const s = sprites[si++]; cellUV(s, cell);
        const jit = (Math.floor(t * 12) % 2) * .012;                           // hand-brush boil on twos
        const out = keep ? sm(0, .25, age) * (1 - sm(life - .4, life, age)) : 1 - sm(life - .2, life, age);
        const sc = pop(age) * h, yy = y + (rise || 0) * age;
        const px = placeAway(sealBox, x * asp, yy, sc, sc, asp);
        s.set(px / asp, yy, sc, rot + jit, out, tint);
      };
      const side = sX > .15 ? -1 : 1;
      W.gogogo.forEach((w, i) => (i === 0 ? lay(CELLS.gogogo, w, -.62 * side, -.5, .2, -.08) : lay(CELLS.gogogo, w, .6 * side, .35, .26, .06)));
      // claim: ゴゴゴ rising up both edges, magenta left / gold right, .5 m/s ~ .12 ndc/s
      { const a = active(W.claim, t);
        if (a) { lay(CELLS.gogogo, a.w, -.86, -.35, .3, -.05, C.magL, .12, true); lay(CELLS.gogogo, a.w, .86, -.35, .3, .05, null, .12, true); } }
      W.zzzt.forEach((w) => lay(CELLS.zzzt, w, .5 * side, .45, .24, .05));
      W.shing.forEach((w) => lay(CELLS.shing, w, -.5 * side, .35, .27, -.1));
      W.don.forEach((w) => lay(CELLS.don, w, .5 * side, .38, .36, .04));
      W.tink.forEach((w, i) => lay(CELLS.tink, w, i % 2 ? .55 : -.55, .1 + .12 * (i % 3), .12, i % 2 ? .08 : -.08));
      W.ting.forEach((w, i) => lay(CELLS.ting, w, i % 2 ? .6 : -.6, .5 - .08 * i, .13, i % 2 ? .06 : -.06));
      // MUDA on an arc (seven pulses, 0.25 s apart; the seventh is the last blow)
      { const mw = W.muda[0];
        for (let i = 0; i < 7; i++) {
          const a = (160 - 140 * i / 6) * Math.PI / 180, last = i === 6;
          lay(CELLS.muda, { t: mw.t + i * .25, dur: last ? 1.0 : .9 }, Math.cos(a) * .72, -.05 + Math.sin(a) * .62, last ? .32 : .22, (a - Math.PI / 2) * -.35, last ? [1, .97, .82] : null);
        } }
      for (let i = si; i < sprites.length; i++) sprites[i].set(0, 0, .1, 0, 0);
      // TBC arrow: slides in from the left 14.7-15.4 (ease-out), holds, melts away as the credit takes over (15.6-16.2)
      if (tbc) {
        const tw = W.tbc[0], u = (t - tw.t) / tw.dur;
        if (u < 0 || t > 16.2) tbc.set(0, 0, .1, 0, 0);
        else {
          const hh = .15, wd = hh * 1024 / 384, x0 = -(asp + wd), x1 = -(asp - wd - .08);
          const ex = lerp(x0, x1, ease3(clamp(u))), shrink = 1 - .35 * sm(15.6, 16.0, t), yy = .62;
          const cx = placeAway(sealBox, ex, yy, wd * shrink, hh * shrink, asp);
          tbc.set(cx / asp, yy, hh * shrink, 0, 1 - sm(15.7, 16.2, t), null);
        }
      }
    }
  }

  function dispose() {
    inst.dispose(); gild.dispose(); plaster.dispose();
    for (const m of [uber, cosmos]) { m.geometry.dispose(); m.material.dispose(); }
    sprites.forEach((s) => s.dispose()); tbc?.dispose(); atlasTex?.dispose(); tbcTex?.dispose();
  }
  return { group, update, dispose };
}
