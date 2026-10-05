// epsilon-hollow: DOMAIN EXPANSION, THE GRAVEYARD OF EFFORTS (the Akatsuki hideout's play; the owner's concept,
// 2026-10-06): the graveyard is a PLANET. A small dead world (r 170 m) whose every metre is the grave of something
// eldritch, petrified mid-motion, light leaking from its cracks. Its SUN is EPSILON-HOLLOW: a black hole with an eye
// (the accretion disc the iris, the event horizon the pupil, memory, files and scheduler spiralling in).
//   0-0.5     the pup stands on the planet among the graves; the curve of the world under it
//   0.5-1.4   the camera law's pull, back and up 560 m: the ground falls away, the planet shrinks to a sphere
//   1.4-1.9   the wide: the planet hangs in the eye's light, a gold-violet crescent on its limb
//   1.9-2.7   the law's into-arc dives back down onto the pup; "Domain Expansion: Graveyard of Efforts."
//   6-8.6     the pup draws a shard out of a sleeping god-form at its side
//   8.6-26.7  every grave is a PR that never landed (the near plinths carry the 31); "Effort never gets wasted."
//   26.7-28.2 the kill: it swings, the slash cuts the world and the island shows through (the explained return)
// The camera is the law's (lib/world/cutscene/camera.js, the card's pull.rise / look / at); this file only puts the eye
// where that wide looks. Draws: sky 1, planet 1, near horrors 4, far graves 1, plinths 1, shard 1 = 9.
// Triangles: planet 12.5k, far 1,400 x ~60, near 56 x ~600. Prewarmed.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, InstancedMesh, Mesh, Object3D, Points, Quaternion, ShaderMaterial, Vector3 } from "three";
import { sceneT } from "../../../../lib/world/cutscene/clock";
import { live } from "../../../../lib/world/store";
import { WATER_Y, heightAt } from "../../../../lib/world/terrain";
import { registerWarm, takeWarm } from "../prewarm";
import { Speaker, Stage, moveAt, signAt, smooth, useCutFrame } from "../kit";
import { DEAD_PRS, PLANET_R, planetGeometry, planetMaterial, quadGeometry, rowAttribute, skyMaterial } from "./p-epsilon-hollow/graveyard";
import { HORRORS, farHorror, horrorMaterial, plinthGeometry, shardGeometry } from "./p-epsilon-hollow/horrors";

