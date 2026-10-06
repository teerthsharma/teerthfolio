// CAST layer for p-aether-lang (Jujutsu Kaisen: Unlimited Void into Hollow Purple, MAPPA). Layer 1, redrawn every step.
// Law L6b: no silhouettes, no Gojo body. The victims are four SMALL COSTUMED SEALS built with costumed-seal-kit:
//   Mahito (the questioner), Hanami, Jogo, Toji. The hero seal is ctx.seal (locked, driven by scene.seal.track); this
//   layer never restyles or covers it.
// Bible: scripts/p-aether-lang.md sections 3.10 to 3.15, 4, 5, 6.10, 7. Timings are the bible's 24 fps frames, written
// as seconds, and every one can be re-pointed by a free cue of the same name from scene.js.
//
// Free cues read (all optional; the default is the bible time):
//   mahito-in  Mahito steps in on twos (f53)           flood   the information flood hits (f55)
//   buckle     Hanami and Jogo buckle (f158)           freeze  the Void pins everyone (f206)
//   thaw       freeze ends (f250)                      raise   Toji raises blades, Jogo kneels, Mahito flinches (10.4 s)
//   lower      Toji lowers blades (17.8 s)             blown   Purple's wind hits, Mahito blown to the core (18.4 s)
//   erase      first victim erased (f442); the others follow at +2, +5, +10 frames, Toji LAST (Hidden Inventory homage)
//   glints     the blindfold glints flare (6.6 s, last 2 s)
//
// ---------------------------------------------------------------------------------------------------------------------
// MATHS
//  Time: every pose is a pure function of the stepped clock ts = floor(t fps)/fps, so a scrub equals a play.
//  ramp(t, t0, d) = smooth(x) with x = clamp((t - t0)/d, 0, 1), smooth(x) = x^2 (3 - 2x).
//  Mahito's step-in is the ENTER squash chain on twos, f = round((ts - tIn) 24): f0 (1.30, 0.50), f2 (0.86, 1.14),
//    f4 (1.05, 0.96), f>=6 (1, 1), as (sxz, sy) multipliers on the group scale (volume ~ sxz^2 sy: the cartoon cheat).
//  Idle sway: x = A sin(1.7 ts), A = 0.03 m, with ts clamped to the freeze time so the sway holds when the flow clock stops.
//  Camera guard (the hero is never covered): with eye E (camera at cue.t), seal chest C, victim body centre V:
//    s = clamp-test((V-E).(C-E) / |C-E|^2 in (0.02, 0.98)), Q = E + s (C-E), d = |V-Q|. If d < need the victim slides
//    horizontally away from the ray by (need - d), need = 0.4 (scale_v + scale_hero) + 0.1 (the two body radii plus a margin).
//    A smooth function of the camera: no popping inside a shot, and nothing ever stands between the lens and the seal.
//  Particles (leaves, embers, sparks): position = origin + v age + drift, age from the stepped clock, deterministic from
//    ctx.rng. Opacity = 1 - age/life. Stepped, so they read as twos.
//  Glint star texture, (u,v) in [-1,1]: a = max( e^(-22|v|) e^(-2.6|u|), e^(-22|u|) e^(-5|v|), e^(-30 r^2) ),
//    rgb = mix(#7fdfff, white, e^(-18 r^2)): a white centre with a cyan rim (bible 3.15).
// ---------------------------------------------------------------------------------------------------------------------

const F = (n) => n / 24; // bible frames at 24 fps -> seconds
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ss = (x) => { x = c01(x); return x * x * (3 - 2 * x); };
const ramp = (t, t0, d) => ss((t - t0) / Math.max(1e-6, d));

const DEF = { mahitoIn: F(53), flood: F(55), buckle: F(158), freeze: F(206), thaw: F(250), raise: 10.4, lower: 17.8, blown: 18.4, erase: F(442), glints: 6.6 };
// Toji is erased last: f442 (Mahito), f444 (Hanami), f447 (Jogo), f452 (Toji, ends f456)
const ERASE_OFF = { mahito: F(0), hanami: F(2), jogo: F(5), toji: F(10) };
const SILHOUETTE = 2 / 24; // the 2-frame white-violet cut (the `01` white-cut look)
const IDS = ["mahito", "hanami", "jogo", "toji"];

