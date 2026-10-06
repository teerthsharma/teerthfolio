// DEMO SCENES for app/lab/anime. Each builder returns
//   { scene, camera, update(t, dt), duration, caption(t), sun? }
// Characters animate on the style's steps (sakuga.step); the camera is smooth.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, IcosahedronGeometry, Mesh, PerspectiveCamera, PlaneGeometry, Points, Scene, SphereGeometry, TorusGeometry, TubeGeometry, QuadraticBezierCurve3, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "./sdf.js";
import { ainzExtra, BLOB, buildFigure, rimuruPrims, staff } from "./models.js";
import { buildPup, groundShadow } from "./pup.js";
import { grass, water } from "./meadow.js";
import { polygonize, ell } from "./sdf.js";
import { bolt, boltGeometry, boltMaterial, ease3, energyMaterial, snowMaterial, step } from "./sakuga.js";
import { sky } from "./sky.js";
import { bakeShadowBias } from "./topology.js";

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SNOW = paint("#f4f7ff", "#8aa3ea");

function pine(h = 2.2, snowy = true) {
  const parts = [painted(new CylinderGeometry(0.07, 0.1, h * 0.3, 8).translate(0, h * 0.15, 0), paint("#6b4a3a", "#2e1c2a"))];
  for (let i = 0; i < 3; i++) {
    const r = 0.62 - i * 0.15, y = h * (0.3 + i * 0.22), hh = h * 0.42;
    parts.push(painted(new ConeGeometry(r, hh, 12).translate(0, y + hh / 2, 0), paint("#2f8f5e", "#16486a")));
    if (snowy) parts.push(painted(new ConeGeometry(r * 0.55, hh * 0.45, 12).translate(0, y + hh * 0.78, 0), SNOW));
  }
  return mergeGeometries(parts);
}
function rock(s = 1, seed = 1) {
  const g = mergeVertices(new DodecahedronGeometry(1, 1).deleteAttribute("uv").deleteAttribute("normal"));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.18 * Math.sin(seed * 3.1 + i * 1.7); p.setXYZ(i, p.getX(i) * k * s, p.getY(i) * k * s * 0.7, p.getZ(i) * k * s); }
  g.computeVertexNormals();
  return painted(g, paint("#a3b0cf", "#4d5a99"));
}
function ground(r = 6, y = 0) {
  const g = new CylinderGeometry(r, r * 1.04, 0.4, 64, 1).translate(0, y - 0.2, 0);
  return painted(g, SNOW);
}
function addSky(scene, o) { const s = sky(o); scene.add(s); return s; }
function cam(fov = 35) { const c = new PerspectiveCamera(fov, 1180 / 820, 0.1, 500); return c; }
function follow(c, s) { s.position.copy(c.position); }