const UP = new Vector3(0, 1, 0);
const NAMED = DEAD_PRS.length; // the near plinths, carved
const NEAR = 14; // per near silhouette
const FAR = 1400; // the LOD spires, the rest of the world
const EYE_ABOVE = (12 * Math.PI) / 180; // the eye sits this far above the wide's line of sight: the planet's limb crosses
// its iris in the wide, and from the graves its pupil just clears the horizon (~3 deg under level, the dip is ~6)
const SLEEPER = [2.3, -1.4]; // the god-form the shard is drawn from, beside the pup (x, z off the pup)

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A grave on the sphere (planet frame: centre at the origin, the pup's feet at +y R): standing on its normal, spun
// about it, sunk a little.
const Q2 = new Quaternion();
function plant(o, n, spin, scale, sink) {
  o.position.copy(n).multiplyScalar(PLANET_R - sink);
  o.quaternion.setFromUnitVectors(UP, n).multiply(Q2.setFromAxisAngle(UP, spin));
  o.scale.setScalar(scale);
  o.updateMatrix();
}
// the unit normal `d` m along the ground from the pup's feet, toward (x, z)
const toward = (x, z, d, out) => {
  const h = Math.hypot(x, z) || 1;
  const a = d / PLANET_R;
  return out.set((x / h) * Math.sin(a), Math.cos(a), (z / h) * Math.sin(a));
};

function buildPlanet() {
  const r = rand(4180);
  const o = new Object3D();
  const n = new Vector3();
  const mats = [];
  const root = new Group(); // the planet's centre
  const planet = new Mesh(planetGeometry(), planetMaterial());
  planet.frustumCulled = false;
  mats.push(planet.material);
  root.add(planet);
  // the near cap: the four silhouettes the owner named, a ring of them from 5 m to the horizon and past it (the far
  // ones taller, so they stand over the curve)
  HORRORS.forEach((make, k) => {
    const m = new InstancedMesh(make(), horrorMaterial(), NEAR);
    for (let i = 0; i < NEAR; i++) {
      const sleeper = k === 2 && i === 0;
      const d = sleeper ? Math.hypot(...SLEEPER) : 5 + Math.sqrt(r()) * 55;
      const a = sleeper ? Math.atan2(SLEEPER[1], SLEEPER[0]) : r() * Math.PI * 2;
      toward(Math.cos(a), Math.sin(a), d, n);
      const sc = sleeper ? 0.55 : (0.7 + r() * 0.7) * (1 + d / 28);
      plant(o, n, r() * Math.PI * 2, sc, 0.5 * sc * r());
      m.setMatrixAt(i, o.matrix);
    }
    m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
    mats.push(m.material);
    root.add(m);
  });
  // the rest of the world: one low spire, everywhere, titanic, so the planet's limb bristles with graves
  const far = new InstancedMesh(farHorror(), horrorMaterial(), FAR);
  for (let i = 0; i < FAR; i++) {
    do n.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    while (n.lengthSq() > 1 || n.lengthSq() < 1e-4);
    n.normalize();
    if (n.y > Math.cos(55 / PLANET_R)) n.y = -n.y; // the near cap is the near silhouettes'
    const sc = 1.2 + r() * 2.6;
    plant(o, n, r() * Math.PI * 2, sc, 0.8 * sc * r());
    far.setMatrixAt(i, o.matrix);
  }
  far.frustumCulled = false;
  far.instanceMatrix.needsUpdate = true;
  mats.push(far.material);
  root.add(far);
  // the names, small: low plinths in an arc behind the pup, each lit like a rune
  const pg = plinthGeometry();
  pg.setAttribute("aRow", rowAttribute(NAMED));
  const named = new InstancedMesh(pg, horrorMaterial(), NAMED);
  for (let i = 0; i < NAMED; i++) {
    const a = Math.PI * (1.0 + (i / NAMED) * 1.0) + (r() - 0.5) * 0.04;
    const d = 5 + (i % 3) * 1.9 + r() * 0.4; // three staggered rows, so no two names overlap
    toward(Math.cos(a), Math.sin(a), d, n);
    plant(o, n, Math.atan2(-Math.cos(a), -Math.sin(a)), 0.8, 0);
    named.setMatrixAt(i, o.matrix);
  }
  named.frustumCulled = false;
  named.instanceMatrix.needsUpdate = true;
  mats.push(named.material);
  root.add(named);
  const sky = new Mesh(quadGeometry(), skyMaterial());
  sky.frustumCulled = false;
  sky.renderOrder = -0.5;
  const drawn = new Mesh(shardGeometry(), horrorMaterial());
  drawn.frustumCulled = false;
  mats.push(sky.material, drawn.material);
  return { root, sky, drawn, mats };
}
// The pup in the wide (560 m: under a pixel): a small white upright pill with a halo, on the rim, in screen pixels,
// fading as the camera comes down to it.
function beacon() {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
  const m = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uA: { value: 0 }, uPx: { value: 1 } },
    vertexShader: "uniform float uPx; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 44.0 * uPx; }",
    fragmentShader: `uniform float uA; void main(){
      vec2 p = (gl_PointCoord - 0.5) * 2.0; p.y = -p.y;
      float halo = exp(-dot(p, p) * 5.0) * 0.55;
      vec2 q = vec2(p.x, max(abs(p.y + 0.02) - 0.34, 0.0));
      float pill = smoothstep(0.17, 0.12, length(q + vec2(0.0, 0.0)));
      gl_FragColor = vec4(vec3(1.0, 0.98, 0.92) * (halo + pill * 1.4), 1.0) * uA; }`,
  });
  const pts = new Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 8;
  return pts;
}
registerWarm("p-epsilon-hollow", buildPlanet);

