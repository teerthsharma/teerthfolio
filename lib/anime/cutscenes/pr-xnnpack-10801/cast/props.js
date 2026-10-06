// CAST props for pr-xnnpack-10801: the hand-held pieces the kit's WEAPONS/HATS libraries do not have.
// Every piece is built like the kit's own rigid props: a painted primitive through engine.figure (surface + ink hull),
// so it shares the anime material programs (no shader links during playback) and keeps the luma cap 0.92 (no bloom).
// Coordinates are the seal's own frame (m, +y up, +z forward; the pup is 0.8 m tall at scale 1).
// DIMENSION PALETTE (bible 2): paper #f4f4f0, ink #080a0f, one cold blue; no other colour. Real-world hexes sit in the comments
// of costumes.js and are used only if a scene asks for the "real" look through the glass holes.

export function makeProps(ctx) {
  const { THREE, engine, sdf } = ctx;
  const { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry } = THREE;
  const INK = "#080a0f", PAPER = "#f4f4f0", GREY = "#aab1bf", PALE = "#d8ecff";
  const darker = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
  // one painted primitive -> a figure with an ink hull
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? darker(col, 0.55), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };
  const cyl = (r0, r1, h, seg = 14) => new CylinderGeometry(r0, r1, h, seg);

  // ---- Kyoka Suigetsu (Aizen's katana). Thin straight blade, round tsuba, dark wrap. Blade = base + a separate TIP that snaps.
  // base: 0.46 m of blade from the tsuba; tip: the last 0.14 m (bible: blade 1.4, tip 0.3 -> a fifth; 0.14/0.60 = 0.23).
  // Returns { root, tip, tipHome } ; root grips at the origin with the blade along +y, like the kit's sword.
  function kyokaSuigetsu() {
    const root = new Group(), tip = new Group();
    root.add(
      fig(cyl(0.017, 0.017, 0.16, 8), "#2a2630", INK, { pos: [0, 0.02, 0], lineMul: 0.7 }),            // hilt wrap
      fig(cyl(0.05, 0.05, 0.012, 16).rotateX(Math.PI / 2), INK, "#000000", { pos: [0, 0.1, 0], lineMul: 0.7 }), // tsuba, round, black
      fig(new BoxGeometry(0.02, 0.46, 0.007), GREY, "#8a92a4", { pos: [0, 0.34, 0], lineMul: 0.6 }),        // blade flat #aab1bf
      fig(new BoxGeometry(0.004, 0.46, 0.0075), PALE, PALE, { pos: [0.007, 0.34, 0.001], line: 0, lineMul: 0.1 }), // the thin white highlight down the edge
    );
    // tip: a flattened four-sided cone, point up, its own pivot at the snap line (y = 0.57)
    tip.add(
      fig(new ConeGeometry(0.0125, 0.14, 4).scale(1, 1, 0.38), GREY, "#8a92a4", { pos: [0, 0.07, 0], lineMul: 0.6 }),
      fig(new BoxGeometry(0.004, 0.13, 0.0075), PALE, PALE, { pos: [0.006, 0.065, 0.001], line: 0, lineMul: 0.1 }),
    );
    tip.position.set(0, 0.57, 0);
    root.add(tip);
    return { root, tip, tipHome: tip.position.clone() };
  }

  // ---- Zangetsu (Ichigo's cleaver): a huge slab, black blade #0e0b0d, bandaged hilt #c8c0b0. In the dimension the bandage reads paper.
  // Blade 0.78 m (the seal is 0.8 m, bible: 0.9 m blade on a 0.9 m seal), 0.17 wide at the belly, a spine and a thin white edge line.
  function zangetsu() {
    const root = new Group();
    root.add(
      fig(cyl(0.022, 0.024, 0.2, 8), "#c8c0b0", "#8e8678", { pos: [0, 0.0, 0], lineMul: 0.7 }),            // bandaged hilt
      fig(new TorusGeometry(0.026, 0.008, 6, 14).rotateX(Math.PI / 2), PAPER, GREY, { pos: [0, 0.095, 0], lineMul: 0.5 }), // wrap ring
      fig(new BoxGeometry(0.17, 0.78, 0.016), "#0e0b0d", "#000000", { pos: [0.03, 0.5, 0], lineMul: 1.1 }),  // the slab (offset: the spine is the grip line)
      fig(new BoxGeometry(0.01, 0.76, 0.0175), PALE, PALE, { pos: [0.108, 0.5, 0.001], line: 0, lineMul: 0.1 }), // edge highlight
      fig(new ConeGeometry(0.085, 0.14, 4).scale(1, 1, 0.19), "#0e0b0d", "#000000", { pos: [0.03, 0.96, 0], rot: [0, Math.PI / 4, 0], lineMul: 1.0 }), // the squared tip
    );
    return { root };
  }

  // ---- Gin's Shinsō, worn: a short sheathed blade at the hip. Scabbard + guard + hilt, lying across the belt.
  function hipBlade(len = 0.34, scab = INK) {
    const root = new Group();
    root.add(
      fig(new BoxGeometry(0.03, len, 0.03), scab, "#000000", { pos: [0, len / 2, 0], lineMul: 0.9 }),
      fig(cyl(0.028, 0.028, 0.01, 12).rotateX(Math.PI / 2), PAPER, GREY, { pos: [0, len + 0.005, 0], lineMul: 0.6 }),
      fig(cyl(0.014, 0.014, 0.1, 8), "#2a2630", INK, { pos: [0, len + 0.06, 0], lineMul: 0.6 }),
    );
    return root;
  }

  // ---- Urahara's striped bucket hat: a crown with 8 alternating stripes (ink / paper in the dimension), a drooping brim, a band.
  // The crown is a truncated cone cut into 8 wedges (CylinderGeometry thetaStart/thetaLength), so each stripe is its own flat-filled piece.
  function bucketHat(a = INK, b = PAPER) {
    const root = new Group(), N = 8;
    for (let i = 0; i < N; i++) {
      const g = new CylinderGeometry(0.17, 0.23, 0.17, 4, 1, true, (i / N) * Math.PI * 2, (Math.PI * 2) / N);
      root.add(fig(g, i % 2 ? b : a, i % 2 ? GREY : "#000000", { pos: [0, 0.12, 0], lineMul: 0.5, line: 0.5 }));
    }
    root.add(
      fig(cyl(0.17, 0.17, 0.012, 20), a, "#000000", { pos: [0, 0.205, 0], lineMul: 0.7 }),                    // flat top
      fig(new CylinderGeometry(0.36, 0.31, 0.02, 28), b, GREY, { pos: [0, 0.03, 0], rot: [0.14, 0, 0], lineMul: 0.9 }), // the drooping brim, tipped forward: it shades the eyes
      fig(new TorusGeometry(0.232, 0.014, 6, 24).rotateX(Math.PI / 2), INK, "#000000", { pos: [0, 0.055, 0], lineMul: 0.5 }), // band
    );
    return root;
  }

  // ---- Benihime: Urahara's cane, 0.8 m: a shaft, a bent hook handle, a ferrule. Origin at the hand, shaft along -y (a cane rests on the ground).
  function cane() {
    const root = new Group();
    root.add(
      fig(cyl(0.013, 0.012, 0.8, 8), "#3a2c24", INK, { pos: [0, -0.26, 0], lineMul: 0.7 }),
      fig(new TorusGeometry(0.045, 0.014, 6, 14, Math.PI * 1.1).rotateZ(-0.2), "#3a2c24", INK, { pos: [0.04, 0.14, 0], lineMul: 0.7 }),
      fig(cyl(0.016, 0.014, 0.025, 8), PAPER, GREY, { pos: [0, -0.665, 0], lineMul: 0.5 }),
    );
    return root;
  }

  // ---- geta: a wooden plank on two teeth. One per rear flipper (seal frame feet at x +-0.16).
  function geta() {
    const root = new Group();
    for (const s of [1, -1]) {
      const g = new Group();
      g.add(fig(new BoxGeometry(0.15, 0.016, 0.22), "#6a5a48", "#3a3024", { pos: [0, 0.022, 0], lineMul: 0.7 }),
        fig(new BoxGeometry(0.13, 0.026, 0.02), "#6a5a48", "#3a3024", { pos: [0, 0.008, 0.07], lineMul: 0.5 }),
        fig(new BoxGeometry(0.13, 0.026, 0.02), "#6a5a48", "#3a3024", { pos: [0, 0.008, -0.07], lineMul: 0.5 }));
      g.position.set(s * 0.16, 0, 0.05);
      root.add(g);
    }
    return root;
  }

  return { fig, kyokaSuigetsu, zangetsu, hipBlade, bucketHat, cane, geta, INK, PAPER, GREY, PALE };
}