// T1 per shot: bake the persistence-simplified bias for the shot's key light (object space)
// and keep the A2 (Laplacian AO) and raw / random baselines for the harness.
function bakeShots(fig, engine) {
  const geo = fig.userData.geo;
  const X = geo.attributes.aXrd;
  const n = X.count;
  const ao = new Float32Array(n), raw = new Float32Array(n).fill(0.5), rnd = new Float32Array(n);
  let s = 3;
  for (let v = 0; v < n; v++) { ao[v] = X.array[3 * v]; s = (s * 16807) % 2147483647; }
  // random: same magnitude distribution as the AO bias, shuffled across vertices
  const perm = Array.from(ao); for (let i = n - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  rnd.set(perm);
  fig.updateMatrixWorld();
  const L = engine.shared.uLightDir.value.clone().transformDirection(fig.matrixWorld.clone().invert());
  const t0 = performance.now();
  const { R } = bakeShadowBias(geo, L, 0.1);
  const ms = performance.now() - t0;
  const banks = { raw, ao, random: rnd, t1: R };
  fig.userData.bias = (mode) => { const b = banks[mode] ?? R; for (let v = 0; v < n; v++) X.array[3 * v] = b[v]; X.needsUpdate = true; };
  fig.userData.bias("t1");
  fig.userData.bakeMs = ms;
  fig.userData.verts = n;
  return ms;
}

// ---------------------------------------------------------------- (a) THE PAINTED WORLD
// The locked kawaii pup on a mossy ledge by teal water, grass layered fore / mid / back,
// warm key from above-left, cool shadow, green bounce, shallow depth of field.
const ROCK = paint("#7c7466", "#3d4152");
export function seal(engine) {
  const scene = new Scene();
  engine.shared.uLightDir.value.set(-0.55, 0.78, 0.3).normalize();
  engine.shared.uLightCol.value.set("#fff3dc");
  const sk = addSky(scene, { zenith: "#5f9fd8", mid: "#a9d6e8", horizon: "#e8f2d8", clouds: 0.35, sun: [-0.5, 0.7, 0.2], sunEmit: 1.0 });
  engine.sun = null;
  // the ledge and two mossy rocks: SDF blobs, brush-shaded
  const rockMesh = (prims, id) => {
    const r = engine.prop(polygonize(prims, 0.04), id);
    const u = r.material.uniforms;
    u.uBrush.value.set(1, 2.2, 1, 0.62); u.uBounce.value.set(0.02, 0.05, 0.02);
    return r;
  };
  scene.add(rockMesh([ell([0, -0.32, 0], [1.5, 0.36, 1.1], ROCK, 0.3), ell([0.9, -0.42, -0.6], [1.0, 0.4, 0.9], ROCK, 0.3), ell([-0.8, -0.45, 0.3], [0.9, 0.38, 0.8], ROCK, 0.3)], 0.5));
  const fgRock = rockMesh([ell([-0.9, -0.15, 1.5], [0.7, 0.35, 0.5], ROCK, 0.2), ell([-0.4, -0.25, 1.7], [0.5, 0.3, 0.4], ROCK, 0.2)], 0.55);
  scene.add(fgRock);
  const bank = engine.prop(painted(new SphereGeometry(1, 48, 24).scale(9, 2.2, 6).translate(4, -2.0, -6.5), paint("#4f8a3a", "#1f4a3a")), 0.2);
  scene.add(bank);
  const wtr = water(engine.shared, 80); wtr.position.set(-4, -0.55, -6); scene.add(wtr);
  // grass: the bank behind, tufts round the ledge, tall blades in the foreground (soft-focused)
  const R = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  scene.add(grass(engine.shared, 2600, (i) => { const x = -0.5 + R(i, 1) * 8, z = -1.2 - R(i, 2) * 6; return [x, -0.55 + Math.max(0, 0.4 - 0.1 * Math.abs(z + 3)), z, 0.5 + R(i, 3) * 0.9, R(i, 4) * 6.28]; }));
  scene.add(grass(engine.shared, 500, (i) => { const a = R(i, 5) * 6.28, r = 1.25 + R(i, 6) * 0.5; return [Math.cos(a) * r * 1.2, -0.35, Math.sin(a) * r * 0.85 - 0.2, 0.25 + R(i, 7) * 0.4, R(i, 8) * 6.28]; }));
  scene.add(grass(engine.shared, 70, (i) => [0.55 + R(i, 9) * 1.4, -0.4, 1.35 + R(i, 10) * 0.6, 1.1 + R(i, 11) * 0.8, R(i, 12) * 6.28, 0.035], { base: "#16301c", mid: "#2f6a2c", tip: "#9cc657" }));
  const pup = buildPup(engine);
  pup.rotation.y = 0.5; pup.position.y = 0.03;
  scene.add(pup);
  const gs = groundShadow(0.5, 0.42); gs.position.set(0.02, 0.045, 0.0); scene.add(gs);
  const camera = cam(30);
  engine.syncFaces(scene);
  const bakeMs = [bakeShots(pup, engine)];
  engine.composer.u.uDof.value.set(2.75, 1.6, 1);
  return {
    scene, camera, duration: 12, figures: { pup }, bakeMs,
    caption: (t) => (t < 6 ? "A seal pup by the water" : "…it notices you"),
    update(t) {
      const ts = step(t, engine.style.timing.fps);
      // breathing and a head tilt on twos; the camera drifts smoothly
      const br = Math.sin(ts * 2.2) * 0.012;
      pup.scale.set(1 + br, 1 - br, 1 + br);
      pup.rotation.y = 0.5 - 0.25 * smooth(5.5, 6.5, ts);
      pup.rotation.z = 0.06 * smooth(6.5, 7.2, ts) * Math.sin(ts * 1.2);
      const a = 0.42 + 0.03 * Math.sin(t * 0.3);
      camera.position.set(Math.sin(a) * 2.75, 0.95, Math.cos(a) * 2.75);
      camera.lookAt(0.05, 0.36, 0);
      follow(camera, sk);
      engine.syncFaces(scene);
    },
  };
}

// ---------------------------------------------------------------- (b) RIMURU
export function rimuru(engine) {
  const scene = new Scene();
  engine.shared.uLightDir.value.set(-0.55, 0.55, 0.62).normalize();
  engine.shared.uLightCol.value.set("#fff0dc");
  const sk = addSky(scene, { zenith: "#2a2f8f", mid: "#b46aa8", horizon: "#ffc27a", cloud: "#ffe3c4", cloudShade: "#8a5aa8", clouds: 0.45, sun: [-0.35, 0.12, -0.93], sunCol: "#ffd9a0", sunSize: 0.03 });
  engine.sun = new Vector3(-0.35, 0.12, -0.93).multiplyScalar(300);
  scene.add(engine.prop(ground(7), 0.3));
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3; const p = engine.prop(pine(2.2 + (i % 3) * 0.5), 0.4 + i * 0.01); p.position.set(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2 - 0.5); scene.add(p); }
  for (let i = 0; i < 4; i++) { const r = engine.prop(rock(0.35 + i * 0.1, i), 0.6 + i * 0.01); r.position.set(-2.5 + i * 1.6, 0.05, -2.4 + (i % 2) * 0.5); scene.add(r); }
  const seal = buildPup(engine, { blob: BLOB });
  const rim = buildFigure(engine, rimuruPrims(), 0.012, { eye: "#f3b62f", pupil: "#3a1a08", eyeSize: [0.022, 0.03, 0.01] });
  const slime = engine.figure(painted(new SphereGeometry(1, 48, 32), paint("#4fb6ff", "#2a64d8")));
  slime.scale.set(...BLOB.r); slime.position.set(...BLOB.c);
  slime.userData.mat.uniforms.uEmit.value.set(0.02, 0.05, 0.12);
  scene.add(seal, rim, slime);
  for (const f of [seal, rim]) { f.userData.hull.uniforms.uHullFade.value = 1; }
  seal.userData.hull.uniforms.uStagger.value = 0.5;
  rim.userData.hull.uniforms.uStagger.value = -0.7;
  const aura = new Mesh(new IcosahedronGeometry(1, 4), energyMaterial({ core: "#e8fbff", mid: "#55c3ff", edge: "#1f56e0", ink: "#0b1450", scale: 3 }));
  scene.add(aura);
  const ring = new Mesh(new TorusGeometry(1, 0.06, 8, 64), energyMaterial({ core: "#ffffff", mid: "#7fd6ff", edge: "#2a6ae8", scale: 6 }));
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  const camera = cam(30);
  engine.syncFaces(scene);
  const bakeMs = [bakeShots(seal, engine), bakeShots(rim, engine)];
  const D = 14;
  const shock = engine.composer.u.uShock.value;
  let fired = false;
  return {
    scene, camera, duration: D, figures: { seal, rim }, bakeMs,
    caption: (t) => (t < 2.5 ? "A seal pup on the snow" : t < 6.5 ? "Predator: it melts into a slime" : t < 9.6 ? "…and rises in human form" : "Rimuru Tempest"),
    update(t, dt) {
      const ts = step(t, engine.style.timing.fps);
      const sq = engine.style.timing.squash;
      // camera: smooth orbit, push-in on the transformation
      const a = 0.35 + t * 0.05;
      const dist = 3.6 - 1.0 * smooth(6, 10, t);
      const tgt = new Vector3(0, 0.45 + 0.45 * smooth(6.5, 10, t), 0);
      camera.position.set(Math.sin(a) * dist, 0.9 + 0.5 * smooth(6.5, 10, t), Math.cos(a) * dist).add(engine.trauma.offset(t));
      camera.lookAt(tgt);
      follow(camera, sk);
      // seal idle bob on twos, then melt
      const melt = smooth(2.5, 5, ts);
      const su = seal.userData.mat.uniforms;
      su.uMorph.value = melt; su.uSlimeAmt.value = melt;
      seal.visible = melt < 0.999;
      seal.scale.set(1 + 0.03 * Math.sin(ts * 6) * (1 - melt), 1 - 0.03 * Math.sin(ts * 6) * (1 - melt), 1);
      seal.userData.eyes.scale.setScalar(1 - smooth(2.5, 3.6, ts));
      // slime phase: bounces on twos with squash and stretch
      const rise = smooth(6.5, 9.4, ts);
      const ru = rim.userData.mat.uniforms;
      ru.uMorph.value = 1 - rise; ru.uSlimeAmt.value = 1 - smooth(6.5, 9.6, ts);
      rim.visible = ts >= 6.5;
      slime.visible = melt >= 0.999 && ts < 6.5;
      const b = Math.abs(Math.sin((ts - 5) * Math.PI * 2.2)) * smooth(5, 5.3, ts) * (1 - smooth(6.1, 6.5, ts));
      slime.scale.set(BLOB.r[0] * (1 + 0.12 * (1 - b) - 0.06 * b * (1 + sq)), BLOB.r[1] * (1 - 0.15 * (1 - b) + 0.25 * b * (1 + sq)), BLOB.r[2] * (1 + 0.12 * (1 - b)));
      slime.position.y = BLOB.c[1] + b * 0.18;
      rim.userData.eyes.scale.setScalar(smooth(9.0, 9.6, ts));
      // aura: boiling energy shell around the slime then around Rimuru
      const au = smooth(4.6, 5.2, ts) * (1 - smooth(9.4, 10.6, ts));
      aura.visible = au > 0.01;
      aura.scale.set(0.55 * au + 0.3 * rise, (0.5 + 0.6 * rise) * au, 0.55 * au + 0.3 * rise);
      aura.position.y = 0.25 + 0.5 * rise;
      aura.material.uniforms.uTime.value = t; aura.material.uniforms.uFps.value = engine.style.timing.fps;
      aura.material.uniforms.uCut.value = 0.22;
      // the reveal: impact frame, shockwave ring, shake, focus lines
      if (t >= 9.6 && t < 9.7 && !fired) { engine.impact.fire(t); engine.trauma.add(0.8); fired = true; }
      if (t < 1) fired = false;
      const sw = smooth(9.6, 10.8, t);
      ring.visible = sw > 0 && sw < 1;
      ring.scale.setScalar(0.3 + ease3(sw) * 4); ring.position.y = 0.05;
      ring.material.uniforms.uTime.value = t;
      const p = new Vector3(0, 0.6, 0).project(camera);
      shock.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, ease3(sw) * 0.6, sw > 0 && sw < 1 ? 0.012 * (1 - sw) : 0);
      engine.composer.u.uFocus.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, (smooth(4.8, 5.2, t) - smooth(6.2, 6.6, t)) + (smooth(9.6, 9.7, t) - smooth(10.6, 11.2, t)), 0);
      engine.syncFaces(scene);
    },
  };
}

