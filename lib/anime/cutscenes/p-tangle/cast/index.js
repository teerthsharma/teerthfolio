// CAST layer for p-tangle (Your Name, kataware-doki). Bible: scripts/p-tangle.md section 4 (characters), 3.8, 3.9 (cord end), 7 (eggs 2, 6, 8).
// Layer 1. Law L6b: the victim is MITSUHA, a SMALL COSTUMED SEAL (Itomori uniform), never a silhouette; Taki is deliberately absent.
// The hero seal (ctx.seal) is the locked pup and is never restyled: this layer only ties the red cord round its near flipper.
//
// Timeline (REAL seconds of the 28.6 s cut). Each beat name is read from scene.beats when the direction layer provides it, else the
// bible fallback below. Everything is a pure function of the stepped clock t, so scrubbing equals playing.
//   cord-tie      1.25  hero: three cord rings tie on the near flipper (1.25-1.8 s), kept to the end (egg 8)
//   mitsuha-in    3.0   fades in on the islet, upright in profile facing the pup (05 stance, arms slack), 1.4 s
//   link         10.2   freeze 6 frames (0.25 s), eyes wide (the loops lock)
//   comet-impact 13.9   2-frame anticipation, then recoil: leans back, 8 frames (0.33 s), terror
//   pull         14.0   dragged 0.4 m toward the hero along the cord, stagger, braid ribbon tails streaming
//   bow-pop      15.2   kneels, flippers at chest (06 mood) until the burst; the dragged 0.4 m eases home with the retract
//   burst        16.4   rises, awe
//   mitsuha-fade 19.4   raises a flipper to her cord (the cord tuft lifts to the braid), dusk-grades, shrinks away by 22.4
// Maths: ease(x) = x^2 (3 - 2x) clamped to [0,1]; kk(a, b, t) = ease((t - a) / (b - a)).
//
// Colours (S sampled from the film, E estimated): fur #7a6a78 E, belly #e8d8c8 E; bob #1a192e S, highlight #5a6a88 E; vest #958075 S;
// blouse collar #f4efe6 E; skirt #3c293d S; bow #e34a4a E / #7a4f5d S; cord #e8552e E, core #8c2a24 E; iris #3a2f48 top to #8a6aa0 bottom E; crest #d8362c.
//
// ctx.cast.mitsuha = { group, hand } is published for the other layers (hand = THREE.Vector3, world position of her cord hand, updated each step).
// scene.mitsuha (optional) = { at:[x,y,z], dist, lat, scale } overrides her placement (default: 28 m ahead of the hero, 2.2 m to its right).

const CORD = "#e8552e", CORD_SHADE = "#8c2a24";

