// EVERYTHING THE SCENE DRAWS, built once and cached: the island move mounts only when the pup docks, so the
// build starts earlier. A tiny watcher (module level, client only) builds the set in slices as the seal
// comes within range of the dock and compiles every material with compileAsync, so the first frames of
// the scene do not hitch. Dispose frees all of it (and the watcher frees it again if the seal wanders off).

import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, PlaneGeometry, RingGeometry, SphereGeometry, WebGLRenderTarget } from "three";
import { PLACE_BY_ID } from "../../../../../lib/world/places";
import { live } from "../../../../../lib/world/store";
import { buildAinz } from "./lich";
import { clayTexture, disposeTexture } from "./clay";
import { buildColony, buildWitnesses } from "./figures";
import { burstGeometry, circleTexture, crystalGeometry, disposeAtlas, emitMaterial, flameMesh, gateGeometry, glassMaterial, glowMaterial, hideI, instanced, skyMaterial } from "./fx";
import { buildSet } from "./set";
import { flashQuad, lettering, pupParts } from "../p-caustic/parts";
import { buildGear, findParts, pupClay } from "./ainz";

export const LASH_N = 24;
export const CINDERS = 150;
export const DUST = 64;
export const SPARKS = 24;
export const STARS = 6;
export const RINGS = 3;

let CACHE = null;
let STAGE = 0; // how much of the build the watcher has done
let PLAYED = false; // the scene has played this session: the watcher never rebuilds it

function sliceA() {
  clayTexture();
  const set = buildSet();
  const root = new Group();
  root.name = "topograph-hall";
  const geos = [];
  const mats = [];
  const add = (geo, mat, order = 0) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = order;
    geos.push(geo);
    mats.push(mat);
    root.add(m);
    return m;
  };
  const sky = add(new SphereGeometry(150, 20, 12), skyMaterial(), -6);
  sky.position.set(0, 0, -20);
  const endGlow = add(new PlaneGeometry(12, 80), glowMaterial({ a: "#a23cff", b: "#2a0a4a" }), -5);
  endGlow.position.set(0, -18, -77.5);
  const floorGlow = add(new PlaneGeometry(9, 110).rotateX(-Math.PI / 2), glowMaterial({ a: "#8a2cff", b: "#3a0a4a", radial: true }), -5);
  floorGlow.position.set(0, -43, -26);
  floorGlow.material.uniforms.uAlpha.value = 1.3;
  const doorGlow = add(new PlaneGeometry(1.5, 2.9), glowMaterial({ a: "#ffd27a", b: "#e0a030", radial: true }), -3);
  doorGlow.position.set(-5.1, 1.35, -3.05);
  doorGlow.material.uniforms.uAlpha.value = 1.5;
  for (const [g, m] of Object.values(set.statics)) {
    geos.push(g);
    mats.push(m);
    const mesh = new Mesh(g, m);
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  for (const m of [set.pillars, set.lanterns, set.knobs, set.bridge]) {
    root.add(m);
    geos.push(m.geometry);
    mats.push(m.material);
  }
  CACHE = { root, set, geos, mats, doorGlow, floorGlow, endGlow, sky, built: 1 };
}

function sliceB() {
  const A = CACHE;
  A.ainz = buildAinz();
  A.root.add(A.ainz.root);
  A.wit = buildWitnesses();
  for (const k of ["aura", "demiurge", "albedo"]) A.root.add(A.wit[k].g);
  A.colony = buildColony();
  A.root.add(A.colony.mesh);
  A.built = 2;
}