// ---------------------------------------------------------------- (c) AINZ, western cartoon
export function ainz(engine) {
  const scene = new Scene();
  engine.shared.uLightDir.value.set(-0.4, 0.7, 0.6).normalize();
  engine.shared.uLightCol.value.set("#ffffff");
  const sk = addSky(scene, { zenith: "#24124f", mid: "#5d2c9e", horizon: "#ff8a5c", cloud: "#8f6bd6", cloudShade: "#3c2178", clouds: 0.35, sun: [0.35, 0.42, -0.84], sunCol: "#fff3a8", sunSize: 0.09, sunEmit: 1.2 });
  engine.sun = null;
  const hill = engine.prop(painted(new SphereGeometry(9, 48, 24).scale(1, 0.25, 1).translate(0, -1.6, 0), paint("#4fbf5a", "#246a4a")), 0.3);
  scene.add(hill);
  for (let i = 0; i < 6; i++) {
    const g = mergeGeometries([painted(new CylinderGeometry(0.32, 0.32, 0.12, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.62, 0), paint("#b9c2dc", "#5e6aa0")), painted(new PlaneGeometry(0.64, 0.62).translate(0, 0.31, 0.061), paint("#b9c2dc", "#5e6aa0")), painted(new PlaneGeometry(0.64, 0.62).rotateY(Math.PI).translate(0, 0.31, -0.061), paint("#b9c2dc", "#5e6aa0"))]);
    const ts_ = engine.prop(g, 0.5 + i * 0.02);
    const x = -3 + i * 1.25, z = -2.2 - (i % 2) * 1.3;
    ts_.position.set(x, 0.5 - 0.02 * x * x - 0.02 * z * z, z); ts_.rotation.set(0, 0.2 * Math.sin(i * 3), 0.1 * Math.sin(i * 2));
    scene.add(ts_);
  }
  const tree = engine.prop(mergeGeometries([painted(new CylinderGeometry(0.12, 0.25, 2.6, 8).translate(0, 1.3, 0), paint("#3b2552", "#1b0f2c")), painted(new CylinderGeometry(0.05, 0.08, 1.2, 6).rotateZ(1.0).translate(0.5, 2.2, 0), paint("#3b2552", "#1b0f2c")), painted(new CylinderGeometry(0.04, 0.07, 1.0, 6).rotateZ(-1.1).translate(-0.45, 1.9, 0), paint("#3b2552", "#1b0f2c"))]), 0.7);
  tree.position.set(3.2, 0.2, -3); scene.add(tree);
  const pup = buildPup(engine, { extra: ainzExtra(), eyeCol: "#3a0a0a", eyeEmit: [1.4, 0.05, 0.02] });
  scene.add(pup);
  const st = staff(engine);
  st.scale.setScalar(1.1);
  scene.add(st);
  // rubber-hose arm: a tube on a quadratic bezier from the shoulder to the staff hand, rebuilt each step
  const armMat = engine.figure(painted(new SphereGeometry(0.1, 4, 3), paint("#221838", "#0c0820")));
  scene.add(armMat);
  const orb = new Mesh(new IcosahedronGeometry(1, 4), energyMaterial({ core: "#f6ffe8", mid: "#7dff6a", edge: "#9b3cff", ink: "#12051f", scale: 3.5, emit: 2.4 }));
  scene.add(orb);
  const bolts = new Group(); scene.add(bolts);
  const bm = boltMaterial("#a6ff7a", "#12051f");
  const ring = new Mesh(new TorusGeometry(1, 0.07, 8, 64), energyMaterial({ core: "#ffffff", mid: "#b46bff", edge: "#4a1a9a", scale: 6 }));
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const camera = cam(32);
  engine.syncFaces(scene);
  const bakeMs = [bakeShots(pup, engine)];
  const D = 10;
  let lastStep = -1, fired = false, armT = -1;
  const shock = engine.composer.u.uShock.value;
  return {
    scene, camera, duration: D, figures: { pup }, bakeMs,
    caption: (t) => (t < 3 ? "Ainz Ooal Gown bounces in" : t < 6 ? "Supreme Being, charging…" : "KA-BOOM"),
    update(t, dt) {
      const ts = step(t, engine.style.timing.fps);
      const sq = engine.style.timing.squash;
      // hop-in on twos: squash on landing, stretch at take-off (volume kept: sx = 1/sqrt(sy))
      const hopT = Math.min(ts, 3);
      const ph = (hopT * 1.6) % 1;
      const hop = ts < 3 ? Math.sin(ph * Math.PI) : 0;
      const land = ts < 3 ? Math.max(0, 1 - ph * 6) + Math.max(0, (ph - 0.85) * 6) : 0;
      const sy = 1 + (0.22 * hop - 0.3 * land) * (0.3 + 0.7 * sq);
      const charge = smooth(3.2, 6, ts);
      const sy2 = sy * (1 + 0.08 * charge * Math.sin(ts * 40) * sq);
      pup.scale.set(1 / Math.sqrt(sy2), sy2, 1 / Math.sqrt(sy2));
      pup.position.set(-1.6 + 1.6 * smooth(0, 3, hopT), 0.38 * hop, 0);
      pup.rotation.y = -0.25 + 0.25 * smooth(2, 3, ts);
      // staff in the right hand, raised on the charge
      const raise = smooth(3, 3.6, ts);
      const hand = new Vector3(0.42 - 0.08 * raise, 0.35 + 0.55 * raise, 0.18).applyMatrix4(pup.matrixWorld);
      st.position.copy(hand).add(new Vector3(0, -0.45 + 0.1 * raise, 0));
      st.rotation.z = -0.15 + 0.15 * raise;
      if (ts !== armT) {
        armT = ts;
        const sh = new Vector3(0.22, 0.36, 0.06).applyMatrix4(pup.matrixWorld);
        const mid = sh.clone().lerp(hand, 0.5).add(new Vector3(0.18, -0.12 + 0.25 * raise, 0.05)); // the hose bows
        const tube = painted(new TubeGeometry(new QuadraticBezierCurve3(sh, mid, hand), 12, 0.045, 8), paint("#221838", "#0c0820"));
        armMat.userData.mesh.geometry.dispose();
        armMat.userData.mesh.geometry = tube; armMat.userData.hullMesh.geometry = tube;
      }
      // the spell
      const orbP = st.localToWorld(new Vector3(0, 0.98, 0));
      orb.position.copy(orbP).add(new Vector3(0, 0.35 * charge, 0));
      orb.scale.setScalar(0.05 + 0.4 * charge * (1 - smooth(6, 6.3, ts)));
      orb.visible = charge > 0.01 && ts < 6.3;
      orb.material.uniforms.uTime.value = t; orb.material.uniforms.uFps.value = engine.style.timing.fps;
      const stepIdx = Math.floor(t * engine.style.timing.fps / 2);
      if (stepIdx !== lastStep) {
        lastStep = stepIdx;
        for (const b of bolts.children) b.geometry.dispose();
        bolts.clear();
        if (charge > 0.3 && ts < 6.3) for (let i = 0; i < 3; i++) {
          const end = orb.position.clone().add(new Vector3(Math.cos(stepIdx * 2.1 + i * 2.1) * 1.4, -0.4 + 0.6 * Math.sin(stepIdx + i), Math.sin(stepIdx * 1.3 + i * 2.1) * 0.6));
          bolts.add(new Mesh(boltGeometry(bolt(orb.position, end, 5, 0.75, 0.3), camera.position, 0.035), bm));
        }
      }
      if (t >= 6.3 && t < 6.4 && !fired) { engine.impact.fire(t, [[2, 2], [1, 2], [3, 1]]); engine.trauma.add(1); fired = true; }
      if (t < 1) fired = false;
      const sw = smooth(6.3, 7.6, t);
      ring.visible = sw > 0 && sw < 1; ring.scale.setScalar(0.2 + ease3(sw) * 5); ring.position.set(orbP.x, 0.1, orbP.z);
      ring.material.uniforms.uTime.value = t;
      const sp = orbP.clone().project(camera);
      shock.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, ease3(sw) * 0.7, sw > 0 && sw < 1 ? 0.015 * (1 - sw) : 0);
      engine.composer.u.uFocus.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, smooth(4.5, 5, t) - smooth(7, 7.6, t), 0);
      const ca = 0.3 * Math.sin(t * 0.15);
      camera.position.set(Math.sin(ca) * 5.2, 1.4 + 0.2 * charge, Math.cos(ca) * 5.2).add(engine.trauma.offset(t));
      camera.lookAt(0, 0.7 + 0.3 * charge, 0);
      follow(camera, sk);
      engine.syncFaces(scene);
    },
  };
}