// Where the law's wide looks (camera.js shot(): back along the follow, `rise` up, aimed at `look` off the chest), and
// the eye EYE_ABOVE over that line: it fills the top of the wide and sits under the horizon seen from the graves.
function eyeDirection(card, cam, seal, out) {
  const p = card.pull;
  const ox = cam.x - seal.x;
  const oz = cam.z - seal.z;
  const h = Math.hypot(ox, oz) || 1;
  const rise = ((p.rise ?? 14) * Math.PI) / 180;
  const L = new Vector3(p.look[0] - (ox / h) * p.far * Math.cos(rise), p.look[1] - p.far * Math.sin(rise), p.look[2] - (oz / h) * p.far * Math.cos(rise));
  L.normalize();
  const U = UP.clone().addScaledVector(L, -UP.dot(L));
  if (U.lengthSq() < 1e-6) U.set(ox / h, 0, oz / h);
  U.normalize();
  return out.copy(L).multiplyScalar(Math.cos(EYE_ABOVE)).addScaledVector(U, Math.sin(EYE_ABOVE)).normalize();
}

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const g = useMemo(() => takeWarm("p-epsilon-hollow", buildPlanet), []);
  const dot = useMemo(beacon, []);
  const ground = useMemo(() => Math.max(heightAt(live.seal.x, live.seal.z), WATER_Y), []);
  useEffect(() => {
    const s = live.seal;
    g.root.position.set(s.x, ground - PLANET_R, s.z); // the pup stands on top of the world where it docked
    const eye = eyeDirection(card, camera.position, s, new Vector3());
    for (const m of g.mats) {
      const u = m.uniforms;
      if (u.uHole) u.uHole.value.copy(eye);
      if (u.uCenter) u.uCenter.value.copy(g.root.position);
    }
    return () => {
      for (const m of g.mats) m.dispose();
    };
  }, [g, card, camera, ground]);

  // the pup turns to face the lens once the dive lands, so the eye rises behind it (after Seal.jsx places it)
  const root = useThree((s) => s.scene);
  useFrame((state) => {
    const seal = root.getObjectByName("seal");
    if (!seal || !live.arrival.id || mode !== "full") return;
    const t = sceneT(live.arrival.id, state.clock.elapsedTime - live.arrival.start);
    const k = smooth(tl.bloom[1], tl.bloom[1] + 0.8, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    const want = Math.atan2(state.camera.position.x - seal.position.x, state.camera.position.z - seal.position.z);
    const y = seal.rotation.y;
    seal.rotation.y = y + Math.atan2(Math.sin(want - y), Math.cos(want - y)) * k;
  }, -0.5);

  useCutFrame((t, state) => {
    const still = mode !== "full";
    const show = still ? 1 : smooth(0, 0.3, t) * (1 - smooth(tl.collapse[1] - 0.2, tl.duration - 0.4, t));
    const cutOpen = still ? 0 : smooth(tl.collapse[0] + 0.15, tl.collapse[1], t);
    for (const m of g.mats) {
      const u = m.uniforms;
      u.uShow.value = show;
      u.uCut.value = cutOpen;
      u.uRes.value.set(size.width, size.height);
      if (u.uTime) u.uTime.value = state.clock.elapsedTime;
    }
    const S = g.sky.material.uniforms;
    S.uInvVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    S.uCam.value.copy(camera.position);
    g.sky.visible = g.root.visible = show > 0.002;

    // the drawn shard: out of the sleeping god-form beside the pup, held up like a sword, then the swing
    const s = live.seal;
    const draw = still ? 1 : smooth(tl.move[0], tl.move[1], t);
    const swing = still ? 0 : smooth(tl.collapse[0] - 0.2, tl.collapse[0] + 0.25, t);
    const d = g.drawn;
    d.visible = show > 0.002;
    const k = Math.min(1, draw * 1.6);
    d.position.set(s.x + SLEEPER[0] * (1 - k) + 1.0 * k, ground - 1.6 + 2.0 * draw, s.z + SLEEPER[1] * (1 - k) - 0.4 * k);
    d.rotation.set(0, 0, 0.25 * draw - 2.4 * swing);

    const sp = live.seal;
    dot.position.set(sp.x, ground + 0.9, sp.z);
    dot.material.uniforms.uA.value = show * smooth(60, 200, camera.position.distanceTo(dot.position));
    dot.material.uniforms.uPx.value = state.gl.getPixelRatio();
    dot.visible = dot.material.uniforms.uA.value > 0.01;
    if (still) return;
    // the caster, upright: flippers in the hand sign that opens the domain, until it reaches for the shard
    const turn = moveAt(tl, t);
    live.pose.sign = Math.max(signAt(tl, t), smooth(0.2, 0.9, t) * (1 - smooth(tl.move[0] - 0.6, tl.move[0], t))) * (1 - turn);
    live.pose.raise = Math.max(live.pose.raise, draw * (1 - swing));
    live.pose.point = Math.max(live.pose.point, swing * (1 - smooth(tl.collapse[1], tl.duration, t)));
    live.pose.sit = 0.8 * show; // sat up, a lighter sit than the 1.4 teardrop that tipped back to the sky
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Speaker {...cut} />
      <primitive object={g.sky} />
      <primitive object={g.root} />
      <primitive object={g.drawn} />
      <primitive object={dot} />
    </>
  );
}
