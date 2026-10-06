// THE DARK MATTER THIEVES (E14): Boros-seal (leader, 0.72 x hero) and four grunts (0.55 x hero), all COSTUMED SEALS (law L6b).
//
// Seats (seal-local polar, az off the seal's front, + toward its left; r in hero-metres), chosen OUTSIDE the camera law's front wedge
// (az -0.7..1.05) and the home wedge (az pi +- 0.4), and a live per-frame occlusion pass moves any seal that would stand between
// the lens and the hero (law L2: nothing between lens and seal at any frame).
//
// Beat sheet, bible frames at 24 fps relative to the punch TP = f94 (all pure functions of the clock):
//   f0-93   guard: grunts aim blasters at the hero, weapon sway on twos; the leader stands, arms folded, chin up, eyes half-lidded
//   hull born (f41) grunts point UP at the hull (blaster pitch -0.9 rad over 0.6 s); f55-93 they tremble (terror 0..0.6)
//   f94-97  recoil on ones (k 0 to 1 in 3 drawings), blasters DROP (a falling copy takes over, lies where it lands), leader's eyes
//           go to white slits and his mouth opens (teeth)
//   wave    the pressure wave reaches 2 m at f96 and 5 m at f104: hit(d) = f96 + (d - 2) 8/3 frames (about 2.7 frames per metre);
//           each seal is thrown along the ring normal (away from the hero) by `dist` m, tumbling on twos, arc height H
//   f126-132 land (staggered), a one-drawing dust puff #96866c, a squash, then 'fallen' flat (grunts)
//   f136+   leader kneels (armour cracked, hair settled) looking up at the hole (awe); f140 one thief waves a white flag
// Flight model: s = clamp((t - hit)/(land - hit)); horizontal = dist (1 - (1-s)^1.7) (blast then drag), y = H 4 s (1 - s),
// tumble = -spins 2 pi s about the horizontal axis normal to the throw (backward flips; whole turns so it lands upright).
import { F, sm, win, clamp01 } from "./timeline.js";

const SEATS = [
  { id: "boros", az: -0.95, r: 6.0, kick: 0.0, dist: 4.0, H: 2.4, spins: 1, landF: 128 },
  { id: "gruntA", az: 1.3, r: 4.3, kick: 0.45, dist: 3.0, H: 1.5, spins: 2, landF: 126, flag: true },
  { id: "gruntB", az: 1.95, r: 5.4, kick: -0.35, dist: 4.6, H: 2.0, spins: 1, landF: 130 },
  { id: "gruntC", az: -1.55, r: 4.7, kick: -0.6, dist: 2.2, H: 1.2, spins: 2, landF: 128 },
  { id: "gruntD", az: -2.2, r: 5.6, kick: 0.5, dist: 5.0, H: 2.4, spins: 1, landF: 132 },
];
const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };

