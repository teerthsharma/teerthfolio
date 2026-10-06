// CAST parts for pr-mujoco-3396: small rigid pieces the costume kit does not ship (peaked caps, rifle, buttons, armband,
// Wings of Freedom, 3D-manoeuvre gear, trousers, epaulettes, gloves, moustache, a free-flapping cloak).
// Every piece is an engine.figure (cel surface + ink hull) painted from the shared sdf paint(), so it shares the
// program of the costumed seals (no new shader links during playback). Units are seal-local metres (the pup is 0.8 m tall
// at scale 1); a victim group scales them. Nothing here is emissive: the lit-luma cap 0.92 holds (owner law L8).
export function makeParts(ctx) {
  const { THREE, engine, sdf } = ctx;
  const { Color, Group, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, Vector3, Quaternion } = THREE;
  const dk = (hex, k = 0.55) => `#${new Color(hex).multiplyScalar(k).getHexString()}`;

  // one painted rigid piece. o: { pos, rot, scale, line, lineMul }
  const part = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? dk(col), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    if (o.scale) f.scale.set(...o.scale);
    return f;
  };
  const cyl = (r0, r1, h, n = 18) => new CylinderGeometry(r0, r1, h, n);
  const ball = (r, sx = 1, sy = 1, sz = 1) => new SphereGeometry(r, 12, 8).scale(sx, sy, sz);

  // PEAKED CAP (Marley rifleman cap #3a3f36 band #c99a4a; the officer's carries a gold crest). The pup head top is y 0.80.
  //   crown: a flared drum over the brow; top: a flat overhanging disc; band: the ring; visor: a tilted plate over the eyes.
  const cap = (o = {}) => {
    const g = new Group(), c = o.col ?? "#3a3f36", sh = o.shade ?? "#1f2320", band = o.band ?? "#c99a4a";
    g.add(part(cyl(0.255, 0.285, 0.11, 24), c, sh, { pos: [0, 0.757, 0.02] }));
    g.add(part(cyl(0.305, 0.305, 0.022, 28), c, sh, { pos: [0, 0.822, 0.025] }));
    g.add(part(cyl(0.288, 0.288, 0.036, 24), band, dk(band), { pos: [0, 0.708, 0.02] }));
    g.add(part(new BoxGeometry(0.31, 0.014, 0.13), dk(c, 0.8), dk(c, 0.45), { pos: [0, 0.694, 0.285], rot: [0.28, 0, 0] }));
    if (o.crest) g.add(part(new ConeGeometry(0.034, 0.075, 6), o.crest, dk(o.crest), { pos: [0, 0.745, 0.3], rot: [Math.PI / 2 - 0.2, 0, 0] }));
    return g;
  };

  // two rows of 4 brass buttons down a closed coat (the uniform layer's chest front is z 0.31 at x 0)
  const buttons = (col = "#c99a4a", gap = 0.075, n = 4, y0 = 0.4) => {
    const g = new Group();
    for (const s of [1, -1]) for (let i = 0; i < n; i++) g.add(part(ball(0.017, 1, 1, 0.7), col, dk(col), { pos: [s * gap, y0 - i * 0.07, 0.301 - i * 0.004], lineMul: 0.5 }));
    return g;
  };

  // cross-strap and belt-line: a thin slab across the chest
  const strap = (col = "#5a3b22") => part(new BoxGeometry(0.045, 0.5, 0.012), col, dk(col), { pos: [0.02, 0.3, 0.318], rot: [0, 0, -0.62], lineMul: 0.6 });

  // armband on a sleeve. side +1 = the seal's left sleeve in the kit's frame; the ring is aligned to the sleeve axis
  const armband = (col, side = -1) => {
    const f = part(new TorusGeometry(0.07, 0.027, 8, 18), col, dk(col), { pos: [side * 0.258, 0.355, 0.147], lineMul: 0.6 });
    f.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(side * 0.035, -0.22, 0.07).normalize()));
    return f;
  };

  // Marley rifle: stock #5a3b22, barrel #6e6e68, a sling ring. Built along +z (muzzle forward), 0.9 m local.
  const rifle = () => {
    const g = new Group();
    g.add(part(new BoxGeometry(0.055, 0.075, 0.34), "#5a3b22", "#2b1c10", { pos: [0, 0, -0.2] }));
    g.add(part(cyl(0.013, 0.013, 0.62, 8).rotateX(Math.PI / 2), "#6e6e68", "#3a3a37", { pos: [0, 0.012, 0.28], lineMul: 0.6 }));
    g.add(part(new BoxGeometry(0.03, 0.04, 0.16), "#4a2f1a", "#241509", { pos: [0, -0.005, 0.12] }));
    return g;
  };

  // WINGS OF FREEDOM (white #efe6d2 over blue #2f4f8f), 0.2 m wide, drawn flat as 3 feathers a side, to ride on a cloak back
  const wings = () => {
    const g = new Group();
    for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
      const w = 0.105 - 0.017 * k;
      g.add(part(new BoxGeometry(w, 0.02, 0.012), "#efe6d2", "#b9ae98", { pos: [s * (0.06 + 0.012 * k), 0.034 - 0.027 * k, 0], rot: [0, 0, s * (0.28 + 0.2 * k)], lineMul: 0.45 }));
      g.add(part(new BoxGeometry(w * 0.9, 0.02, 0.012), "#2f4f8f", "#1b2f5a", { pos: [s * (0.056 + 0.012 * k), 0.012 - 0.027 * k, 0.002], rot: [0, 0, s * (0.28 + 0.2 * k)], lineMul: 0.45 }));
    }
    return g;
  };

  // 3D-manoeuvre gear: two hip grips #8a8a84, two gas canisters #6e6e68 on the lower back
  const odm = () => {
    const g = new Group();
    for (const s of [1, -1]) {
      g.add(part(new BoxGeometry(0.05, 0.11, 0.045), "#8a8a84", "#4a4a46", { pos: [s * 0.325, 0.16, 0.06], lineMul: 0.6 }));
      g.add(part(cyl(0.03, 0.03, 0.15, 10), "#6e6e68", "#3a3a37", { pos: [s * 0.09, 0.2, -0.33], lineMul: 0.6 }));
    }
    return g;
  };

  // trousers: a short drum under the hem (the pup has no legs; this is the colour below the coat)
  const trousers = (col) => part(cyl(0.325, 0.355, 0.1, 26), col, dk(col), { pos: [0, 0.052, 0.0] });

  // epaulettes (officer, gold), white gloves at the sleeve ends, red collar tabs, a two-clump tapered moustache
  const epaulettes = (col = "#c99a4a") => { const g = new Group(); for (const s of [1, -1]) g.add(part(ball(0.1, 1, 0.3, 0.9), col, dk(col), { pos: [s * 0.255, 0.475, 0.0], rot: [0, 0, -s * 0.25], lineMul: 0.6 })); return g; };
  const gloves = (col = "#efe6d2") => { const g = new Group(); for (const s of [1, -1]) g.add(part(ball(0.05), col, dk(col, 0.7), { pos: [s * 0.288, 0.17, 0.205], lineMul: 0.6 })); return g; };
  const collarTabs = (col = "#b8492f") => { const g = new Group(); for (const s of [1, -1]) g.add(part(new BoxGeometry(0.06, 0.035, 0.012), col, dk(col), { pos: [s * 0.1, 0.45, 0.285], rot: [0.5, 0, 0], lineMul: 0.5 })); return g; };
  const moustache = (col = "#3b2f22") => {
    const g = new Group();
    for (const s of [1, -1]) g.add(part(new ConeGeometry(0.02, 0.09, 6), col, dk(col), { pos: [s * 0.045, 0.462, 0.284], rot: [0.15, 0, s * (Math.PI / 2 - 0.25)], lineMul: 0.5 }));
    return g;
  };

  // a free-flapping CLOAK as its own figure (the kit's cloak is baked into the shell and cannot flap): built once, shared geometry.
  // pivoted at the shoulders: setFlap(obj, theta) swings the hem back by theta (rad); position = P - R P keeps the collar on the neck.
  const cloakGeos = new Map();
  const cloak = (o) => {
    const key = JSON.stringify(o);
    let geo = cloakGeos.get(key);
    if (!geo) { geo = sdf.polygonize(ctx.kit.COSTUME_LAYERS.cloak(o), 0.014); cloakGeos.set(key, geo); }
    const f = engine.figure(geo, { ink: "#1a1420", lineMul: 1.2, constant: true });
    f.userData.geo = geo;
    return f;
  };
  const PIV = [0.5, -0.1]; // pivot y, z
  const setFlap = (obj, th) => {
    const c = Math.cos(th), s = Math.sin(th);
    obj.rotation.set(th, 0, 0);
    obj.position.set(0, PIV[0] - (PIV[0] * c - PIV[1] * s), PIV[1] - (PIV[0] * s + PIV[1] * c));
  };

  const dispose = () => { for (const g of cloakGeos.values()) g.dispose(); cloakGeos.clear(); };
  return { part, cap, buttons, strap, armband, rifle, wings, odm, trousers, epaulettes, gloves, collarTabs, moustache, cloak, setFlap, dk, dispose };
}