export default function build(ctx) {
  const { THREE, engine, kit, sdf, scene, seal } = ctx;
  const { Group, Vector3, TorusGeometry, BoxGeometry, SphereGeometry } = THREE;
  const group = new Group();
  group.name = "p-tangle-cast";
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const kk = (a, b, t) => ease((t - a) / (b - a));
  const bt = (name, fb) => scene.beats?.find((b) => b.name === name)?.t ?? fb;
  const setL1 = (o) => o.traverse((c) => c.layers.set(1));
  const cel = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: 1 })), { lineMul: o.lineMul ?? 0.8, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };

  // ---------------------------------------------------------------- Mitsuha's custom cloth layers (registered on the kit's open registry at runtime)
  // pleatSkirt: a flared cone (r 0.35 at the waist y 0.19 to 0.44 at the hem y 0.02) with 7 darker pleat ridges at angle 2 pi i / 7.
  kit.COSTUME_LAYERS.pleatSkirt ??= (o) => {
    const m = sdf.paint(o.col, o.shade, { line: 1.1 }), r = sdf.paint(o.shade, o.shade, { line: 1 });
    const out = [sdf.cone([0, 0.19, 0], [0, 0.02, 0], 0.35, 0.44, m, 0.03)];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; out.push(sdf.ell([Math.sin(a) * 0.41, 0.1, Math.cos(a) * 0.41], [0.028, 0.085, 0.028], r, 0.015)); }
    return out;
  };
  // itomoriBow: the red bow (two loops, knot, two tails) at the collar, the crest button, and the nape braid (3 lobes: the kumihimo egg) with its cord tie.
  kit.COSTUME_LAYERS.itomoriBow ??= (o) => {
    const red = sdf.paint(o.bow, o.bowShade, { line: 1 }), cord = sdf.paint(o.cord, o.cordShade, { line: 1 }), hair = sdf.paint(o.hair, o.hairShade, { line: 1 });
    return [
      sdf.ell([-0.07, 0.415, 0.305], [0.062, 0.042, 0.022], red, 0.012), sdf.ell([0.07, 0.415, 0.305], [0.062, 0.042, 0.022], red, 0.012),
      sdf.ell([0, 0.415, 0.315], [0.026, 0.026, 0.022], red, 0.01),
      sdf.cone([-0.02, 0.4, 0.31], [-0.045, 0.27, 0.32], 0.02, 0.014, red, 0.005), sdf.cone([0.02, 0.4, 0.31], [0.045, 0.27, 0.32], 0.02, 0.014, red, 0.005),
      sdf.ell([0.1, 0.3, 0.315], [0.018, 0.018, 0.01], sdf.paint(o.crest, o.crest, { line: 1 }), 0.004),
      sdf.cone([0, 0.43, -0.215], [0, 0.2, -0.3], 0.05, 0.034, hair, 0.015),
      sdf.ell([0, 0.3, -0.27], [0.03, 0.04, 0.03], hair, 0.01), sdf.ell([0, 0.37, -0.245], [0.032, 0.04, 0.03], hair, 0.01),
      sdf.ell([0, 0.21, -0.3], [0.045, 0.03, 0.045], cord, 0.01),
    ];
  };

  // ---------------------------------------------------------------- Mitsuha
  const girl = kit.costumedSeal(engine, {
    name: "mitsuha-seal",
    scale: 0.55 * seal.scale * (scene.mitsuha?.scale ?? 1), // about 55 percent of the hero's height
    coat: "#7a6a78", shade: "#5a4c5a",
    layers: [
      { type: "uniform", col: "#958075", shade: "#5a4a50", collar: "#f4efe6" }, // knit vest; the white collar is the blouse
      { type: "pleatSkirt", col: "#3c293d", shade: "#1e1426" },
      { type: "itomoriBow", bow: "#e34a4a", bowShade: "#7a4f5d", cord: CORD, cordShade: CORD_SHADE, hair: "#1a192e", hairShade: "#0b0a18", crest: "#d8362c" },
    ],
    // black bob, blunt at the jaw, one hard-cut highlight band per clump
    hair: { preset: "bob", count: 14, layers: 2, length: [0.15, 0.21], width: 0.08, droop: 0.34, seed: 7,
      color: { base: "#1a192e", shade: "#0b0a18", hi: "#5a6a88" }, cut: { at: [0.3, 0.62], slant: 0.18, rate: 1 } },
    // anime eye: two-tone iris (top #3a2f48 to bottom #8a6aa0), big highlight upper-left, small lower-right, lash
    eyes: { style: "round", iris: "#3a2f48", irisLo: "#8a6aa0", size: [0.092, 0.108] },
    shadowTint: "#5a3a5a",
  });
  const gu = girl.fig.userData.mat.uniforms;
  gu.uDecCol.value.set("#e8d8c8"); gu.uDecShade.value.set("#c4aeb0"); // belly cream, shadow toward magenta (hue rule)
  group.add(girl.group);

  // cord end in her near flipper (the kit's right-hand grip) and two 0.25 m ribbon tails whipping from the nape braid (bible 3.9)
  const hand = [0.27, 0.28, 0.25];
  const tuft = new Group();
  tuft.position.set(...hand);
  tuft.add(cel(new SphereGeometry(0.034, 10, 8), CORD, CORD_SHADE), cel(new TorusGeometry(0.036, 0.011, 6, 14).rotateX(Math.PI / 2), CORD, CORD_SHADE, { pos: [0, -0.02, 0] }));
  const tails = new Group();
  tails.position.set(0, 0.2, -0.3);
  const tailMeshes = [-1, 1].map((s) => {
    const m = cel(new BoxGeometry(0.03, 0.25, 0.008).translate(0, -0.125, 0), CORD, CORD_SHADE, { lineMul: 0.5 });
    m.position.x = s * 0.02; tails.add(m); return m;
  });
  girl.body.add(tuft, tails);
  setL1(tuft); setL1(tails);

  // placement: across the lake from the hero, facing it
  const sy = seal.yaw ?? 0, fw = [Math.sin(sy), Math.cos(sy)], rt = [Math.cos(sy), -Math.sin(sy)];
  const dist = scene.mitsuha?.dist ?? 28, lat = scene.mitsuha?.lat ?? 2.2;
  const home = scene.mitsuha?.at ?? [seal.at[0] + fw[0] * dist + rt[0] * lat, seal.at[1], seal.at[2] + fw[1] * dist + rt[1] * lat];
  const toHero = new Vector3(seal.at[0] - home[0], 0, seal.at[2] - home[2]).normalize();
  girl.place(home[0], home[1], home[2], 0).lookAtPoint(seal.at[0], seal.at[2]);

  const handW = new Vector3();
  ctx.cast = { ...(ctx.cast ?? {}), mitsuha: { group: girl.group, hand: handW } };

  // ---------------------------------------------------------------- hero mark: the red cord tied on the near flipper, kept to the end (egg 8)
  const wrap = new Group();
  wrap.position.set(0.3, 0.22, 0.13); wrap.rotation.set(0.2, 0, -0.5);
  for (let i = 0; i < 3; i++) wrap.add(cel(new TorusGeometry(0.052 - i * 0.004, 0.013, 6, 18), CORD, CORD_SHADE, { pos: [0, i * 0.026 - 0.026, 0], rot: [Math.PI / 2, 0, i * 0.5], lineMul: 0.6 }));
  wrap.add(cel(new SphereGeometry(0.03, 8, 6), CORD, CORD_SHADE, { pos: [0.05, 0, 0.03], lineMul: 0.6 }));
  const wrapTail = cel(new BoxGeometry(0.022, 0.16, 0.007).translate(0, -0.08, 0), CORD, CORD_SHADE, { lineMul: 0.5 });
  wrapTail.position.set(0.05, 0, 0.03); wrap.add(wrapTail);
  wrap.visible = false;
  seal.attach(wrap, 1);
  setL1(wrap);

  // ---------------------------------------------------------------- update (pure function of stepped t)
  const tTie = bt("cord-tie", 1.25), tIn = bt("mitsuha-in", 3.0), tLink = bt("link", 10.2), tImp = bt("comet-impact", 13.9), tPull = bt("pull", 14.0);
  const tBow = bt("bow-pop", 15.2), tBurst = bt("burst", 16.4), tFade = bt("mitsuha-fade", 19.4), tEnd = tFade + 3.0;
  const sc0 = girl.scale, tmp = new Vector3();

  function update(t) {
    // hero cord ties on 1.25-1.8, goes taut with the pull
    const tie = kk(tTie, tTie + 0.55, t);
    wrap.visible = tie > 0.01;
    wrap.scale.setScalar(0.4 + 0.6 * tie);
    wrapTail.rotation.z = Math.sin(t * 7) * 0.35 * (1 - 0.6 * kk(tPull, tPull + 0.3, t));

    // Mitsuha: appear (peach wash thinning), dusk grade toward the backlit #813b55, shrink away at the end
    const vin = kk(tIn, tIn + 1.4, t), vout = 1 - kk(tFade + 0.8, tEnd, t), vis = Math.min(vin, vout);
    girl.group.visible = vis > 0.01;
    girl.group.scale.setScalar(sc0 * (0.82 + 0.18 * vis));
    const dusk = kk(11.3, 17.0, t) * 0.18 + kk(tFade, tEnd, t) * 0.42, wash = (1 - vin) * 0.85;
    if (wash > 0.01) girl.tint("#f5d4cf", wash); else girl.tint("#813b55", 0.12 + dusk);

    // one reaction at a time
    const pull = kk(tPull, tPull + 0.3, t) * (1 - kk(tBow, tBow + 0.5, t));
    const bow = kk(tBow, tBow + 0.35, t) * (1 - kk(tBurst, tBurst + 0.5, t));
    // recoil: 2 frames of anticipation (k to 0.3 in 0.083 s), then the 8-frame lean to 1
    const imp = t < tImp ? 0 : t < tImp + 0.083 ? 0.3 * (t - tImp) / 0.083 : 0.3 + 0.7 * kk(tImp + 0.083, tImp + 0.4, t);
    let name = "stand", k = 0, expr = "neutral", ek = 0;
    if (t >= tLink && t < tLink + 0.25) { name = "recoil"; k = 0.18; expr = "awe"; ek = 1; } // link freeze: 6 frames, no tremble
    else if (bow > 0.05) { name = "kneel"; k = bow; expr = "sad"; ek = 1; }
    else if (t >= tPull && pull > 0.05) { name = "stagger"; k = 0.5 + 0.5 * pull; expr = "terror"; ek = 1; }
    else if (t >= tImp && t < tPull) { name = "recoil"; k = imp; expr = "terror"; ek = 1; }
    else if (t >= tBurst && t < tBurst + 1.6) { expr = "awe"; ek = 1 - kk(tBurst + 0.6, tBurst + 1.6, t); }
    else if (t >= tFade) { name = "bow"; k = 0.22 * kk(tFade, tFade + 0.8, t); expr = "calm"; ek = 0.6; }
    girl.react(name, k);
    if (ek > 0) girl.expression(expr, ek);

    // dragged 0.4 m toward the hero (14.0-14.5), eased home with the retract (15.2-16.4)
    const drag = 0.4 * seal.scale * (kk(tPull, tPull + 0.5, t) - kk(tBow, tBurst, t));
    girl.group.position.set(home[0] + toHero.x * drag, home[1], home[2] + toHero.z * drag);

    // ribbon tails: calm flutter, whipped straight back when dragged
    const flutter = Math.sin(t * 6.1) * 0.22 + Math.sin(t * 9.7) * 0.1;
    tails.rotation.set(-0.15 - 1.1 * pull, 0, 0);
    tailMeshes.forEach((m, i) => { m.rotation.z = flutter * (1 - 0.7 * pull) * (i ? 1 : -1); m.rotation.x = Math.sin(t * 7.3 + i) * 0.25; });

    // cord tuft: in her flipper; lifts to her braid when she raises the flipper at 19.4
    const up = kk(tFade, tFade + 0.9, t);
    tuft.position.set(hand[0] * (1 - up) + 0.05 * up, hand[1] * (1 - up) + 0.4 * up, hand[2] * (1 - up) - 0.2 * up);

    girl.update(t);
    girl.group.updateMatrixWorld(true);
    handW.copy(tuft.getWorldPosition(tmp));
  }

  return {
    group,
    update(t) { update(t); },
    dispose() { girl.dispose(); for (const o of [wrap, tuft, tails]) o.traverse((c) => c.geometry?.dispose?.()); },
  };
}
