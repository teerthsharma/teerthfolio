// CAST layer for pr-topograph-432 (Overlord, Ainz as a Saturday-morning cartoon). Layer 1.
// The hero seal IS Ainz: the locked pup (never restyled) wears a black-violet cloak, a tall gold collar, two rings of power
// and the Staff of Ainz Ooal Gown (seven canonical gems). All parts ride ctx.seal.attach (the pup mesh is never edited).
// Victims: 10 Tomb invaders (4 warriors, 3 mages, 3 rogues) and 6 Kingdom soldiers, ALL small costumed seals (L6b).
// Set dressing: one tiny Pleiades maid seal bowing at the stair top (easter egg 3).
//
// Everything is a PURE FUNCTION of the clock (scrub == play): every reaction is evaluated from s = seconds since the SLAM,
// in 24 fps frames f = s*24, using the stepped clock `t` handed to update so the characters sit on the layer's threes/twos.
//
// Maths used below:
//   hop parabola   y(u)   = 4 h u (1-u), u in [0,1]                 (peak h at u = .5)
//   flee           p(s)   = p0 + d * v * max(0, s - s0)              d = unit outward vector from the seal
//   star burst     p_i(a) = o + (c_i * v_i) * a + (0, -g a^2/2, 0)   a = age; size_i = size0 * (1-a/life)
//   domino delay   s_i    = i * 5/24 s                              (soldiers ripple along the line)
// Cue names read (all optional, with the bible's time as fallback): "slam" (7.92 s staff slam), "fly" (hero rises, ~10.6 s),
//   "flex" (15.3 s staff raised). Reactions are derived from "slam".
export default function build(ctx) {
  const { THREE, engine, kit, sdf } = ctx;
  const { Group, Mesh, MeshBasicMaterial, ShapeGeometry, Shape, SphereGeometry, ConeGeometry, TorusGeometry, CylinderGeometry, DoubleSide } = THREE;
  const group = new Group();
  group.name = "topograph-cast";
  const rng = ctx.rng("cast432");
  const FB = { slam: 7.92, fly: 10.6, flex: 15.3 }; // bible times, used when the direction layer sends no beat
  const GEM = ["#c82040", "#3a8a5a", "#2f6ab0", "#f0b429", "#b46bff", "#e0e0e0", "#ff8a3a"]; // the seven gems, canonical order
  const GOLD = { hi: "#ffd24a", mid: "#e6b43a", lo: "#a8741a" };

  // ---------- helpers
  // a flat painted prop: engine.figure of an SDF-painted geometry (the 3 px cartoon ink comes from the figure's hull)
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 1.0, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };
  const beatStart = (cue, name, fb) => { const s = cue.since(name); return Number.isFinite(s) ? cue.t - s : fb; };
  const star4 = (R, r) => { const s = new Shape(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r : R; if (i) s.lineTo(Math.cos(a) * q, Math.sin(a) * q); else s.moveTo(Math.cos(a) * q, Math.sin(a) * q); } s.closePath(); return new ShapeGeometry(s); };
  const ramp = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));

  // ---------- stage: everything is placed in the seal's own frame (x right, y up, z forward), snapshotted at build
  const S0 = { at: [...ctx.seal.at], yaw: ctx.seal.yaw };
  const toWorld = (lx, lz) => [S0.at[0] + lx * Math.cos(S0.yaw) + lz * Math.sin(S0.yaw), S0.at[2] - lx * Math.sin(S0.yaw) + lz * Math.cos(S0.yaw)];
  const STAIR_TOP_Y = 2.8;

  // ---------- HERO: Ainz's costume on the locked seal
  const hero = {};
  {
    // cloak shell: borrow the kit's SDF cloth shell from a temp costumed seal, keep only the shell, never its body
    const tmp = kit.costumedSeal(engine, { scale: 1, shadow: false, layers: [{ type: "cloak", col: "#3a2a5a", shade: "#1a0f30", trim: GOLD.mid, lining: "#1a0f30", len: 1, collar: "high", spread: 1.05 }] });
    if (tmp.shell) { tmp.body.remove(tmp.shell); ctx.seal.attach(tmp.shell, 1); hero.shell = tmp.shell; }
    // tall gold collar: a flared open ring behind the head with a lit-gold cut-line highlight (never in front of the face)
    const col = new Group();
    col.add(fig(new CylinderGeometry(0.34, 0.2, 0.26, 20, 1, true).scale(1, 1, 0.55), GOLD.hi, GOLD.mid, { pos: [0, 0.64, -0.16], rot: [-0.32, 0, 0] }));
    col.add(fig(new THREE.BoxGeometry(0.46, 0.02, 0.012), "#fff4c0", "#fff4c0", { pos: [0, 0.77, -0.27], rot: [-0.32, 0, 0], line: 0.2 })); // the 4 px highlight bar
    ctx.seal.attach(col, 1); hero.collar = col;
    // two rings of power on the right flipper, the Ring of Ainz Ooal Gown first
    const rings = new Group();
    for (let i = 0; i < 2; i++) rings.add(fig(new TorusGeometry(0.045, 0.012, 8, 18), i ? GOLD.hi : GOLD.mid, GOLD.lo, { pos: [0.31, 0.22 + i * 0.05, 0.2], rot: [Math.PI / 2, 0.5, 0], lineMul: 0.6 }));
    rings.add(fig(new SphereGeometry(0.018, 8, 6), "#b46bff", "#34205f", { pos: [0.31, 0.27, 0.245], line: 0.5 }));
    ctx.seal.attach(rings, 1); hero.rings = rings;
    // Staff of Ainz Ooal Gown: gold shaft, a crown of seven serpent gems (canonical order), gold claws
    const staff = new Group();
    staff.add(fig(new CylinderGeometry(0.016, 0.02, 0.9, 10), GOLD.mid, GOLD.lo, { pos: [0, 0.4, 0] }));
    staff.add(fig(new CylinderGeometry(0.024, 0.024, 0.04, 10), GOLD.hi, GOLD.lo, { pos: [0, 0.46, 0], line: 0.6 }));
    staff.add(fig(new TorusGeometry(0.1, 0.014, 8, 24).rotateX(Math.PI / 2), GOLD.hi, GOLD.mid, { pos: [0, 0.9, 0] }));
    hero.gems = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const g = fig(new SphereGeometry(0.03, 10, 8), GEM[i], GEM[i], { pos: [Math.cos(a) * 0.1, 0.9, Math.sin(a) * 0.1], line: 0.5 });
      staff.add(g); hero.gems.push(g);
      staff.add(fig(new ConeGeometry(0.012, 0.09, 6), GOLD.hi, GOLD.mid, { pos: [Math.cos(a) * 0.1, 0.96, Math.sin(a) * 0.1], line: 0.4 })); // claws
    }
    staff.position.set(0.27, 0.0, 0.25);
    ctx.seal.attach(staff, 1); hero.staff = staff;
  }

  // ---------- VICTIM costumes (data, own folder)
  const ARMOUR = "#9aa0b0", ARMOUR_S = "#5a5f72";
  const COSTUME = {
    warrior: { scale: 0.55, layers: [{ type: "armour", col: ARMOUR, shade: ARMOUR_S }], hat: { kind: "helmet", col: ARMOUR, shade: ARMOUR_S }, weapon: { kind: "shield", hand: "l", col: "#f0b429", trim: "#c82040" }, eyes: { style: "round" } },
    mage: { scale: 0.52, layers: [{ type: "cloak", col: "#2f6ab0", shade: "#173a70", trim: "#f4f4f4", len: 1 }], hat: { kind: "pointed", col: "#1a3a8a", shade: "#0c1c4a" }, weapon: { kind: "staff", hand: "r", col: "#7a4a2a", trim: "#f0b429", gem: "#f0b429" }, eyes: { style: "round" } },
    rogue: { scale: 0.5, layers: [{ type: "cloak", col: "#3a8a5a", shade: "#1c4a30", len: 0.7, collar: true }, { type: "uniform", col: "#7a4a2a", shade: "#40250f", buttons: "#c9a24a" }], weapon: { kind: "sword", hand: "r", col: "#cdd4e0" }, eyes: { style: "round" } },
    soldier: { scale: 0.5, layers: [{ type: "coat", col: "#7a4a2a", shade: "#40250f", open: 0 }], hat: { kind: "helmet", col: "#b8bcc8", shade: "#6a6e80" }, weapon: { kind: "spear", hand: "r", col: "#6a4a2a", trim: "#cdd4e0" }, eyes: { style: "round" } },
    maid: { scale: 0.42, layers: [{ type: "uniform", col: "#1a1822", shade: "#08070c", buttons: "#f0f0f0" }, { type: "sash", col: "#f4f4f4" }], hair: "bob", eyes: { style: "round" } },
  };

  const vics = [];
  const add = (kind, lx, lz, tag) => {
    const v = kit.costumedSeal(engine, { ...COSTUME[kind], name: `${kind}${vics.length}` });
    const [wx, wz] = toWorld(lx, lz);
    const yaw = Math.atan2(S0.at[0] - wx, S0.at[2] - wz); // faces the seal
    v.place(wx, S0.at[1], wz, yaw);
    group.add(v.group);
    const out = Math.hypot(wx - S0.at[0], wz - S0.at[2]) || 1;
    const rec = { kind, v, wx, wz, y0: S0.at[1], yaw, dx: (wx - S0.at[0]) / out, dz: (wz - S0.at[2]) / out, i: tag };
    const pr = v.props.children; // order: hat?, accessories, weapon
    if (kind === "warrior") {
      rec.shield = pr[1];
      const sw = kit.WEAPONS.sword(engine, { col: "#cdd4e0" }); sw.position.set(0.27, 0.2, 0.2); sw.rotation.set(0.1, 0, -0.9); sw.scale.setScalar(0.7); v.props.add(sw);
      v.props.add(fig(new ConeGeometry(0.05, 0.22, 8), "#c82040", "#7a1428", { pos: [0, 0.98, -0.03], rot: [-0.5, 0, 0], line: 0.8 }));
      v.props.add(fig(new ConeGeometry(0.035, 0.16, 8), "#c82040", "#7a1428", { pos: [0, 0.95, -0.07], rot: [-0.9, 0, 0], line: 0.7 }));
    } else if (kind === "mage") {
      rec.hat = pr[0];
      for (let b = -1; b <= 1; b++) v.props.add(fig(new ConeGeometry(0.05, 0.2 - Math.abs(b) * 0.04, 8), "#f0f0f0", "#b8b8c4", { pos: [b * 0.065, 0.36, 0.22], rot: [Math.PI - 0.2, 0, b * 0.25], line: 0.7 })); // white beard, 3 clumps
    } else if (kind === "rogue") {
      v.props.add(fig(new SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), "#3a8a5a", "#1c4a30", { pos: [0, 0.56, -0.02], rot: [-0.18, 0, 0] })); // hood
      pr[0].scale.setScalar(0.45); // the kit sword becomes a dagger
      const d2 = kit.WEAPONS.sword(engine, { col: "#cdd4e0" }); d2.position.set(-0.27, 0.28, 0.25); d2.scale.setScalar(0.45); v.props.add(d2); // twin daggers
      const sd = fig(new SphereGeometry(0.035, 8, 6).scale(0.8, 1.3, 0.8), "#6ac8ff", "#3a8ad0", { pos: [0.24, 0.82, 0.15], line: 0.5 }); // sweat drop
      sd.visible = false; rec.sweat = sd; v.props.add(sd);
    } else if (kind === "soldier") {
      for (const s of [-1, 1]) v.props.add(fig(new ConeGeometry(0.035, 0.14, 6), "#c82040", "#7a1428", { pos: [s * 0.05, 0.93, 0], rot: [0, 0, -s * 0.4], line: 0.5 })); // two helmet tufts
    }
    vics.push(rec);
    return rec;
  };
  // invaders: two crescent rows in the seal's frame, off the camera arc (|az| 1.3 to 2.5) so none sits between lens and seal
  const row = (kinds, r, az0, dAz, side) => kinds.forEach((k, i) => { const az = (az0 + dAz * i) * side; add(k, Math.sin(az) * r, Math.cos(az) * r, i); });
  row(["warrior", "mage", "rogue", "warrior", "mage"], 5.2, 1.3, 0.28, 1);
  row(["warrior", "rogue", "mage", "warrior", "rogue"], 6.3, 1.45, 0.26, -1);
  // soldiers x6: a spear line along the hall, three per side, falling like dominoes
  for (let i = 0; i < 3; i++) { add("soldier", 8.2, 1.5 + i * 1.5, i); add("soldier", -8.2, 1.5 + i * 1.5, i + 3); }
  // the Pleiades maid: set dressing at the stair top (not a victim), bows from 2.3 s
  const maid = kit.costumedSeal(engine, { ...COSTUME.maid, name: "maid" });
  { const [mx, mz] = toWorld(1.6, -4.4); maid.place(mx, S0.at[1] + STAIR_TOP_Y, mz, S0.yaw + 0.25); group.add(maid.group); }

  // ---------- star bursts (shield shatter, fizzle sparks) and the hero's gem sparkle: crossed 4-point additive stars
  const starGeo = star4(1, 0.28);
  const sMat = (c) => new MeshBasicMaterial({ color: c, side: DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const starW = sMat("#ffffff"), starG = sMat("#fff4c0");
  const cross = (mat) => { const m = new Group(); const a = new Mesh(starGeo, mat), b = new Mesh(starGeo, mat); b.rotation.y = Math.PI / 2; m.add(a, b); return m; };
  const NSTAR = 10;
  const bursts = vics.filter((r) => r.kind === "warrior" || r.kind === "mage").map((r) => {
    const stars = [];
    for (let k = 0; k < NSTAR; k++) {
      const m = cross(k % 2 ? starW : starG); m.visible = false; group.add(m);
      const th = rng() * Math.PI * 2, ph = (rng() * 0.6 + 0.2) * Math.PI;
      stars.push({ m, v: [Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.9 + 0.5, Math.sin(ph) * Math.sin(th)], sp: 1.0 + rng() * 1.4, sz: 0.07 + rng() * 0.07 });
    }
    return { r, f0: r.kind === "warrior" ? 6 : 0, life: 0.55, stars };
  });
  const sparkles = hero.gems.map((g, i) => { const m = cross(starW); m.visible = false; hero.staff.add(m); m.position.copy(g.position); return { m, i }; });

  // ---------- victim reaction: pure function of s (seconds since the slam); f = frames at 24 fps
  const react = (r, s, tt) => {
    const { v } = r, f = s * 24;
    let x = r.wx, z = r.wz, y = r.y0, yaw = r.yaw;
    const run = (f0, spd) => { const d = Math.max(0, (f - f0) / 24) * spd; x += r.dx * d; z += r.dz * d; yaw = Math.atan2(r.dx, r.dz); };
    v.react("terror", 0); // clears every pose channel
    if (f < 0) { // braced / lined up: a held tremble, mouths wide
      v.setPose("terror", 0.5 + 0.2 * Math.sin(r.i)); v.expression(r.kind === "mage" ? "awe" : "terror", 0.7);
    } else if (r.kind === "warrior") { // 0-6 brace, 6-14 shield shatters (stars), 14-30 flee, 4-frame tumble
      if (f < 6) { v.setPose("recoil", f / 6); v.expression("terror", 1); }
      else if (f < 14) { v.setPose("recoil", 1); v.setPose("kneel", ramp(6, 14, f) * 0.6); v.expression("terror", 1); }
      else if (f < 30) { v.setPose("stagger", 0.9); v.expression("terror", 1); run(14, 3.4); y += 0.12 * Math.abs(Math.sin(tt * 18)); }
      else { run(14, 3.4 * (1 - ramp(30, 34, f))); v.setPose("blown", ramp(30, 34, f) * 0.5); v.setPose("fallen", ramp(30, 36, f)); v.expression("shut", ramp(30, 38, f)); }
      if (r.shield) r.shield.visible = f < 6;
    } else if (r.kind === "mage") { // 0-4 fizzle, 4-12 hat flies off, 12-24 faint backward
      if (f < 4) { v.setPose("terror", 1); v.expression("awe", 1); }
      else if (f < 12) { v.setPose("recoil", ramp(4, 8, f)); v.expression("terror", 1); }
      else { v.setPose("fallen", ramp(12, 24, f)); v.setPose("blown", 0.25 * ramp(12, 24, f)); v.expression("shut", ramp(14, 24, f)); }
      if (r.hat) { // ballistic hat, tumbling: p(a) = v0 a + g a^2/2
        const a = Math.max(0, (f - 4) / 24);
        r.hat.position.set(1.0 * a * (r.i % 2 ? 1 : -1), 2.7 * a - 4.0 * a * a, -2.4 * a);
        r.hat.rotation.set(a * 9, a * 5, a * 7); r.hat.visible = a < 1.3;
      }
    } else if (r.kind === "rogue") { // frame 0 jump 1 m, 12 frames of cartoon hover, then run
      const hop = f < 4 ? Math.sin((f / 4) * Math.PI / 2) : f < 16 ? 1 : 1 - ramp(16, 20, f);
      y += hop;
      v.setPose("cower", 0.4 + 0.3 * hop); v.expression("terror", 1);
      if (f >= 20) { v.setPose("stagger", 0.7); run(20, 3.8); y += 0.1 * Math.abs(Math.sin(tt * 20)); }
      if (r.sweat) r.sweat.visible = true;
    } else { // soldier: ripple fall like dominoes, 5 frames apart
      const fd = f - r.i * 5;
      if (fd < 0) { v.setPose("terror", 0.6); v.expression("terror", 1); }
      else if (fd < 4) { v.setPose("stagger", ramp(0, 4, fd)); v.expression("terror", 1); }
      else { v.setPose("fallen", ramp(4, 10, fd)); v.expression("shut", ramp(6, 12, fd)); }
    }
    v.place(x, y, z, yaw);
    v.update(tt);
  };

  // ---------- hero extras: staff slam, rise, flex, gem sparkle, cloak squash. (The pup's own poses come from scene.seal.track.)
  const heroStaff = (cue, tt) => {
    const t0 = beatStart(cue, "slam", FB.slam), tf = beatStart(cue, "fly", FB.fly), tx = beatStart(cue, "flex", FB.flex);
    const s = tt - t0, f = s * 24, st = hero.staff;
    // slow lift 1.2 s before, a 3-frame slam to the stone, then a decaying rattle
    let lift = 0, rot = 0;
    if (s < 0) { const u = ramp(-1.2, -0.12, s); lift = 0.3 * u; rot = -0.25 * u; }
    else if (s < 3 / 24) { const u = s / (3 / 24); lift = 0.3 * (1 - u * u); rot = -0.25 * (1 - u); }
    else { const a = s - 3 / 24; lift = 0.012 * Math.exp(-a * 7) * Math.sin(a * 60); }
    const flyK = ramp(0, 0.5, tt - tf) * (tt < tx ? 1 : 0), flexK = ramp(0, 0.4, tt - tx);
    st.position.set(0.27, lift + 0.18 * Math.max(flyK, flexK), 0.25);
    st.rotation.set(rot + 0.18 * flexK, 0, -0.08 * flexK);
    // 6-frame squash of the cloak on the slam (sy = 1 - 0.2 sin(pi f/6), volume kept)
    const sq = f >= 0 && f < 6 ? 1 - 0.2 * Math.sin((f / 6) * Math.PI) : 1;
    if (hero.shell) hero.shell.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    // gem sparkle: 2 frames on, 4 off, rotating through the gems; doubled once the staff is raised for the flex
    const fr = Math.floor(tt * 24), cyc = Math.floor(fr / 6), on = fr % 6 < 2;
    for (const sp of sparkles) {
      const vis = on && tt > 2.3 && (sp.i === cyc % 7 || (flexK > 0.5 && sp.i === (cyc + 3) % 7));
      sp.m.visible = vis; if (vis) sp.m.scale.setScalar(0.07 + 0.03 * ((fr % 3) / 2));
    }
  };

  const bursts_ = (cue, tt) => {
    const t0 = beatStart(cue, "slam", FB.slam);
    for (const b of bursts) {
      const a = tt - (t0 + b.f0 / 24), o = [b.r.wx, b.r.y0 + 0.28, b.r.wz];
      for (const st of b.stars) {
        const live = a >= 0 && a < b.life;
        st.m.visible = live;
        if (!live) continue;
        st.m.position.set(o[0] + st.v[0] * st.sp * a, o[1] + st.v[1] * st.sp * a - 2.45 * a * a, o[2] + st.v[2] * st.sp * a);
        st.m.scale.setScalar(st.sz * (1 - a / b.life) * (b.r.kind === "mage" ? 0.7 : 1.4));
        st.m.rotation.y = a * 8; st.m.rotation.z = a * 6;
      }
    }
  };

  const update = (t, dt, cue) => {
    const s = t - beatStart(cue, "slam", FB.slam);
    for (const r of vics) react(r, s, t);
    maid.react("bow", 0); maid.setPose("bow", ramp(2.3, 3.0, t) * (t < 8.4 ? 1 : 0.4)); maid.expression("calm", 1);
    maid.update(t);
    heroStaff(cue, t);
    bursts_(cue, t);
  };

  const dispose = () => {
    for (const r of vics) r.v.dispose();
    maid.dispose();
    starGeo.dispose(); starW.dispose(); starG.dispose();
    group.traverse((o) => { if (o.isMesh && o.geometry && o.geometry !== starGeo && !o.userData?.shared) o.geometry.dispose?.(); });
  };
  return { group, update, dispose };
}