export function buildVictims(ctx, T, P, frame, specs) {
  const { THREE, engine, kit } = ctx;
  const group = new THREE.Group();
  const S0 = frame.sc, y0 = frame.at[1];
  const vs = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = { q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), a: new THREE.Vector3(), c: new THREE.Vector3(), s: new THREE.Vector3(), o: new THREE.Vector3(), ax: new THREE.Vector3() };

  for (const seat of SEATS) {
    const spec = specs[seat.id], leader = seat.id === "boros";
    const sc = S0 * spec.scale;
    const [px, , pz] = frame.toWorld(Math.sin(seat.az) * seat.r, 0, Math.cos(seat.az) * seat.r);
    const yaw0 = Math.atan2(frame.at[0] - px, frame.at[2] - pz); // face the hero
    let ox = px - frame.at[0], oz = pz - frame.at[2];
    const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
    const ck = Math.cos(seat.kick), sk = Math.sin(seat.kick); // thrown along the ring normal, kicked by `kick`
    const dx = ox * ck - oz * sk, dz = ox * sk + oz * ck;
    const v = kit.costumedSeal(engine, { ...spec, scale: sc });
    const cy = 0.4 * sc;
    v.group.position.set(0, -cy, 0);
    const pivot = new THREE.Group();
    pivot.add(v.group);
    group.add(pivot);
    const V = { seat, leader, spec, v, pivot, sc, cy, px, pz, yaw0, dx, dz, d: seat.r, ex: {} };

    // ---- the blaster: the kit's weapon is props.children[0] (no hat, no accessories); a lens on one, a falling copy for the drop
    if (spec.weapon) {
      V.weapon = v.props.children[0];
      V.tilt0 = spec.weapon.tilt?.[0] ?? 0;
      const addLens = (w) => { if (spec._lens) w.add(P.solid(new THREE.SphereGeometry(0.02, 10, 8), spec._lens, "#8a2a2a", { pos: [0, 0.07, 0.13], lineMul: 0.5 })); };
      addLens(V.weapon);
      V.drop = kit.WEAPONS.pistol(engine, { col: "#2a2c40" });
      addLens(V.drop);
      V.drop.scale.setScalar(sc); V.drop.visible = false; ctx.setLayer(V.drop, 1);
      group.add(V.drop);
      const gx = (spec.weapon.hand === "l" ? -0.27 : 0.27) * sc, gy = 0.28 * sc, gz = 0.25 * sc, c = Math.cos(yaw0), s = Math.sin(yaw0);
      V.hand = [px + gx * c + gz * s, y0 + gy, pz - gx * s + gz * c];
    }

    if (!leader) {
      // ---- goggled hood #3a3d56 (a cap whose rim sits at y 0.64, clear of the eyes), lenses #f2c94c pushed up on it, a strap; the 1 tuft is the hair
      const hood = new THREE.Group();
      hood.add(P.solid(new THREE.SphereGeometry(0.285, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), "#3a3d56", "#1f2133", { pos: [0, 0.57, 0.03], lineMul: 1 }));
      hood.add(P.solid(new THREE.TorusGeometry(0.283, 0.015, 6, 28).rotateX(Math.PI / 2), "#1f2133", "#0e0f18", { pos: [0, 0.665, 0.03], lineMul: 0.5 }));
      for (const s of [1, -1]) {
        hood.add(P.solid(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 16).rotateX(Math.PI / 2), "#f2c94c", "#a8841c", { pos: [s * 0.1, 0.705, 0.292], rot: [-0.3, 0, 0], lineMul: 0.7 }));
        hood.add(P.solid(new THREE.TorusGeometry(0.066, 0.011, 6, 18), "#1f2133", "#0e0f18", { pos: [s * 0.1, 0.705, 0.3], rot: [-0.3, 0, 0], lineMul: 0.5 }));
      }
      v.props.add(hood);
    } else {
      // ---- the leader: 2 pairs of shoulder spikes, the violet core gem with its star glint, the glowing ring-collar, the open mouth, armour cracks
      for (const s of [1, -1]) {
        v.props.add(P.solid(new THREE.ConeGeometry(0.05, 0.22, 8), "#aab0c8", "#5f6480", { pos: [s * 0.34, 0.57, -0.02], rot: [0, 0, -s * 0.5], lineMul: 1.2 }));
        v.props.add(P.solid(new THREE.ConeGeometry(0.036, 0.15, 8), "#aab0c8", "#5f6480", { pos: [s * 0.22, 0.56, -0.12], rot: [-0.35, 0, -s * 0.28], lineMul: 1.2 }));
      }
      v.props.add(P.solid(new THREE.SphereGeometry(0.045, 14, 10), "#8b5fd0", "#4a2f8a", { pos: [0, 0.3, 0.335], lineMul: 0.8 }));
      const glint = new THREE.Group();
      for (const [w, h] of [[0.07, 0.01], [0.01, 0.07]]) glint.add(P.solid(new THREE.BoxGeometry(w, h, 0.004), "#e6d8ff", "#e6d8ff", { hull: false }));
      glint.position.set(-0.013, 0.318, 0.384); v.props.add(glint);
      const ring = P.solid(new THREE.TorusGeometry(0.27, 0.022, 8, 28).rotateX(Math.PI / 2), "#c0121f", "#7a0a14", { pos: [0, 0.42, 0.01], lineMul: 0.8 });
      ring.userData.mat.uniforms.uEmit.value.setRGB(0.6, 0.04, 0.07); // the dark-matter engine glows (energy only; the fur never does)
      v.props.add(ring);
      const f = kit.faceOnHead(HEAD, 0, 0.452, 0.012);
      const mouth = new THREE.Group();
      mouth.add(P.solid(new THREE.SphereGeometry(0.036, 12, 8), "#4a0a14", "#2a0508", { hull: false, scale: [1.35, 0.95, 0.4] }), P.solid(new THREE.BoxGeometry(0.05, 0.009, 0.006), "#ffffff", "#d8d4e0", { hull: false, pos: [0, 0.018, 0.012] }));
      mouth.position.copy(f.p); mouth.lookAt(f.p.clone().add(f.n)); mouth.visible = false;
      v.props.add(mouth); V.ex.mouth = mouth;
      const cracks = new THREE.Group();
      const zAt = (x, y) => 0.07 + 0.25 * Math.sqrt(Math.max(0, 1 - (x / 0.31) ** 2 - ((y - 0.3) / 0.22) ** 2)) + 0.007;
      for (const pts of [[[-0.02, 0.31], [-0.07, 0.35], [-0.06, 0.4], [-0.13, 0.43], [-0.16, 0.47]], [[0.02, 0.29], [0.06, 0.24], [0.05, 0.19], [0.12, 0.15]], [[-0.03, 0.28], [-0.1, 0.25], [-0.17, 0.26], [-0.2, 0.21]]])
        for (let i = 0; i + 1 < pts.length; i++) cracks.add(P.stroke([pts[i][0], pts[i][1], zAt(...pts[i])], [pts[i + 1][0], pts[i + 1][1], zAt(...pts[i + 1])], 0.0075));
      cracks.visible = false; v.props.add(cracks); V.ex.cracks = cracks;
    }
    // ---- one-drawing dust puff where it lands
    V.dust = P.dustPuff(0.55); V.dust.visible = false; group.add(V.dust);
    // ---- the white flag (one thief, f140): a pole and a 6-column cloth strip waving on twos
    if (seat.flag) {
      const flag = new THREE.Group();
      flag.add(P.solid(new THREE.CylinderGeometry(0.01, 0.012, 0.8, 8), "#8a6a44", "#4a3822", { pos: [0, 0.4, 0], lineMul: 0.6 }));
      const COLS = 6, W = 0.3, H = 0.18, Nv = COLS * 12;
      const fg = new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(Nv * 3), 3));
      fg.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(Nv * 3), 3));
      ctx.sdf.painted(fg, ctx.sdf.paint("#ffffff", "#a8aec6", { line: 1 }));
      const cloth = engine.figure(fg, { lineMul: 0.6, constant: true });
      cloth.frustumCulled = false; cloth.children.forEach((c) => { c.frustumCulled = false; });
      flag.add(cloth); P.own(fg);
      flag.visible = false; group.add(flag);
      V.flag = { g: flag, fg, COLS, W, H };
    }
    ctx.setLayer(pivot, 1); ctx.setLayer(V.dust, 1); if (V.flag) ctx.setLayer(V.flag.g, 1);
    vs.push(V);
  }

  // slit eyes (white, no iris) for the leader's recoil; restore the style's iris otherwise (the kit's expression pass owns the rest)
  function slits(V, on) {
    for (const e of V.v.eyes?.userData.eyes ?? []) {
      const u = e.material.uniforms, st = e.material.userData.style;
      if (on) { u.uIrisS.value.set(0.0001, 0.0001); u.uOpen.value = 0.38; u.uHL.value = 0; u.uPupilS.value = 0.0001; }
      else u.uIrisS.value.set(st.irisScale, st.irisScale);
    }
  }

  // keep every seal out of the segment lens -> hero chest (live camera; a pure function of the camera, so scrubs match plays)
  function avoid(V, pos) {
    const cam = ctx.player.camera.position;
    ctx.seal.chest(tmp.c); tmp.s.copy(tmp.c).sub(cam);
    const L2 = tmp.s.lengthSq();
    if (L2 < 1e-6) return;
    tmp.a.set(pos[0], pos[1] + V.cy, pos[2]);
    const s = tmp.a.clone().sub(cam).dot(tmp.s) / L2;
    if (s < 0.02 || s > 0.98) return;
    tmp.o.copy(tmp.a).sub(cam.clone().addScaledVector(tmp.s, s));
    const dist = tmp.o.length(), R = 0.55 * S0 + 0.5 * V.sc;
    if (dist >= R) return;
    tmp.o.y = 0;
    let len = tmp.o.length();
    if (len < 1e-3) { tmp.o.set(-tmp.s.z, 0, tmp.s.x); len = tmp.o.length() || 1; }
    const push = (R - dist) * sm(s / 0.12) * sm((1 - s) / 0.12);
    pos[0] += (tmp.o.x / len) * push; pos[2] += (tmp.o.z / len) * push;
  }

  function update(t, dt, cue) {
    const { TP, at, born } = T;
    const strike = cue.t >= TP && cue.t < TP + 4 / F;
    const tt = strike ? cue.t : t; // recoil is drawn on ones
    for (let i = 0; i < vs.length; i++) {
      const V = vs[i], { seat, leader, v } = V;
      const hitT = at(96 + (V.d - 2) * (8 / 3)), landT = Math.max(hitT + 0.4, at(seat.landF));
      const s = clamp01((tt - hitT) / (landT - hitT));
      const D = seat.dist * S0, sh = 1 - Math.pow(1 - s, 1.7);
      const pos = [V.px + V.dx * D * sh, y0 + seat.H * S0 * 4 * s * (1 - s), V.pz + V.dz * D * sh];
      avoid(V, pos);
      V.pivot.position.set(pos[0], pos[1] + V.cy, pos[2]);
      tmp.q1.setFromAxisAngle(up, V.yaw0);
      tmp.q2.setFromAxisAngle(tmp.ax.set(V.dz, 0, -V.dx).normalize(), -seat.spins * Math.PI * 2 * s);
      V.pivot.quaternion.multiplyQuaternions(tmp.q2, tmp.q1);

      // ---- phase
      const flying = tt >= hitT && tt < landT, down = tt >= landT;
      const sway = 0.03 * Math.sin(t * 5 + i * 1.7); // twos
      if (tt < TP) {
        if (leader) { v.react("none", 0); v.setPose("salute", 1); v.expression("calm", 0.9); }
        else {
          const tr = sm(win(tt, born + 0.3, TP)) * 0.6;
          v.react("none", 0);
          if (tr > 0) v.react("terror", tr);
        }
      } else if (tt < hitT) {
        v.react("recoil", win(tt, TP, TP + 3 / F));
      } else if (flying) {
        v.react("terror", 1); v.setPose("blown", 0.25);
      } else {
        const f = sm(win(tt, landT, landT + 0.25));
        if (leader) {
          const kn = sm(win(tt, at(136), at(136) + 0.5));
          v.react("fallen", f * (1 - kn));
          if (kn > 0) { v.setPose("kneel", kn); v.expression("awe", Math.max(kn, 0.3)); }
        } else v.react("fallen", f);
        const pulse = Math.sin(Math.PI * win(tt, landT, landT + 0.3)) * 0.8;
        if (pulse > 0 && f < 1) v.setPose("kneel", pulse);
      }
      // blaster: aimed at the hero, raised toward the hull once it is born, trembling after; dropped at the strike
      if (V.weapon) {
        const raise = -0.9 * sm(win(tt, born, born + 0.6));
        const tremble = tt < TP ? Math.sin(t * 31 + i) * 0.02 * sm(win(tt, born + 0.4, TP)) : 0;
        V.weapon.rotation.x = V.tilt0 + raise + (tt < TP ? sway : 0) + tremble;
        V.weapon.visible = tt < TP;
        const tau = Math.max(0, tt - TP), g = 9.8;
        const hy = V.hand[1] - y0, tL = Math.sqrt(2 * Math.max(0.01, hy - 0.02) / g), tc = Math.min(tau, tL);
        V.drop.visible = tt >= TP;
        V.drop.position.set(V.hand[0] + Math.sin(V.yaw0) * 0.15 * tc, y0 + Math.max(0.02, hy - 0.5 * g * tc * tc), V.hand[2] + Math.cos(V.yaw0) * 0.15 * tc);
        V.drop.rotation.set(tau < tL ? 5 * tau : 0.25, V.yaw0, tau < tL ? 0 : Math.PI / 2);
      }
      // hair streams trailing the throw
      if (v.hair) {
        const env = sm(win(tt, hitT, hitT + 0.15)) * (1 - sm(win(tt, landT - 0.1, landT + 0.1)));
        P.rotAbout(v.hair, HEAD.c, 0.45 * env);
      }
      if (leader) { V.ex.mouth.visible = tt >= TP && tt < landT; V.ex.cracks.visible = tt >= hitT; }
      v.update(tt);
      if (leader) {
        slits(V, tt >= TP && tt < TP + 4 / F); // f94-97: eyes to white slits
        if (tt >= at(136)) for (const e of v.eyes?.userData.eyes ?? []) e.material.uniforms.uLook.value.set(0, 0.45); // looking up at the hole
      }
      // dust puff at the landing spot
      const dk = win(tt, landT, landT + 0.3);
      V.dust.position.set(V.px + V.dx * D, y0, V.pz + V.dz * D);
      V.dust.userData.show(dk, V.sc / 0.8);
      // the white flag, planted beside the downed thief at f140
      if (V.flag) {
        const k = sm(win(tt, at(140), at(140) + 0.2));
        V.flag.g.visible = k > 0 && down;
        if (V.flag.g.visible) {
          V.flag.g.position.set(V.px + V.dx * D + V.dz * 0.18 * S0, y0, V.pz + V.dz * D - V.dx * 0.18 * S0);
          V.flag.g.rotation.y = V.yaw0; V.flag.g.scale.setScalar(S0 * k);
          const { fg, COLS, W, H } = V.flag, pa = fg.attributes.position;
          let n = 0;
          const pt = (c, r) => { const u = c / COLS; return [u * W, 0.78 - r * H, Math.sin(t * 14 - u * 6) * 0.05 * u]; };
          for (let c = 0; c < COLS; c++) {
            const a = pt(c, 0), b = pt(c + 1, 0), cc = pt(c, 1), d = pt(c + 1, 1);
            for (const p of [a, cc, b, b, cc, d, a, b, cc, b, d, cc]) pa.setXYZ(n++, p[0], p[1], p[2]);
          }
          pa.needsUpdate = true; fg.computeVertexNormals(); fg.attributes.normal.needsUpdate = true;
        }
      }
    }
  }
  return { group, update, dispose() { for (const V of vs) V.v.dispose(); } };
}