function sliceC() {
  const A = CACHE;
  A.flames = flameMesh(A.ainz.fire.length + LASH_N * 3);
  A.flames.renderOrder = 6;
  A.root.add(A.flames);
  // the gates
  const gGeo = gateGeometry();
  const glass = glassMaterial("#b46bff");
  A.glass = glass;
  A.gates = [0, 1].map(() => {
    const m = new Mesh(gGeo, glass);
    m.frustumCulled = false;
    m.renderOrder = 7;
    m.visible = false;
    A.root.add(m);
    return m;
  });
  A.gateGeo = gGeo;
  A.crystalGeo = crystalGeometry();
  A.crystalMat = glassMaterial("#ffcf4a");
  // emit family
  const em = emitMaterial();
  A.emit = em;
  const octa = new OctahedronGeometry(1, 0);
  A.cinders = instanced(octa, em, CINDERS);
  A.dust = instanced(new OctahedronGeometry(1, 0).scale(0.05, 1, 0.05), em, DUST);
  A.sparks = instanced(new OctahedronGeometry(1, 0), em, SPARKS);
  A.stars = instanced(burstGeometry(), em, STARS);
  A.rings = instanced(new RingGeometry(0.82, 1, 44), em, RINGS);
  for (const m of [A.cinders, A.dust, A.sparks, A.stars, A.rings]) {
    m.renderOrder = 8;
    A.root.add(m);
    for (let i = 0; i < m.count; i++) hideI(m, i);
  }
  A.octa = octa;
  A.halo = new Mesh(new PlaneGeometry(1, 1), glowMaterial({ a: "#ffe08a", b: "#c28aff", radial: true }));
  A.halo.frustumCulled = false;
  A.halo.renderOrder = 9;
  A.halo.visible = false;
  A.root.add(A.halo);
  // the two magic circles: Ainz's great one behind him (stood up facing the lens), the pup's gold one under its paws
  const circleMat = (gold) => new MeshBasicMaterial({ map: circleTexture(gold), transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, opacity: 0 });
  A.circleBig = [0, 1, 2].map((k) => new Mesh(new PlaneGeometry(1, 1), circleMat(k === 1)));
  A.circlePup = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), circleMat(true));
  for (const o of [...A.circleBig, A.circlePup]) {
    o.frustumCulled = false;
    o.visible = false;
    o.renderOrder = 5;
    A.root.add(o);
  }
  A.thok = lettering("DOOM!", "#ffc43a", -0.1);
  A.clap = lettering("DISMISSED!", "#b46bff", 0.08);
  A.root.add(A.thok, A.clap);
  A.flash = flashQuad("#e6c8ff");
  A.flashCream = flashQuad("#ffd27a");
  A.built = 3;
}

// the renderer, camera and scene a probe can reach before the scene has mounted (Cutscene.jsx publishes gl and
// scene only once it has; Look.jsx publishes the composer, which holds the renderer and a render pass with the scene)
function context() {
  const w = typeof window !== "undefined" ? window.__world : null;
  const gl = w?.gl ?? w?.composer?.getRenderer?.();
  const scene = w?.scene ?? w?.composer?.passes?.find?.((p) => p.scene)?.scene;
  return gl && scene && w.camera ? { gl, scene, camera: w.camera, target: w.composer?.inputBuffer ?? null } : null;
}

// the pup's gear and its plasticine twins: built as the seal nears (the cloak rides the pup's body group, hidden),
// handed to the scene at mount
export function getGear() {
  const A = CACHE;
  if (!A) return null;
  if (A.gear) return A.gear;
  const c = context();
  const found = c ? pupParts(c.scene) : null;
  const p = found ? findParts(found.root) : null;
  if (!p?.root || !p.rear || !p.head) return null;
  if (!A.crystalMat) return null;
  A.gear = { p, gear: buildGear(p, A.crystalMat), twin: pupClay(p.root) };
  return A.gear;
}

// every program is queued a few at a time while the seal walks in (a program's translation is a synchronous
// cost, so a lump of them would be a hitch of its own). The lights and fog a program is keyed on come from the
// real scene; compileAsync walks each tree at the call and queues the programs
function jobs(A) {
  const list = [];
  const seen = new Set();
  A.root.traverse((o) => {
    if (o.isMesh && !seen.has(o.material)) {
      seen.add(o.material);
      list.push((c) => c.gl.compileAsync?.(o, c.camera, c.scene));
    }
  });
  list.push((c) => {
    const G = getGear();
    if (!G) return false;
    const { gear, twin, p } = G;
    const parts = [gear.cloak, gear.staff, gear.sword];
    const was = parts.map((o) => o.visible);
    parts.forEach((o) => (o.visible = true));
    twin.set(true);
    try {
      for (const o of [gear.staff, gear.sword]) c.gl.compileAsync?.(o, c.camera, c.scene);
      c.gl.compileAsync?.(p.root, c.camera, c.scene);
    } finally {
      twin.set(false);
      parts.forEach((o, i) => (o.visible = was[i]));
    }
    return true;
  });
  return list;
}

