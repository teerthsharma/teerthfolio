// IMPACTS (bible 3.8, 3.12, 6, 7): every sprite-and-beam effect that is a burst, drawn as a pure function of the stepped clock.
//   hits      per storm arrow at the turn: 8-spike star 2 f, ring + ink twin 6 f, 7 sparks, 5 debris, 3 dust puffs on twos  (+ the heavy train hit f109)
//   rival ray charge ball f115-f120 (ball #f6fcff in an ink hull), muzzle ring, the ray (core #d6f3ff in sheath #7cc2ff) out, bounced, back, rival hit
//   pop       f248: 2 frame star, two ring pairs (white over ink), 56 triangle shards, the surviving Betti-1 ring (egg 6)
//   lattice   the bubble's lattice bars (#d7ecff, 0.3 m cells, clipped to GRID_R 1.38) and the gold ring marking the 0.35 m hole
// Maths:
//   a ring of radius r in the billboard quad has half-extent r / 0.86 (the shader draws it at 0.86 of the half-extent);
//   spark / debris ballistics  p = H + v a - 0.5 g a^2 ;  shards  p = C + dir v (1 - e^{-3.2 a}) / 3.2   (drag 3.2 /s);
//   the beam is a head/tail window on the straight line M -> H, 7 m long: head h = a / 0.22 out, then reflected: sh = 1 - (a - 0.22) / 0.28.
import { HEX, rgb, hash, smooth, clamp, lerp, easeOut, makeSprites, makeStrips } from "./util.js";
import { stormSpec, SHELL_R } from "./arrows.js";

