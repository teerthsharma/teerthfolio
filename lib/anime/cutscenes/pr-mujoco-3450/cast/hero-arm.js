// HERO PUNCH ARM (E07) + the red wristband (E06 egg 3).
// The locked pup's own flippers are short and unrestyled, so the Serious Punch is an ATTACHED extension (seal.attach): a white cel
// flipper that grows from the right flipper's root up the punch diagonal to a mitt with a 4-knuckle bump line, a 4-point star glint
// and a smear. Foreshortening to the 12 mm lens is the camera's; the mesh is a plain tapered flipper.
//   arm   a unit-length round cone along +z (radius 0.075 at the root to 0.095 at the wrist), scaled in z to the live reach E
//   mitt  an ellipsoid [0.15 0.14 0.17] + 4 knuckle ellipsoids on its front arc, carried at z = E + 0.06
//   reach E(t) = 1.9 ext(t):   ext = easeOutCubic(win(TP-0.03, TP+0.08)) (3 drawings, on ones)  held to f115  then  1 - smooth(f115..f135)
//   smear w = 0.9 (1 - win(TP, TP+3/24)) along -z (engine uSmear, object space; the arm's own +z is the strike direction)
//   multiples: two shorter ghost arms at 0.70 E and 0.42 E, +-0.06 rad off axis, visible f95-96 only
//   star glint: two crossed thin boxes billboarded to the camera, 14 px-ish, on for TP..TP+0.25
//   wristband: a 2 px red torus #d63a2c on the rest flipper's wrist from f90, riding the arm's wrist once it extends
// Punch direction (seal-local): scene.punch.dir, else toward scene.hull.at (a world point), else (0.42, 0.58, 0.69) normalised.
import { eo3, sm, win, clamp01 } from "./timeline.js";

export const WRISTBAND = true; // owner to confirm against the locked design (bible E06); false drops it