function compileSome(n) {
  const A = CACHE;
  const c = context();
  if (!c) return false;
  A.jobs ??= jobs(A);
  // the scene renders into the composer's buffer, which changes a program's key (linear output, no tone mapping):
  // compile against that target or every program is built a second time at its first real draw
  const prev = c.gl.getRenderTarget();
  c.gl.setRenderTarget(c.target ?? (A.rt ??= new WebGLRenderTarget(1, 1)));
  for (let k = 0; k < n && A.jobs.length; k++) {
    try {
      if (A.jobs[0](c)?.catch?.(() => {}) === false) {
        c.gl.setRenderTarget(prev);
        return false;
      }
    } catch {
      /* a failed warm-up only costs the hitch it was meant to hide */
    }
    A.jobs.shift();
  }
  c.gl.setRenderTarget(prev);
  if (!A.jobs.length) A.built = 4;
  return true;
}

// whatever the watcher has not finished compiles now (a hitch, but only if the seal came in a rush)
export function compileAssets() {
  if (CACHE && CACHE.built < 4) while (CACHE.built < 4 && compileSome(8));
}

// the whole build, finishing whatever the watcher has not done yet
export function getAssets() {
  if (!CACHE) sliceA();
  if (CACHE.built < 2) sliceB();
  if (CACHE.built < 3) sliceC();
  return CACHE;
}
export function disposeAssets(played = false) {
  if (played) PLAYED = true;
  const A = CACHE;
  if (!A) return;
  CACHE = null;
  STAGE = 0;
  if (A.gear) {
    A.gear.twin.dispose();
    A.gear.gear.dispose();
    A.gear.gear.staff.removeFromParent();
    A.gear.gear.sword.removeFromParent();
  }
  A.ainz?.dispose();
  A.wit?.dispose();
  A.colony?.dispose();
  A.root.removeFromParent();
  for (const g of A.geos) g.dispose();
  for (const m of A.mats) m.dispose();
  for (const o of [A.flames, A.cinders, A.dust, A.sparks, A.stars, A.rings, A.circlePup, ...A.circleBig, A.thok, A.clap, A.flash, A.flashCream, A.halo]) {
    o?.geometry?.dispose();
    o?.material?.map?.dispose();
    o?.material?.dispose();
    o?.dispose?.();
  }
  A.set.pillars.dispose();
  A.set.lanterns.dispose();
  A.set.knobs.dispose();
  A.set.bridge.dispose();
  A.gateGeo?.dispose();
  A.crystalGeo?.dispose();
  A.crystalMat?.dispose();
  A.glass?.dispose();
  A.emit?.dispose();
  A.octa?.dispose();
  A.rt?.dispose();
  disposeTexture();
  disposeAtlas();
}

// the watcher: slices of the build as the seal comes near the dock (client only)
const ID = "pr-topograph-432";
const RANGE = 95; // m
if (typeof window !== "undefined") {
  window.setInterval(() => {
    const p = PLACE_BY_ID[ID];
    const s = live.seal;
    if (!p || !s || live.arrival.id || PLAYED) return;
    const d = Math.hypot(s.x - p.x, s.z - p.z);
    if (d > 190) {
      if (CACHE) disposeAssets();
      return;
    }
    if (d > RANGE) return;
    if (STAGE === 0) {
      sliceA();
      STAGE = 1;
    } else if (STAGE === 1) {
      sliceB();
      STAGE = 2;
    } else if (STAGE === 2) {
      sliceC();
      STAGE = 3;
    } else if (STAGE === 3 && CACHE) {
      if (CACHE.built >= 4) STAGE = 4;
      else compileSome(3);
    }
  }, 250);
}