export default function build(ctx, env) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const spr = makeSprites(THREE, 1800, { order: 5 });
  const beam = makeStrips(THREE, 64, { mode: "beam", order: 6, uniforms: { uCore: { value: new THREE.Color(HEX.rayCore) } } });
  group.add(spr.mesh, beam.mesh);
  const C = {
    white: rgb(THREE, "#ffffff"), ring: rgb(THREE, HEX.white), spark: HEX.spark.map((h) => rgb(THREE, h)), shard: HEX.shard.map((h) => rgb(THREE, h)),
    dA: rgb(THREE, HEX.debrisA), dB: rgb(THREE, HEX.debrisB), dust: rgb(THREE, HEX.dust), ink: rgb(THREE, HEX.ink), gold: rgb(THREE, HEX.gold), outlier: rgb(THREE, HEX.outlier),
    lat: rgb(THREE, HEX.lattice), sheath: rgb(THREE, HEX.raySheath), ball: rgb(THREE, HEX.rayBall), muzzle: rgb(THREE, HEX.muzzle),
  };
  const spec = stormSpec();
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), H = new THREE.Vector3(), M = new THREE.Vector3(), R0 = new THREE.Vector3(), Hh = new THREE.Vector3(), W = new THREE.Vector3();

  // a ring pair: ink twin first (it sits behind), then the white fill. rad in metres, age 0..1 for the fade
  const ringPair = (x, y, z, rad, k, c = C.ring, fade = 0.55) => {
    const al = 1 - smooth(fade, 1, k), half = rad / 0.86;
    spr.add(2, x, y, z, half * 1.02, k, 0, C.ink[0], C.ink[1], C.ink[2], al);
    spr.add(1, x, y, z, half, k, 0, c[0], c[1], c[2], al);
  };
  const star = (x, y, z, r, c = C.white) => spr.add(0, x, y, z, r, 0, 0, c[0], c[1], c[2], 1);

  // one burst of the storm's kind at point P along direction u (unit), a seconds after the turn
  function burst(P, u, a, sc, seed, big = 1) {
    if (a < 0 || a > 0.75) return;
    if (a < 2 / 24) star(P.x, P.y, P.z, 0.45 * sc * big);                       // 2-frame hard white 8-spike star
    if (a < 0.25) { const k = a / 0.25; ringPair(P.x, P.y, P.z, sc * big * (0.15 + 0.95 * easeOut(k)), k); } // ring 6 f, ink twin
    for (let i = 0; i < 7; i++) {                                                   // 7 sparks
      const life = 0.35; if (a > life) break;
      const px = hash(seed + i * 3.3) * 2 - 1, py = hash(seed + i * 5.1) * 2 - 1, pz = hash(seed + i * 7.9) * 2 - 1;
      const sp = 2.5 + hash(seed + i * 9.7) * 3.5;
      const x = P.x + (u[0] * sp + px * 3) * a, y = P.y + (u[1] * sp + py * 3) * a - 4.9 * a * a, z = P.z + (u[2] * sp + pz * 3) * a;
      const c = C.spark[i % 3];
      spr.add(3, x, y, z, 0.05 * sc * big, a / life, hash(seed + i) * 6.28, c[0], c[1], c[2], 1 - smooth(0.5, 1, a / life));
    }
    for (let i = 0; i < 5; i++) {                                                   // 5 debris, falling
      const life = 0.65; if (a > life) break;
      const px = hash(seed + 31 + i * 3.3) * 2 - 1, pz = hash(seed + 37 + i * 7.9) * 2 - 1;
      const sp = 1.5 + hash(seed + 41 + i) * 2.5;
      const x = P.x + (u[0] * sp + px * 2) * a, y = P.y + (u[1] * sp + 1.5) * a - 4.9 * a * a, z = P.z + (u[2] * sp + pz * 2) * a;
      const c = i % 2 ? C.dA : C.dB;
      spr.add(4, x, y, z, (0.05 + 0.05 * hash(seed + i * 2)) * sc * big, a / life, a * 6 + i, c[0], c[1], c[2], 1 - smooth(0.7, 1, a / life));
    }
    for (let i = 0; i < 3; i++) {                                                   // 3 dust puffs, 0.8 m, on twos (t is already stepped)
      const life = 0.7; if (a > life) break;
      const k = a / life, ox = (hash(seed + 53 + i) * 2 - 1) * 0.4, oz = (hash(seed + 59 + i) * 2 - 1) * 0.4;
      spr.add(5, P.x + ox * sc, P.y + (0.25 + 0.5 * k) * sc, P.z + oz * sc, (0.2 + 0.2 * easeOut(k)) * sc * big, k, hash(seed + i), C.dust[0], C.dust[1], C.dust[2], 0.95);
    }
  }

  function update(t) {
    const T = env.T, F = env.F, sc = F.sc();
    const chest = F.chest(env.v1);
    spr.begin(); beam.begin();
    spr.mat.uniforms.uSc.value = sc; spr.mat.uniforms.uGridR.value = 1.38;

    // ---- the storm's turns, one burst each at the skin of radius R ----
    for (const s of spec) {
      const a = t - s.th; if (a < 0 || a > 0.75) continue;
      H.set(chest.x + s.u[0] * SHELL_R * sc, chest.y + s.u[1] * SHELL_R * sc, chest.z + s.u[2] * SHELL_R * sc);
      burst(H, s.u, a, sc, s.i * 17.3, 1);
    }
    // the heavy train hit f109: a double burst at a fixed skin direction (the impact frame itself is a beat, not drawn here)
    {
      const a = t - T.hit, u = [Math.cos(2.4) * 0.8, 0.5, Math.sin(2.4) * 0.8];
      H.set(chest.x + u[0] * SHELL_R * sc, chest.y + u[1] * SHELL_R * sc, chest.z + u[2] * SHELL_R * sc);
      burst(H, u, a, sc, 991, 1.9);
    }

    // ---- the rival ray (bible 6): charge f115-f120, fire f120, out, bounce at the skin, back, hit ----
    F.toWorld(3.3, 0, -5.2, R0);
    {
      const toS = W.set(chest.x - R0.x, 0, chest.z - R0.z).normalize();
      M.set(R0.x + toS.x * 0.55 * sc, R0.y + 0.85 * sc, R0.z + toS.z * 0.55 * sc);          // muzzle
      const dir = Hh.copy(M).sub(chest).normalize();
      Hh.set(chest.x + dir.x * SHELL_R * sc, chest.y + dir.y * SHELL_R * sc, chest.z + dir.z * SHELL_R * sc); // where the ray meets the skin
      const L = M.distanceTo(Hh), a = t - T.fire;
      const tc = a + 0.21;                                                                    // charge: f115 -> f120
      if (tc >= 0 && a < 0.04) spr.add(7, M.x, M.y, M.z, (0.08 + 0.42 * easeOut(tc / 0.21)) * sc, tc / 0.21, 0, C.ball[0], C.ball[1], C.ball[2], 1);
      if (a >= 0 && a < 0.2) ringPair(M.x, M.y, M.z, (0.4 + 0.5 * easeOut(a / 0.2)) * sc, a / 0.2, C.muzzle, 0.4);
      const OUT = 0.22, BACK = 0.28, len = Math.min(7 * sc, L) / L;                          // beam length as a fraction of the path
      const P = (s, out) => out.set(lerp(M.x, Hh.x, s), lerp(M.y, Hh.y, s), lerp(M.z, Hh.z, s));
      const draw = (s0, s1) => {                                                      // a tapered 6-piece strip between path fractions s0 < s1
        if (s1 - s0 < 1e-3) return;
        const w = 0.34 * sc, K = 6, A = tA, B = tB;
        for (let i = 0; i < K; i++) {
          const f0 = i / K, f1 = (i + 1) / K;
          P(lerp(s0, s1, f0), A); P(lerp(s0, s1, f1), B);
          const tp = (f) => 0.35 + 0.65 * Math.sin(Math.PI * clamp(f));                // tapered at both ends
          beam.seg(A.x, A.y, A.z, B.x, B.y, B.z, w * tp(f0), w * tp(f1), f0, f1, 1, C.sheath[0], C.sheath[1], C.sheath[2]);
        }
      };
      if (a >= 0 && a < OUT) { const h = a / OUT; draw(clamp(h - len), h); }                         // incoming
      else if (a >= OUT && a < OUT + BACK) {
        const st = clamp(1 - len + (a - OUT) / OUT * len);                                                  // the incoming tail still arriving
        if (st < 1) draw(st, 1);
        const sh = 1 - (a - OUT) / BACK;                                                                    // the reflected head, going home
        draw(sh, Math.min(1, sh + len));
      } else if (a >= OUT + BACK && a < OUT + BACK + 0.08) { const sh = 0; draw(sh, Math.min(1, len * (1 - (a - OUT - BACK) / 0.08))); }
      // CHANG at the skin (f126) and the hit on the rival (f132)
      burst(Hh, [dir.x, dir.y, dir.z], a - OUT, sc, 4141, 1.2);
      W.set(R0.x, R0.y + 0.6 * sc, R0.z);
      burst(W, [-dir.x, 0.2, -dir.z], a - OUT - BACK, sc, 5252, 1.4);
    }

    // ---- the bubble's lattice and the Betti-1 hole ring ----
    if (env.gridOn && t >= T.grid) {
      const B = env.B, al = smooth(T.grid, T.grid + 0.35, t) * (t >= T.pop ? 1 - smooth(T.pop, T.pop + 0.15, t) : 1);
      spr.add(9, B.x, B.y, B.z, 1.43 * sc, 0, 0, C.lat[0], C.lat[1], C.lat[2], al);
      // the hole marker: pale-gold ring r 0.31 m at the loop; it is the surviving class after the pop (egg 6)
      const k0 = smooth(T.grid + 0.4, T.grid + 0.7, t), kp = t >= T.pop ? 1 - smooth(T.pop + 0.6, T.pop + 0.75, t) : 1;
      const al2 = k0 * kp * (t >= T.pop ? 1 : 0.6);
      if (al2 > 0) {
        spr.add(2, B.x, B.y, B.z, 0.36 * sc, 0, 0, C.ink[0], C.ink[1], C.ink[2], al2);
        spr.add(1, B.x, B.y, B.z, 0.34 * sc, 0, 0, C.outlier[0], C.outlier[1], C.outlier[2], al2);
      }
    }

    // ---- the pop (f248): star, two ring pairs, shards ----
    {
      const a = t - T.pop, B = env.B;
      if (a >= 0 && a < 1.0) {
        if (a < 2 / 24) star(B.x, B.y, B.z, 2.0 * sc);
        { const k = a / 0.45; if (k < 1) ringPair(B.x, B.y, B.z, 3.6 * sc * easeOut(k), k, C.ring, 0.5); }
        { const k = (a - 0.06) / 0.6; if (k > 0 && k < 1) ringPair(B.x, B.y, B.z, 6.0 * sc * easeOut(k), k, C.ring, 0.5); }
        for (let i = 0; i < 56; i++) {
          const life = 0.9; if (a > life) break;
          const y = 1 - 2 * (i + 0.5) / 56, rr = Math.sqrt(1 - y * y), ph = i * 2.399963;     // Fibonacci sphere: even directions
          const d = [rr * Math.cos(ph), y, rr * Math.sin(ph)];
          const sp = 3 + 6 * hash(i * 1.7), e = (1 - Math.exp(-3.2 * a)) / 3.2;
          const c = C.shard[i % 4], half = (0.18 + 0.30 * hash(i * 3.1)) * sc * 0.6;
          spr.add(6, B.x + d[0] * sp * e * sc, B.y + d[1] * sp * e * sc, B.z + d[2] * sp * e * sc, half, a / life, i + a * (2 + 4 * hash(i)), c[0], c[1], c[2], 1 - smooth(0.62, 0.9, a));
        }
      }
    }
    spr.end(); beam.end();
  }
  return { group, update, dispose() { spr.dispose(); beam.dispose(); } };
}