// ---------------------------------------------------------------- (d) STYLE BOARD scene
export function board(engine) {
  const scene = new Scene();
  engine.shared.uLightDir.value.set(-0.6, 0.6, 0.55).normalize();
  engine.shared.uLightCol.value.set("#fff3e0");
  const sk = addSky(scene, { zenith: "#2c6be0", mid: "#86bdf5", horizon: "#ffe1b8", clouds: 0.5, sun: [-0.55, 0.3, -0.78], sunCol: "#fff0c8", sunSize: 0.04 });
  engine.sun = new Vector3(-0.55, 0.3, -0.78).multiplyScalar(300);
  scene.add(engine.prop(ground(5), 0.3));
  const p1 = engine.prop(pine(2.6), 0.4); p1.position.set(-1.5, 0, -1.4); scene.add(p1);
  const p2 = engine.prop(pine(1.9), 0.42); p2.position.set(1.7, 0, -2.2); scene.add(p2);
  const r1 = engine.prop(rock(0.45, 2), 0.6); r1.position.set(0.95, 0.1, -0.2); scene.add(r1);
  const seal = buildPup(engine);
  seal.rotation.y = 0.35;
  scene.add(seal);
  const rim = buildFigure(engine, rimuruPrims(), 0.012, { eye: "#f3b62f", pupil: "#3a1a08", eyeSize: [0.022, 0.03, 0.01] });
  rim.position.set(-0.85, 0, -0.5); rim.rotation.y = 0.5; scene.add(rim);
  const orb = new Mesh(new IcosahedronGeometry(1, 4), energyMaterial({ core: "#f0fbff", mid: "#5ac0ff", edge: "#1d4fd8", scale: 3 }));
  orb.scale.setScalar(0.18); orb.position.set(0.55, 0.95, 0.25); scene.add(orb);
  const camera = cam(34);
  camera.position.set(0.9, 1.25, 3.4); camera.lookAt(-0.15, 0.6, -0.2);
  engine.syncFaces(scene);
  const bakeMs = [bakeShots(seal, engine), bakeShots(rim, engine)];
  return {
    scene, camera, duration: 6, figures: { seal, rim }, bakeMs,
    caption: () => "",
    update(t) {
      const ts = step(t, engine.style.timing.fps);
      seal.scale.set(1 + 0.025 * Math.sin(ts * 5), 1 - 0.025 * Math.sin(ts * 5), 1);
      orb.position.y = 0.95 + 0.05 * Math.sin(ts * 3);
      orb.material.uniforms.uTime.value = t; orb.material.uniforms.uFps.value = engine.style.timing.fps;
      follow(camera, sk);
      engine.syncFaces(scene);
    },
  };
}

export const DEMOS = { seal, rimuru, ainz, board };
export const DEMO_STYLE = { seal: "modern-anime", rimuru: "modern-anime", ainz: "western-cartoon", board: "modern-anime" };