export default function build(ctx) {
  const { THREE, engine, kit, sdf } = ctx;
  const { Group, Points, PointsMaterial, BufferGeometry, Float32BufferAttribute, SphereGeometry, ConeGeometry, CylinderGeometry, BoxGeometry, Sprite, SpriteMaterial, DataTexture, AdditiveBlending, DoubleSide, Color } = THREE;
  const group = new Group();
  group.name = "p-aether-lang-cast";
  const heroAt = ctx.scene.seal?.at ?? [0, 0, 0];
  const heroScale = ctx.scene.seal?.scale ?? 1;
  const owned = [];
  const own = (o) => { owned.push(o); return o; };

  const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
  const mkFig = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.8, ink: o.ink, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };
  // a flat decal laid on the head ellipsoid at head-frame (x, y): stitches, scars, the flower
  const decal = (col, x, y, w, h, rot = 0, lift = 0.006) => {
    const f = kit.faceOnHead(HEAD, x, y, lift);
    const m = mkFig(new SphereGeometry(1, 8, 6).scale(w / 2, h / 2, 0.0035), col, col, { lineMul: 0.25, line: 0.6 });
    m.position.copy(f.p);
    m.lookAt(f.p.clone().add(f.n));
    m.rotateZ(rot);
    return m;
  };
  const toLayer1 = (o) => ctx.setLayer(o, 1);
  const tintOf = (root) => { const l = []; root.traverse((o) => { if (o.userData?.mat?.uniforms?.uTint) l.push(o.userData.mat.uniforms); }); return l; };

  // ==================================================================================================================
  // COSTUMES (3.10 to 3.13), the bible's hex. Mahito's are "UNVERIFIED against a frame" in the bible.
  // ==================================================================================================================
  const MAHITO = {
    scale: 0.7, coat: "#aab8c4", shade: "#6f8294", ink: "#1a2530",
    layers: [{ type: "uniform", col: "#2e8a8a", shade: "#145050", collar: false }, { type: "coat", col: "#1d2326", shade: "#0e1214", open: 0.12, collar: true }],
    hair: { preset: "long", count: 7, layers: 1, length: [0.22, 0.42], width: 0.08, spike: 0.85, color: { base: "#5d7a8c", shade: "#38505f", hi: "#a9c4d6" }, cut: { at: [0.35, 0.8], slant: 0.18, rate: 0.9 }, seed: 11 },
    eyes: { style: "tsurime", iris: "#d6b43c", irisLo: "#8a6a1c", pupilCol: "#0a0a0a", lash: "#1a2530" },
  };
  const HANAMI = {
    scale: 0.55, coat: "#cfe8de", shade: "#8fb8a8", ink: "#162616",
    layers: [{ type: "cloak", col: "#3f7a3c", shade: "#254a26", len: 1, collar: true, trim: "#7fb347" }],
    eyes: { style: "tareme", iris: "#3a7a3c", irisLo: "#16381a", pupilCol: "#0a1a0a", lash: "#162616" },
  };
  const JOGO = {
    scale: 0.55, coat: "#3a3436", shade: "#1f1a1c", ink: "#1a1012",
    hair: { preset: "spiky", count: 5, layers: 1, length: [0.2, 0.34], width: 0.085, spike: 1, lift: 0.9, color: { base: "#ff7a1a", shade: "#c2400f", hi: "#ffc23a" }, cut: { at: [0.3, 0.9], slant: 0.2, rate: 1 }, seed: 5 },
    eyes: { style: "slit", iris: "#ff9a2a", irisLo: "#a02a0a", pupilCol: "#1a0a0a", lash: "#1a1012" },
  };
  const TOJI = {
    scale: 0.55, coat: "#d9a58f", shade: "#a56f7a", ink: "#0a0c10",
    layers: [{ type: "uniform", col: "#14151a", shade: "#0a0b10", collar: false }, { type: "sash", col: "#14151a" }],
    hair: { preset: "spiky", count: 5, layers: 1, length: [0.1, 0.17], width: 0.07, spike: 0.7, color: { base: "#1b1f24", shade: "#0a0c10", hi: "#6b7480" }, cut: { at: [0.4, 0.85], slant: 0.15, rate: 0.8 }, seed: 3 },
    eyes: { style: "tsurime", iris: "#2c6a5a", irisLo: "#12342c", pupilCol: "#0a0c10", lash: "#0a0c10" },
  };

  const make = (spec) => { const h = kit.costumedSeal(engine, spec); group.add(h.group); return h; };
  const V = {};

  // Mahito: stitches (forehead seam, two brow ticks, two cheek seams), all #232a30
  {
    const h = make(MAHITO);
    for (const [x, y, w, hh, r] of [[0.0, 0.7, 0.2, 0.012, 0.05], [-0.12, 0.665, 0.07, 0.012, 0.9], [0.12, 0.665, 0.07, 0.012, -0.9], [-0.17, 0.5, 0.1, 0.012, 0.15], [0.17, 0.5, 0.1, 0.012, -0.15]]) h.props.add(decal("#232a30", x, y, w, hh, r));
    toLayer1(h.props);
    V.mahito = { h, pos: [2.2, 0, -3.6], appear: DEF.mahitoIn };
  }
  // Hanami: bark crown with 3 branches and 5 leaf cards, arms raised like branches, the flower at the eye socket
  {
    const h = make(HANAMI);
    const bark = ["#5a3a22", "#2a1a10"], leaf = ["#5fa83c", "#2f6a2a"];
    for (const [x, y, rz, L] of [[0, 0.82, 0, 0.75], [-0.1, 0.8, 0.5, 0.6], [0.1, 0.8, -0.5, 0.6]]) h.props.add(mkFig(new ConeGeometry(0.03, 0.34 * L / 0.6, 7), bark[0], bark[1], { pos: [x, y + 0.14, 0], rot: [0, 0, rz] }));
    for (const [x, y, z, rz, ry] of [[0, 1.02, 0.02, 0.2, 0], [-0.2, 0.96, 0.02, 0.5, 0.3], [0.2, 0.96, 0.02, -0.5, -0.3], [-0.11, 1.0, -0.05, 0.3, 0.9], [0.11, 1.0, -0.05, -0.3, -0.9]])
      h.props.add(mkFig(new SphereGeometry(1, 10, 6).scale(0.085, 0.05, 0.012), leaf[0], leaf[1], { pos: [x, y, z], rot: [0.2, ry, rz], lineMul: 0.6 }));
    for (const s of [1, -1]) {
      h.props.add(mkFig(new ConeGeometry(0.045, 0.42, 7), bark[0], bark[1], { pos: [s * 0.36, 0.62, 0.04], rot: [0, 0, -s * 0.55] }));
      h.props.add(mkFig(new SphereGeometry(1, 8, 5).scale(0.07, 0.04, 0.012), leaf[0], leaf[1], { pos: [s * 0.5, 0.82, 0.04], rot: [0, 0, -s * 0.9], lineMul: 0.5 }));
    }
    h.props.add(decal("#ff7aa8", 0.122, 0.572, 0.075, 0.075, 0, 0.012));
    h.props.add(decal("#fff0a0", 0.122, 0.572, 0.026, 0.026, 0, 0.016));
    toLayer1(h.props);
    V.hanami = { h, pos: [-3.0, 0, -6.5], appear: 2.0 };
  }
  // Jogo: stitched brow, fist alight (3 nested flame tongues); 5 flame-tongue hair comes from the spec
  const jogoFlames = [];
  {
    const h = make(JOGO);
    for (const [x, r] of [[-0.09, 0.4], [0, 0], [0.09, -0.4]]) h.props.add(decal("#1a1012", x, 0.655, 0.05, 0.012, r + Math.PI / 2));
    h.props.add(decal("#1a1012", 0, 0.655, 0.28, 0.01, 0));
    const fist = new Group(); fist.position.set(0.27, 0.3, 0.27);
    for (const [c, s, r, L] of [["#ff7a1a", "#c2400f", 0.075, 0.24], ["#ffc23a", "#ff9a2a", 0.05, 0.18], ["#fff0a0", "#ffd96a", 0.028, 0.11]]) { const f = mkFig(new ConeGeometry(r, L, 8), c, s, { pos: [0, L / 2, 0], lineMul: 0.5 }); fist.add(f); jogoFlames.push(f); }
    h.props.add(fist);
    toLayer1(h.props);
    V.jogo = { h, pos: [4.6, 0, -7.8], appear: 2.1 };
  }
  // Toji: lip scar, two reverse-grip blades #c9d4e6 with a 2 px dark spine
  const blades = [];
  {
    const h = make(TOJI);
    h.props.add(decal("#7a4a4a", 0.045, 0.46, 0.05, 0.008, 0.5));
    for (const s of [1, -1]) {
      const g = new Group(); g.position.set(s * 0.27, 0.28, 0.25); g.userData.side = s;
      const b = kit.WEAPONS.sword(engine, { col: "#c9d4e6", trim: "#3a4260", hilt: "#14182a" });
      b.add(mkFig(new BoxGeometry(0.008, 0.5, 0.012), "#14182a", "#14182a", { pos: [0, 0.4, -0.006], lineMul: 0.3 }));
      b.scale.setScalar(0.62);
      g.add(b); blades.push(g); h.props.add(g);
    }
    toLayer1(h.props);
    V.toji = { h, pos: [-1.4, 0, -9.5], appear: 2.2 };
  }
  // reverse grip: tip down and a little forward, crossed on the centre line; k = 1 raises the tips up and forward
  const poseBlades = (k) => { for (const g of blades) { const s = g.userData.side; g.rotation.set(Math.PI * (0.82 - 0.62 * k), 0, -s * (0.55 - 0.25 * k) * (1 - 0.5 * k)); } };

  // ---- blindfold relic (3.14) and its two cyan glints (3.15) ----
  const band = mkFig(own(new CylinderGeometry(0.25, 0.25, 0.12, 24, 1, true)), "#0b0a1c", "#05040f", { lineMul: 0.7, line: 1.2 });
  band.traverse((o) => { if (o.material) o.material.side = DoubleSide; });
  group.add(band); toLayer1(band);
  const starTex = (() => {
    const N = 64, d = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 2 - 1, v = (j / (N - 1)) * 2 - 1, r2 = u * u + v * v;
      const a = Math.max(Math.exp(-Math.abs(v) * 22) * Math.exp(-Math.abs(u) * 2.6), Math.exp(-Math.abs(u) * 22) * Math.exp(-Math.abs(v) * 5), Math.exp(-r2 * 30));
      const w = Math.exp(-r2 * 18), o = (j * N + i) * 4;
      d[o] = (127 + 128 * w) | 0; d[o + 1] = (223 + 32 * w) | 0; d[o + 2] = 255; d[o + 3] = (c01(a) * 255) | 0;
    }
    const t = new DataTexture(d, N, N); t.needsUpdate = true; return own(t);
  })();
  const glints = [-1, 1].map((s) => {
    const sp = new Sprite(own(new SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending })));
    sp.scale.setScalar(0.001); sp.userData.side = s; sp.visible = false; group.add(sp); toLayer1(sp); return sp;
  });

  // ---- particles: Hanami's 6 leaves, Jogo's embers (6 per second), the erase sparks ----
  const R = ctx.rng("cast-p-aether-lang");
  const rnd = (n) => Array.from({ length: n }, () => [R() * 2 - 1, R(), R() * 2 - 1, R()]);
  const mkPts = (n, col, size, additive) => {
    const geo = own(new BufferGeometry());
    geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(n * 3), 3));
    const mat = own(new PointsMaterial({ color: col, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : THREE.NormalBlending, fog: false }));
    const p = new Points(geo, mat); p.frustumCulled = false; p.visible = false; group.add(p); toLayer1(p);
    return { p, r: rnd(n) };
  };
  const setPts = (P, i, x, y, z) => { const a = P.p.geometry.attributes.position.array; a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; };
  const leaves = mkPts(6, "#7fb347", 0.13, false);
  const embers = mkPts(12, "#ffc23a", 0.06, true);
  const sparks = {};
  for (const id of IDS) sparks[id] = mkPts(28, "#b84dff", 0.075, true);

  // ---- the camera guard (see MATHS) ----
  const guard = (P, sc, cam) => {
    if (!cam?.eye) return [0, 0];
    const E = cam.eye, C = [heroAt[0], heroAt[1] + 0.4 * heroScale, heroAt[2]];
    const ab = [C[0] - E[0], C[1] - E[1], C[2] - E[2]], L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1;
    const Vc = [P[0], P[1] + 0.3 * sc, P[2]];
    const s = ((Vc[0] - E[0]) * ab[0] + (Vc[1] - E[1]) * ab[1] + (Vc[2] - E[2]) * ab[2]) / L2;
    if (s < 0.02 || s > 0.98) return [0, 0];
    const dx = Vc[0] - (E[0] + ab[0] * s), dy = Vc[1] - (E[1] + ab[1] * s), dz = Vc[2] - (E[2] + ab[2] * s);
    const d = Math.hypot(dx, dy, dz), need = 0.4 * (sc + heroScale) + 0.1;
    if (d >= need) return [0, 0];
    let hx = dx, hz = dz; const hl = Math.hypot(hx, hz);
    if (hl < 1e-3) { hx = -ab[2]; hz = ab[0]; const l = Math.hypot(hx, hz) || 1; hx /= l; hz /= l; } else { hx /= hl; hz /= hl; }
    return [hx * (need - d), hz * (need - d)];
  };

  // ---- apply one victim's state ----
  const apply = (id, v, st, ts, cam, M) => {
    const h = v.h, sc = h.scale;
    const vis = ts >= v.appear;
    const e = ts - (M.erase + ERASE_OFF[id]); // seconds since this victim's erase
    h.group.visible = vis && e < SILHOUETTE;
    let sxz = 1, sy = 1;
    if (st.enter) { sxz = st.enter[0]; sy = st.enter[1]; }
    else if (vis) { const a = c01((ts - v.appear) * 8); sxz = 0.86 + 0.14 * a; sy = 1.12 - 0.12 * a; } // 3-frame pop-in on twos
    h.react("", 0); // clears every pose channel, the expression and the tint
    for (const [n, k] of Object.entries(st.poses ?? {})) if (k > 0) h.setPose(n, k);
    h.expression(st.expr ?? "neutral", st.exprK ?? 0);
    if ((st.tintK ?? 0) > 0) h.tint(st.tintCol ?? "#8d8d96", st.tintK);
    if (e >= 0 && e < SILHOUETTE) { h.tint("#e6dcff", 1); h.expression("terror", 1); } // the 2-frame white-violet cut
    const o = st.off ?? [0, 0, 0];
    const [gx, gz] = guard([v.pos[0] + o[0], v.pos[1], v.pos[2] + o[2]], sc, cam);
    h.place(v.pos[0] + o[0] + gx, v.pos[1] + o[1], v.pos[2] + o[2] + gz, 0);
    h.lookAtPoint(heroAt[0], heroAt[2]); // every victim faces the seal
    h.update(ts);
    h.group.scale.set(sc * sxz, sc * sy, sc * sxz);
    return { e, vis };
  };

  const update = (t, dt, cue) => {
    const ts = cue.ts ?? t;
    const mk = (n, d) => { const s = cue.since(n); return Number.isFinite(s) ? cue.t - s : d; };
    const M = { mahitoIn: mk("mahito-in", DEF.mahitoIn), flood: mk("flood", DEF.flood), buckle: mk("buckle", DEF.buckle), freeze: mk("freeze", DEF.freeze), thaw: mk("thaw", DEF.thaw),
      raise: mk("raise", DEF.raise), lower: mk("lower", DEF.lower), blown: mk("blown", DEF.blown), erase: mk("erase", DEF.erase), glints: mk("glints", DEF.glints) };
    const cam = ctx.camera.at(cue.t, ctx.aspect());

    // ---- Mahito: hands behind back and a smile; leans in 0.07 rad at line B; jaw drop and stillness at the freeze; flinch at 10.4; blown at 18.4 ----
    {
      const v = V.mahito, a = Math.round((ts - M.mahitoIn) * 24);
      const enter = a < 0 ? null : a < 2 ? [1.3, 0.5] : a < 4 ? [0.86, 1.14] : a < 6 ? [1.05, 0.96] : null;
      const fl = ts - M.raise, flinch = fl > 0 && fl < 0.5 ? Math.sin(Math.PI * fl / 0.5) * 0.6 : 0;
      const bl = ramp(ts, M.blown, 0.8);
      const poses = { bow: 0.12 * ramp(ts, M.buckle, 0.8) * (1 - ramp(ts, M.freeze, 0.3)), recoil: Math.max(flinch, 0.35 * ramp(ts, M.freeze, 0.2) * (1 - bl)), blown: bl };
      let expr = "smug", k = 0.8;
      if (ts >= M.blown) { expr = "terror"; k = 1; } else if (ts >= M.raise) { expr = flinch > 0 ? "terror" : "awe"; k = flinch > 0 ? 0.9 : 0.7; } else if (ts >= M.freeze) { expr = "awe"; k = ramp(ts, M.freeze, 0.2); }
      apply("mahito", v, { enter, poses, expr, exprK: k, off: [Math.sin(Math.min(ts, M.freeze) * 1.7) * 0.03, 0, 0] }, ts, cam, M);
    }
    // ---- Hanami: rooted; leans back 0.25 rad at the flood; buckles; freezes; sheds 6 leaves ----
    {
      const v = V.hanami, fz = ramp(ts, M.freeze, 0.3), bl = ramp(ts, M.blown, 0.5);
      const poses = { recoil: 0.38 * ramp(ts, M.flood, 0.5) * (1 - 0.4 * bl), kneel: 0.55 * ramp(ts, M.buckle, M.freeze - M.buckle), stagger: 0.6 * bl };
      const frozen = ts >= M.freeze;
      const r = apply("hanami", v, { poses, expr: frozen ? "terror" : "neutral", exprK: frozen ? 0.9 : 0.35 * ramp(ts, M.flood, 0.4), tintCol: "#8d8d96", tintK: 0.3 * fz * (1 - ramp(ts, M.thaw, 0.4)) }, ts, cam, M);
      const lt = Math.min(Math.max(ts - M.buckle, 0), M.freeze - M.buckle) + Math.max(ts - M.thaw, 0); // the drift pauses through the freeze
      leaves.p.visible = r.vis && ts >= M.buckle && r.e < SILHOUETTE;
      leaves.r.forEach((q, i) => {
        const age = Math.min(Math.max(lt - q[3] * 0.9, 0), 2.4);
        setPts(leaves, i, v.pos[0] + q[0] * 0.5 + Math.sin(age * 3 + i) * 0.1, v.pos[1] + 0.55 - age * 0.28 - q[1] * 0.1, v.pos[2] + q[2] * 0.4);
      });
      leaves.p.geometry.attributes.position.needsUpdate = true;
    }
    // ---- Jogo: crouched, fist alight; the flame gutters to violet #8a5cff as the void closes; kneels at 10.4 ----
    {
      const v = V.jogo, gut = ramp(ts, M.buckle, M.freeze - M.buckle), bl = ramp(ts, M.blown, 0.5);
      const frozen = ts >= M.freeze;
      const poses = { terror: 0.25 * ramp(ts, M.flood, 0.4), kneel: Math.max(0.5 * ramp(ts, M.buckle, M.freeze - M.buckle), ramp(ts, M.raise, 0.4)), stagger: 0.7 * bl };
      const r = apply("jogo", v, { poses, expr: frozen ? "terror" : "rage", exprK: frozen ? 0.9 : 0.5 }, ts, cam, M);
      const violet = [new Color("#8a5cff"), new Color("#b89eff"), new Color("#efe4ff")];
      jogoFlames.forEach((f, i) => {
        const s = 1 - 0.35 * gut;
        f.scale.set(s, (1 + 0.22 * Math.sin(ts * 21 + i * 2.1) * (1 - 0.6 * gut)) * s, s); // tongues flicker on twos, shrink as they gutter
        for (const u of tintOf(f)) { u.uTint.value.copy(violet[i]); u.uTintAmt.value = gut * 0.9; }
      });
      if (v.h.hair) for (const u of tintOf(v.h.hair)) { u.uTint.value.set("#8a5cff"); u.uTintAmt.value = gut * 0.8; } // egg 7: his flame hair turns violet
      embers.p.visible = r.vis && r.e < SILHOUETTE;
      embers.p.material.color.set("#ffc23a").lerp(violet[0], gut);
      embers.r.forEach((q, i) => {
        const age = (((ts * 0.5 + q[3]) % 1) + 1) % 1 * 2; // life 2 s, 12 particles = 6 per second
        setPts(embers, i, v.pos[0] + 0.13 + q[0] * 0.08 + Math.sin(age * 2 + i) * 0.05, 0.18 + age * 0.35, v.pos[2] + q[2] * 0.08);
      });
      embers.p.geometry.attributes.position.needsUpdate = true;
    }
    // ---- Toji: low stance, blades crossed; raised at 10.4; lowered at 17.8; erased LAST ----
    {
      const up = ramp(ts, M.raise, 0.25) * (1 - ramp(ts, M.lower, 0.3));
      poseBlades(up);
      apply("toji", V.toji, { poses: { kneel: 0.22 * (1 - up * 0.5), stagger: 0.4 * ramp(ts, M.blown, 0.5) }, expr: "calm", exprK: 0.8 - 0.4 * up }, ts, cam, M);
    }
    // ---- erase sparks: violet #b84dff on twos after the 2-frame white-violet cut ----
    for (const id of IDS) {
      const S = sparks[id], v = V[id], e = ts - (M.erase + ERASE_OFF[id]) - SILHOUETTE;
      S.p.visible = e >= 0 && e < 1.0;
      if (!S.p.visible) continue;
      const sc = v.h.scale;
      S.r.forEach((q, i) => {
        const a = q[0] * Math.PI, sp = (0.35 + q[3] * 0.9) * sc * 2.8;
        setPts(S, i, v.pos[0] + Math.cos(a) * sp * e, v.pos[1] + 0.3 * sc + (q[1] - 0.3) * sp * e + 0.4 * e, v.pos[2] + Math.sin(a + q[2] * 1.2) * sp * e);
      });
      S.p.material.opacity = 1 - e;
      S.p.geometry.attributes.position.needsUpdate = true;
    }
    // ---- blindfold relic: a free prop about 3 m behind Mahito; cyan glints flare 6.6 to 8.6 s ----
    {
      const m = V.mahito.pos;
      band.visible = ts >= M.flood && ts < M.erase;
      band.position.set(m[0] + 0.5, 1.5 + Math.sin(ts * 1.3) * 0.08, m[2] - 3.0);
      band.rotation.set(Math.PI / 2 + 0.25 + Math.sin(ts * 0.9) * 0.1, ts * 0.35, 0.3);
      const g = ts - M.glints, on = g >= 0 && g < 2.0;
      for (const sp of glints) {
        sp.visible = on;
        if (!on) continue;
        const hold = Math.floor(g * 12) % 2 ? 0.8 : 1; // a 2-frame hold
        sp.position.set(band.position.x + sp.userData.side * 0.28, band.position.y + 0.06, band.position.z);
        sp.scale.setScalar(0.55 * (0.4 + 0.6 * Math.sin(Math.PI * c01(g / 2.0))) * hold);
      }
    }
  };

  const dispose = () => {
    for (const id of IDS) V[id].h.dispose();
    for (const o of owned) o.dispose?.();
    band.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  };
  return { group, update, dispose };
}