export function buildHeroArm(ctx, T, P, frame) {
  const { THREE, sdf } = ctx;
  const { paint, ell, cone, polygonize } = sdf;
  const fur = paint("#fdfbf7", "#a9a8b6", { line: 1 });
  const S0 = new THREE.Vector3(0.245, 0.33, 0.17);
  // direction
  let dir = new THREE.Vector3(0.42, 0.58, 0.69);
  const sc = ctx.scene;
  if (sc.punch?.dir) dir.set(...sc.punch.dir);
  else if (sc.hull?.at) { const l = frame.toLocal(...sc.hull.at); dir.set(l[0] - S0.x, l[1] - S0.y, l[2] - S0.z); }
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  // geometry (built once, shared by the main arm and the ghosts)
  const armGeo = polygonize([cone([0, 0, 0], [0, 0, 1], 0.075, 0.095, fur, 0.03)], 0.02);
  const mittGeo = polygonize([
    ell([0, 0, 0], [0.15, 0.14, 0.17], fur, 0.04),
    ...[-0.075, -0.025, 0.025, 0.075].map((x) => ell([x, 0.055, 0.145], [0.036, 0.034, 0.036], fur, 0.02)),
  ], 0.014);
  P.own(armGeo); P.own(mittGeo);
  const mk = () => {
    const root = new THREE.Group();
    const arm = ctx.engine.figure(armGeo, { lineMul: 1.3, constant: true });
    const mitt = ctx.engine.figure(mittGeo, { lineMul: 1.3, constant: true });
    for (const f of [arm, mitt]) { f.frustumCulled = false; f.children.forEach((c) => { c.frustumCulled = false; }); }
    root.add(arm, mitt);
    root.position.copy(S0); root.quaternion.copy(q);
    root.visible = false;
    return { root, arm, mitt };
  };
  const main = mk(), g1 = mk(), g2 = mk();
  const REACH = 1.9;
  // star glint on the mitt (upper-left in screen space, billboarded)
  const star = new THREE.Group();
  star.add(P.solid(new THREE.BoxGeometry(0.17, 0.016, 0.004), "#ffffff", "#ffffff", { hull: false }), P.solid(new THREE.BoxGeometry(0.016, 0.17, 0.004), "#ffffff", "#ffffff", { hull: false }),
    P.solid(new THREE.BoxGeometry(0.085, 0.010, 0.004), "#ffffff", "#ffffff", { hull: false, rot: [0, 0, Math.PI / 4] }), P.solid(new THREE.BoxGeometry(0.085, 0.010, 0.004), "#ffffff", "#ffffff", { hull: false, rot: [0, 0, -Math.PI / 4] }));
  star.position.set(-0.07, 0.12, 0.12);
  main.mitt.add(star);
  // wristbands: rest (on the pup's flipper wrist) and carried (on the extended wrist)
  const band = WRISTBAND ? {
    rest: P.solid(new THREE.TorusGeometry(0.058, 0.013, 8, 22), "#d63a2c", "#7a1a1c", { pos: [0.275, 0.21, 0.195], lineMul: 0.6 }),
    carried: P.solid(new THREE.TorusGeometry(0.105, 0.016, 8, 22), "#d63a2c", "#7a1a1c", { lineMul: 0.6 }),
  } : null;
  if (band) { band.rest.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.3, -0.9, 0.35).normalize()); band.rest.visible = false; band.carried.visible = false; main.root.add(band.carried); }
  const group = new THREE.Group();
  group.add(main.root, g1.root, g2.root);
  if (band) group.add(band.rest);
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  function place(o, E, tilt = 0, smear = 0) {
    o.root.visible = E > 0.02;
    if (!o.root.visible) return;
    o.arm.scale.set(1, 1, E);
    o.mitt.position.set(0, 0, E + 0.06);
    o.root.quaternion.copy(q);
    if (tilt) o.root.quaternion.multiply(tmpQ.setFromAxisAngle(tmpV.set(1, 0, 0), tilt));
    o.arm.userData.mat.uniforms.uSmear.value.set(0, 0, -1, smear); o.arm.userData.hull.uniforms.uSmear.value.copy(o.arm.userData.mat.uniforms.uSmear.value);
    o.mitt.userData.mat.uniforms.uSmear.value.set(0, 0, -1, smear); o.mitt.userData.hull.uniforms.uSmear.value.copy(o.mitt.userData.mat.uniforms.uSmear.value);
  }
  function update(t, tNow) {
    const { TP, at } = T;
    const strike = tNow !== undefined && tNow >= TP - 0.05 && tNow < TP + 4 / T.F;
    const tc = strike ? tNow : t;
    const ext = eo3(win(tc, TP - 0.03, TP + 0.08)) * (1 - sm(win(tc, at(115), at(135))));
    const E = REACH * ext;
    const smear = 0.9 * (1 - win(tc, TP, TP + 3 / T.F)) * (tc >= TP - 0.03 ? 1 : 0);
    place(main, E, 0, smear);
    const ghost = tc >= TP + 1 / T.F && tc < TP + 3 / T.F;
    place(g1, ghost ? E * 0.7 : 0, 0.06, 0.5); place(g2, ghost ? E * 0.42 : 0, -0.06, 0.3);
    // star glint: faces the camera, on for the strike
    star.visible = main.root.visible && tc >= TP && tc < TP + 0.25;
    if (star.visible) {
      const cam = ctx.player.camera;
      main.mitt.updateWorldMatrix(true, false);
      main.mitt.getWorldQuaternion(tmpQ).invert().multiply(cam.quaternion);
      star.quaternion.copy(tmpQ);
      star.scale.setScalar(1 + 0.4 * Math.sin(Math.PI * clamp01(win(tc, TP, TP + 0.25))));
    }
    if (band) {
      const shown = tc >= at(90);
      const ext1 = E > 0.05;
      band.rest.visible = shown && !ext1;
      band.carried.visible = shown && ext1;
      band.carried.position.set(0, 0, Math.max(0.05, E * 0.9));
    }
  }
  return { group, update, dispose() {} };
}
