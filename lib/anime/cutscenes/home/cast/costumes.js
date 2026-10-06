// CAST costumes for home (Vinland Saga, Thors). Every being here is a SMALL SEAL on the locked pup body (costumed-seal-kit).
// Colours are the bible's (scripts/home.md 3.14, 3.11, 3.15), read by eye from ref 06 / 01 / 03.
// Nothing here is emissive; fills stay under the shared lit-luma cap 0.92 (L8).

const dk = (THREE, hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] }; // the locked pup's head
const HEADF = { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

// a rigid painted prop with the ink hull (same recipe as the kit's own props)
function prop(ctx, geo, col, shade, o = {}) {
  const f = ctx.engine.figure(ctx.sdf.painted(geo, ctx.sdf.paint(col, shade ?? dk(ctx.THREE, col, 0.55), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  return f;
}
const add = (ctx, parent, obj) => { parent.add(obj); ctx.setLayer(obj, 1); return obj; };

// ---------------------------------------------------------------- THORS-SEAL (bible 3.14, ref 06)
// tunic slate #6b7a96 / #4f5c78 / #343c58, sleeves tan #b9ab92 / #8d8068, cross-strap #4a3226 + buckle #c8a04a,
// belt #3a2c26 + buckle #d8b040, collar #5a3a2c, empty scabbard loop (NO sword), brow scar #8a4a3a,
// hair: crown sweep + two side bangs + 3-segment ponytail tied #b83a2a, beard of 3 clumps + a darker chin tuft,
// ragged fur trim #c89a4a / #8a6a38 on the shoulders (ref 03, egg 8).
export function thorsSpec(scale) {
  const hairCol = { base: "#1c1a1e", shade: "#0c0b0e", hi: "#6a6068" };
  return {
    name: "thors-seal", scale, ink: "#3a2a22",
    layers: [
      { type: "coat", col: "#6b7a96", shade: "#343c58", open: 0.04, collar: "#5a3a2c" },
      { type: "sash", col: "#3a2c26", shade: "#241a16", knot: "#d8b040" },
    ],
    // crown sweep (6 clumps, one highlight streak each) + two side bangs (the fringe lock); the ponytail is a separate swinging mesh
    hair: { preset: "swept", count: 6, layers: 1, length: [0.16, 0.26], width: 0.07, lift: 0.4, sweep: [0, 0.1, -0.5], droop: 0.12, color: hairCol,
      cut: { at: [0.45, 0.62], slant: 0.18, rate: 0.7 }, fringe: { n: 2, length: 0.2, at: [0.05, 0.78, 0.2], sweep: [0.35, -0.8, 0.45] }, seed: 11 },
    eyes: { style: "round", iris: "#3a5a8a", irisLo: "#22385a", lash: "#2a1c18", gap: 0.122, y: 0.572 }, // half-lidded through the "calm" expression
  };
}

export function buildThors(ctx, sc) {
  const T = ctx.THREE, K = ctx.kit;
  const s = K.costumedSeal(ctx.engine, thorsSpec(sc));
  const body = s.body;
  // ponytail: its own mesh, pivoting at the tie so it can swing on twos (3 clumps = the 3 segments)
  const pony = new T.Group();
  pony.position.set(0, 0.74, -0.2);
  pony.add(K.hairMesh(ctx.engine, { count: 0, layers: 0, color: { base: "#1c1a1e", shade: "#0c0b0e", hi: "#6a6068" }, cut: { at: [0.35, 0.55], slant: 0.1, rate: 1 },
    tail: { n: 3, length: 0.5, width: 0.07, at: [0, 0, 0], sweep: [0, -0.3, -0.4] }, seed: 5 }, HEADF, { ink: "#3a2a22" }));
  pony.add(prop(ctx, new T.CylinderGeometry(0.045, 0.045, 0.03, 10), "#b83a2a", "#6a1c14"));
  add(ctx, body, pony);
  // beard: 3 clumps, then a darker chin tuft
  const beard = { band: [1.15, 1.7], sector: [-0.75, 0.75], count: 3, layers: 1, length: [0.1, 0.17], width: 0.07, lift: 0.25, sweep: [0, -0.5, 0.15], droop: 0.35, spike: 0.2,
    color: { base: "#2a2420", shade: "#120e0c", hi: "#4a4038" }, cut: { at: [0.3, 0.45], slant: 0.1, rate: 0.5 }, seed: 3 };
  add(ctx, body, K.hairMesh(ctx.engine, beard, HEADF, { ink: "#3a2a22" }));
  add(ctx, body, K.hairMesh(ctx.engine, { ...beard, band: [1.62, 1.8], sector: [-0.2, 0.2], count: 1, length: [0.1, 0.13], color: { base: "#17120f", shade: "#0a0706", hi: "#2a2420" }, seed: 9 }, HEADF, { ink: "#3a2a22" }));
  // cloth details the SDF layers cannot colour separately
  const strap = prop(ctx, new T.BoxGeometry(0.045, 0.62, 0.014), "#4a3226", "#2c1f1a", { pos: [0.015, 0.29, 0.335], rot: [0, 0, -0.62] });
  const buckle = prop(ctx, new T.BoxGeometry(0.05, 0.05, 0.012), "#c8a04a", "#7a5a1c", { pos: [0.015, 0.29, 0.345], rot: [0, 0, -0.62] });
  const loop = prop(ctx, new T.TorusGeometry(0.032, 0.009, 6, 14), "#4a3226", "#2c1f1a", { pos: [-0.32, 0.17, 0.12], rot: [0, 1.2, 0] }); // the empty scabbard loop: the blade left at home (egg 5)
  const cuffs = [1, -1].map((sx) => prop(ctx, new T.CylinderGeometry(0.075, 0.088, 0.075, 14), "#b9ab92", "#8d8068", { pos: [sx * 0.283, 0.19, 0.2], rot: [0.9, 0, sx * 0.45] })); // tan sleeves
  for (const o of [strap, buckle, loop, ...cuffs]) add(ctx, body, o);
  // brow scar, 2 px #8a4a3a over the right eye
  const fp = K.faceOnHead(HEAD, 0.135, 0.638, 0.003);
  const scar = prop(ctx, new T.BoxGeometry(0.01, 0.07, 0.004), "#8a4a3a", "#5a2a20", { line: 0.4, lineMul: 0.3 });
  scar.position.copy(fp.p); scar.lookAt(fp.p.clone().add(fp.n)); scar.rotateZ(0.5);
  add(ctx, body, scar);
  // ragged fur trim on the shoulders / collar (ref 03): ten uneven tufts about the neck, two alternating browns
  const fur = new T.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2, len = 0.085 + 0.05 * ((i * 7) % 5) / 4, ra = 0.265;
    const dir = new T.Vector3(Math.sin(a), 0.35, Math.cos(a) * 0.9).normalize();
    const t = prop(ctx, new T.ConeGeometry(0.038, len, 5), i % 2 ? "#c89a4a" : "#8a6a38", i % 2 ? "#8a6a38" : "#5a4424", { lineMul: 0.7 });
    t.position.set(Math.sin(a) * ra, 0.455, 0.02 + Math.cos(a) * ra * 0.92);
    t.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    fur.add(t);
  }
  add(ctx, body, fur);
  s.pony = pony;
  s.expression("calm", 1);
  return s;
}

// ---------------------------------------------------------------- the orca and calf (bible 3.11): a seal in an orca costume
// black #1b2638 (shade #0f1624), white belly #f7f3ea / #cfc9d8, white eye patch, dorsal fin, anime eye with a catch-light and one lash.
// Lies prone: the costumed group is rotated rx = +90 degrees so its head points +z of the rig.
export function buildOrca(ctx, sc, calf = false) {
  const T = ctx.THREE, K = ctx.kit;
  const s = K.costumedSeal(ctx.engine, {
    name: calf ? "orca-calf" : "orca", scale: sc, coat: "#1b2638", shade: "#0f1624", ink: "#0b0f18", shadow: false,
    eyes: { style: "round", iris: "#2a3350", irisLo: "#141c30", sclera: "#f7f3ea", lash: "#0b0f18", gap: 0.14, y: 0.575, size: [0.075, 0.085] },
  });
  const u = s.fig.userData.mat.uniforms;
  u.uDecCol.value.set("#f7f3ea"); u.uDecShade.value.set("#cfc9d8"); // the belly decal is the orca's white underside
  for (const sx of [1, -1]) { // white eye patch behind each eye
    const p = K.faceOnHead(HEAD, sx * 0.205, 0.63, 0.0015);
    const patch = prop(ctx, new T.SphereGeometry(0.05, 12, 8).scale(1.5, 0.7, 0.3), "#f7f3ea", "#cfc9d8", { line: 0.5, lineMul: 0.5 });
    patch.position.copy(p.p); patch.lookAt(p.p.clone().add(p.n)); patch.rotateZ(sx * 0.5);
    add(ctx, s.body, patch);
  }
  add(ctx, s.body, prop(ctx, new T.ConeGeometry(0.1, 0.4, 14), "#1b2638", "#0f1624", { pos: [0, 0.5, -0.27], rot: [-0.55, 0, 0] })); // dorsal fin
  for (const sx of [1, -1]) add(ctx, s.body, prop(ctx, new T.ConeGeometry(0.06, 0.2, 10), "#1b2638", "#0f1624", { pos: [sx * 0.33, 0.2, 0.1], rot: [0, 0, -sx * 1.2] })); // pectoral paddles
  s.group.rotation.x = Math.PI / 2;
  s.group.scale.set(sc * 0.88, sc * 1.25, sc * 0.88); // body axis (local y) stretched toward the 5.2 m spindle
  s.expression("calm", 1);
  const rig = new T.Group();
  rig.rotation.order = "YXZ";
  rig.add(s.group);
  s.rig = rig;
  return s;
}

// ---------------------------------------------------------------- extras: two penguins and the gull (bible 3.15), costumed seals
// penguin: coat #2b3150 / #1b1f38, belly #f6f0e6 (the belly decal), beak and feet #e8862d
export function buildPenguin(ctx, sc) {
  const T = ctx.THREE;
  const s = ctx.kit.costumedSeal(ctx.engine, { name: "penguin", scale: sc, coat: "#2b3150", shade: "#1b1f38", ink: "#3a2a22" });
  const u = s.fig.userData.mat.uniforms; u.uDecCol.value.set("#f6f0e6"); u.uDecShade.value.set("#cdc6d6");
  add(ctx, s.body, prop(ctx, new T.ConeGeometry(0.04, 0.12, 6), "#e8862d", "#a8561a", { pos: [0, 0.48, 0.3], rot: [Math.PI / 2, 0, 0], lineMul: 0.6 }));
  for (const sx of [1, -1]) add(ctx, s.body, prop(ctx, new T.CylinderGeometry(0.07, 0.07, 0.015, 8), "#e8862d", "#a8561a", { pos: [sx * 0.15, 0.01, 0.12], lineMul: 0.5 }));
  return s;
}
// gull: white #fbf8f2 / #d5d0dc, grey wing tips #9aa2b6 (the cape layer reads as folded wings), beak #e8b84a
export function buildGull(ctx, sc) {
  const T = ctx.THREE;
  const s = ctx.kit.costumedSeal(ctx.engine, {
    name: "gull", scale: sc, coat: "#fbf8f2", shade: "#d5d0dc", ink: "#3a2a22",
    layers: [{ type: "cape", col: "#fbf8f2", shade: "#9aa2b6", trim: "#9aa2b6" }],
  });
  const u = s.fig.userData.mat.uniforms; u.uDecCol.value.set("#fbf8f2"); u.uDecShade.value.set("#d5d0dc");
  add(ctx, s.body, prop(ctx, new T.ConeGeometry(0.035, 0.13, 6), "#e8b84a", "#a8841a", { pos: [0, 0.5, 0.31], rot: [Math.PI / 2, 0, 0], lineMul: 0.6 }));
  return s;
}
