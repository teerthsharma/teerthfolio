// Rigid card-and-cone props for the pyrefly cast: kunai, the orange spiral mask, the dark orb. Everything goes through
// engine.figure + sdf.painted so it shares the ONE anime program (no shader links at playback, F3).
export function makeParts(ctx) {
  const { THREE: T, engine, sdf } = ctx;
  const owned = [];
  const geo = (g) => (owned.push(g), g);
  // F: geometry -> cel figure with an ink hull. pos/rot in the parent's frame.
  const F = (g, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo(g), sdf.paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    if (o.scale) f.scale.set(...o.scale);
    return f;
  };

  // The three-pronged Flying Thunder God kunai, +y = the tip, 0.52 m long, ring pommel. Flat: every blade is squashed to z 0.25.
  function kunai() {
    const g = new T.Group(), W = ["#f4f0e6", "#b8b8c8"], flat = [1, 1, 0.25];
    const blade = (r, h, x, y, tilt) => F(new T.ConeGeometry(r, h, 4).rotateY(Math.PI / 4), W[0], W[1], { pos: [x, y, 0], rot: [0, 0, tilt], scale: flat, lineMul: 0.7 });
    g.add(blade(0.04, 0.3, 0, 0.3, 0), blade(0.028, 0.2, 0.075, 0.2, -0.5), blade(0.028, 0.2, -0.075, 0.2, 0.5));
    g.add(F(new T.CylinderGeometry(0.1, 0.1, 0.02, 10).rotateX(Math.PI / 2), "#c8c8d0", "#8a8a98", { pos: [0, 0.1, 0], scale: [1, 1, 0.45], lineMul: 0.6 }));
    g.add(F(new T.CylinderGeometry(0.014, 0.014, 0.1, 8), "#c8c8d0", "#8a8a98", { pos: [0, 0.05, 0], lineMul: 0.5 }));
    g.add(F(new T.CylinderGeometry(0.019, 0.019, 0.17, 8), "#3a2a2a", "#1a1010", { pos: [0, -0.06, 0], lineMul: 0.5 }));
    g.add(F(new T.TorusGeometry(0.04, 0.009, 6, 16), "#c8c8d0", "#8a8a98", { pos: [0, -0.185, 0], lineMul: 0.5 }));
    return g;
  }

  // ANBU / Tobi style mask on the locked pup's head frame (head centre (0,0.555,0.03), front surface z 0.285 at y 0.575).
  // variant "spiral": orange plate, an Archimedean spiral r = 0.012 + 0.058 u over 2.2 turns, one eye hole (Tobi). variant "anbu": white plate, red marks.
  function faceMask(variant = "spiral", s = 1) {
    const g = new T.Group(), spiral = variant === "spiral";
    const col = spiral ? "#e87a2a" : "#f4f0e6", shade = spiral ? "#a84a14" : "#c8c4b8";
    const cz = 0.245, ry = 0.162, rx = 0.15, rz = 0.063, cy = 0.575;
    g.add(F(new T.SphereGeometry(1, 22, 14).scale(rx, ry, rz), col, shade, { pos: [0, cy, cz], lineMul: 1.0 }));
    const zOn = (x, y) => cz + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - ((y - cy) / ry) ** 2));
    if (spiral) {
      const pts = [];
      for (let i = 0; i <= 44; i++) { const u = i / 44, a = u * 2.2 * Math.PI * 2, r = 0.012 + 0.058 * u, x = -0.012 + r * Math.cos(a), y = cy - 0.012 + r * Math.sin(a) * 1.05; pts.push(new T.Vector3(x, y, zOn(x, y) + 0.004)); }
      g.add(F(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, 0.0058, 5), "#7a2a10", "#4a1808", { lineMul: 0.4 }));
    } else {
      for (const sx of [1, -1]) g.add(F(new T.BoxGeometry(0.015, 0.075, 0.006), "#c82020", "#7a1010", { pos: [sx * 0.085, cy - 0.04, zOn(sx * 0.085, cy - 0.04) + 0.003], rot: [0, 0, sx * 0.35], lineMul: 0.4 }));
      g.add(F(new T.BoxGeometry(0.02, 0.05, 0.006), "#c82020", "#7a1010", { pos: [0, cy + 0.06, zOn(0, cy + 0.06) + 0.003], lineMul: 0.4 }));
    }
    // the eye hole (right eye only for the spiral, two slits for the white mask)
    const hole = (x, y, w, h) => g.add(F(new T.CircleGeometry(1, 14).scale(w, h, 1), "#140a10", "#140a10", { pos: [x, y, zOn(x, y) + 0.006], lineMul: 0.3 }));
    if (spiral) hole(0.07, cy + 0.015, 0.026, 0.026); else { hole(0.07, cy + 0.015, 0.026, 0.014); hole(-0.07, cy + 0.015, 0.026, 0.014); }
    g.scale.setScalar(s);
    return g;
  }

  // The dark orb Kurama gathers: a near-black core, a red ring, ten orbiting shards. set(k, ts): k 0..1 = size.
  // shard i sits at angle a_i = 2 pi i / 10 + 1.7 ts on a ring of radius 1.55 + 0.18 sin(3 ts + i), bobbing by 0.7 sin(a_i / 2 + i).
  function orb() {
    const g = new T.Group(), core = F(new T.SphereGeometry(1, 20, 14), "#1a0c18", "#05020a", { lineMul: 2.2 });
    const ring = F(new T.TorusGeometry(1.28, 0.05, 6, 36), "#e02020", "#7a1010", { lineMul: 1.0 });
    const ring2 = F(new T.TorusGeometry(1.5, 0.03, 6, 36), "#b3221c", "#5a0e10", { lineMul: 0.8 });
    g.add(core, ring, ring2);
    const shards = [];
    for (let i = 0; i < 10; i++) { const s = F(new T.ConeGeometry(0.1, 0.5, 5), "#1a0c18", "#05020a", { lineMul: 1.2 }); shards.push(s); g.add(s); }
    return {
      group: g,
      set(k, ts) {
        g.visible = k > 0.002; g.scale.setScalar(Math.max(0.001, 1.35 * k));
        ring.rotation.set(1.2, ts * 1.3, 0.3); ring2.rotation.set(0.5, -ts * 0.9, 1.1);
        shards.forEach((s, i) => { const a = (i / 10) * Math.PI * 2 + 1.7 * ts, r = 1.55 + 0.18 * Math.sin(3 * ts + i); s.position.set(Math.cos(a) * r, Math.sin(a * 0.5 + i) * 0.7, Math.sin(a) * r); s.lookAt(0, 0, 0); s.rotateX(Math.PI / 2); });
      },
    };
  }
  return { F, kunai, faceMask, orb, geo, dispose() { owned.forEach((g) => g.dispose()); } };
}
