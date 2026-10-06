// p-epsilon-hollow CAST: the shard, the gravestone blade the seal wields (bible 3.8, shots 6-10).
// Blade profile 0.2 m wide x 1.9 m with a 5% curve: spine offset cx(s) = 0.05 L s^2 (s = 0..1 up the blade), half-width
// hw(s) = 0.1 (1 - s^3.2) + 0.004, tip pointed. Body = stone #5a4a63 / shade #231e2a with the cel ink; edge = the same outline with an inward
// inset of 0.014 m, gold #ffb524 (basic material, bloom-eligible: only the hero seal is excluded from bloom); core vein teal #19e6c8;
// smear fan = pale #ffe7a8 (the energy-contour language of ref 04).
// Everything is in the SEAL frame; a root group copies the seal's world transform each update (the hero may move).
// Timeline (seconds): rise 6.4-8.3 out of the sleeper (1.0 m/s), glide to the flipper 8.3-9.0, held 9.0-27.0 (the seal's "raise" pose is the
// direction layer's track), swing 26.8-27.258 = anticipation 3f, smear 2f, strike 4f, hold 2f at 24 fps.
//   swing angle th(u), u = t - 26.8:  [0, 0.125]     0 -> -0.5 (ease out)   anticipation, the top leans back
//                                     [0.125, 0.208] -0.5 -> 0.3 linear     SMEAR (fan visible, edge pale)
//                                     [0.208, 0.375] 0.3 -> 1.45 smooth     strike, blade points forward (the kill point)
//                                     [0.375, inf)   1.45                   hold
// th = pivot.rotation.x (about the seal-local x axis; +y toward +z).
export function buildShard(ctx, mk) {
  const { THREE } = ctx, L = 1.9, W = 0.1, CURVE = 0.05;
  const hw = (s, inset = 0) => Math.max(0.003, W * (1 - Math.pow(s, 3.2)) + 0.004 - inset);
  const cx = (s) => CURVE * L * s * s;
  const outline = (inset) => {
    const sh = new THREE.Shape(), N = 14, top = inset > 0 ? 0.985 : 1;
    sh.moveTo(cx(0) - hw(0, inset), inset);
    for (let i = 0; i <= N; i++) { const s = (i / N) * top; sh.lineTo(cx(s) - hw(s, inset), s * L); }
    for (let i = N; i >= 0; i--) { const s = (i / N) * top; sh.lineTo(cx(s) + hw(s, inset), s * L); }
    sh.lineTo(cx(0) + hw(0, inset), inset);
    return sh;
  };
  const body = mk(new THREE.ExtrudeGeometry(outline(0), { depth: 0.045, bevelEnabled: false }).translate(0, 0, -0.0225), "#5a4a63", "#231e2a", { lineMul: 1.2 });
  const rimShape = outline(0);
  rimShape.holes.push(new THREE.Path(outline(0.014).getPoints()));
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffb524 });
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025), edgeMat);
  const veinShape = new THREE.Shape();
  { const a = 0.08, b = 0.82; veinShape.moveTo(cx(a) - 0.012, a * L); veinShape.lineTo(cx(b) - 0.004, b * L); veinShape.lineTo(cx(b) + 0.004, b * L); veinShape.lineTo(cx(a) + 0.012, a * L); }
  const veinMat = new THREE.MeshBasicMaterial({ color: 0x19e6c8 });
  const vein = new THREE.Mesh(new THREE.ExtrudeGeometry(veinShape, { depth: 0.054, bevelEnabled: false }).translate(0, 0, -0.027), veinMat);
  // the smear fan: a radius 0.5-1.9 sector swept by the tip, plane YZ, angle from +y toward +z over th in [-0.5, 1.45]
  const fanG = new THREE.RingGeometry(0.5, L, 28, 1, Math.PI / 2 - 1.45, 1.95).rotateY(-Math.PI / 2);
  const fanMat = new THREE.MeshBasicMaterial({ color: 0xffe7a8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const fan = new THREE.Mesh(fanG, fanMat);
  const blade = new THREE.Group(); blade.add(body, edge, vein);
  const pivot = new THREE.Group(); pivot.add(blade); // the pivot sits at the grip: rotation.x is the swing
  const root = new THREE.Group(); root.add(pivot, fan);
  root.visible = false;
  ctx.setLayer(root, 1);
  // seal-local: the sleeper (bible 3.6: x 2.3, z -1.4) and the grip beside the right flipper, clear of the head (the seal is never covered)
  const SLEEPER = new THREE.Vector3(2.3, 0, -1.4), HELD = new THREE.Vector3(0.3, 0.55, 0.16);
  const ease = ctx.ease.smooth, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s3 = new THREE.Vector3();
  const COL_GOLD = new THREE.Color(0xffb524), COL_PALE = new THREE.Color(0xffe7a8), COL_VIO = new THREE.Color(0x7a3fc0);
  const swingAngle = (u) => {
    if (u <= 0) return 0;
    if (u < 0.125) return -0.5 * (1 - Math.pow(1 - u / 0.125, 2));
    if (u < 0.208) return -0.5 + 0.8 * ((u - 0.125) / 0.083);
    if (u < 0.375) return 0.3 + 1.15 * ease((u - 0.208) / 0.167);
    return 1.45;
  };
  return {
    root,
    update(t, tr) { // tr = { rise, swing }: the start times in seconds
      ctx.seal.group.updateWorldMatrix(true, false);
      ctx.seal.group.matrixWorld.decompose(v, q, s3);
      root.position.copy(v); root.quaternion.copy(q); root.scale.copy(s3);
      const u = t - tr.rise;
      if (u < 0) { root.visible = false; return; }
      root.visible = true;
      const rise = clamp(u / 1.9), glide = ease(clamp((u - 1.9) / 0.7));
      // rise: base from y = -1.9 (buried) to 0 at the sleeper; then glide to the grip along an arc (apex +0.6 m)
      const bx = SLEEPER.x + (HELD.x - SLEEPER.x) * glide, bz = SLEEPER.z + (HELD.z - SLEEPER.z) * glide;
      const by = -L * (1 - rise) + HELD.y * glide + 0.6 * Math.sin(Math.PI * glide);
      pivot.position.set(bx, by, bz);
      const su = t - tr.swing;
      pivot.rotation.set(swingAngle(su), 0, -0.12 * glide * (1 - clamp(su / 0.3))); // leans out 0.12 rad while held
      // edge colour: gold; pale during the smear; Susanoo purple #7a3fc0 for ONE stepped frame at 27.0 (easter egg 3)
      const vio = su >= 0.2 && su < 0.2 + 1 / 12, sm = su >= 0.125 && su < 0.208;
      edgeMat.color.copy(vio ? COL_VIO : sm ? COL_PALE : COL_GOLD);
      // teal vein: pours (bright, pulsing) while drawn 6.4-9.0, then settles to 0.55; flares at the strike
      const pour = 1 - clamp((u - 2.6) / 1.4);
      veinMat.color.setRGB(0.1, 0.9, 0.78).multiplyScalar(0.55 + 0.45 * pour * (0.7 + 0.3 * Math.sin(u * 14)) + (su > 0 && su < 0.4 ? 0.5 : 0));
      fan.position.copy(pivot.position);
      fanMat.opacity = sm ? 0.55 : 0; // the 2-frame smear only
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
