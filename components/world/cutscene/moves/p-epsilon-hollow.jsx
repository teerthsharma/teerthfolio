// epsilon-hollow: DOMAIN EXPANSION, THE GRAVEYARD OF EFFORTS (the Akatsuki hideout's play; the owner's spec, issue 10 W3).
// After Yuta Okkotsu's True Mutual Love (a field of countless swords under a dark sky, each one a copied technique):
// here the field is gravestones to the horizon, each one a dead idea, a PR that never landed (lib/world/cutscene/
// graves.js: the near stones carry their repo #n and title, the far ones are blank and fade into the mist). Over it hangs
// EPSILON-HOLLOW itself as a black hole (memory, files and scheduler spiralling in as three strands), and a red moon.
//   0-1.6     zoom out off the dock; the domain swells over the bloom (the camera grammar's switch)
//   1.6-6     zoom into the seal from its flank, among the stones; "Domain Expansion: Graveyard of Efforts."
//   6-8.6     the seal draws one gravestone out of the ground like a sword
//   8.6-26.7  it holds it; every stone is a PR that never landed; "Effort never gets wasted."
//   26.7-28.2 the kill: it swings, the slash splits the domain and the island shows through the cut (the explained return)
// The sky and the ground are written fragments (graveyard.js); the dead ideas are horrors laid in stone (horrors.js),
// six instanced silhouettes and the named plinths. Draws: sky 1, ground 1, horrors 6, plinths 1, shard 1. Prewarmed.

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Group, InstancedMesh, Mesh, Object3D, Vector3 } from "three";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Speaker, Stage, moveAt, signAt, smooth, useCutFrame } from "../kit";
import { DEAD_PRS, epitaphs, groundGeometry, groundMaterial, quadGeometry, rowAttribute, skyMaterial } from "./p-epsilon-hollow/graveyard";
import { HORRORS, horrorMaterial, plinthGeometry, shardGeometry } from "./p-epsilon-hollow/horrors";

const FWD = new Vector3();
const NAMED = DEAD_PRS.length; // the near plinths, carved
const SLEEPERS = 110; // per silhouette: six silhouettes, 660 horrors to the horizon

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildGraveyard() {
  const r = rand(4180);
  const o = new Object3D();
  const meshes = [];
  // the sleepers: each silhouette instanced, scattered to the horizon, half buried, turned and scaled; the camera side
  // (+z, near) stays clear so the seal reads; the near ones are smaller, the far ones titanic
  HORRORS.forEach((make, k) => {
    const m = new InstancedMesh(make(), horrorMaterial(), SLEEPERS);
    for (let i = 0; i < SLEEPERS; i++) {
      let x;
      let z;
      do {
        const a = r() * Math.PI * 2;
        const d = 14 + Math.sqrt(r()) * 140;
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
      } while (z > -6 && Math.hypot(x, z) < 34);
      const d = Math.hypot(x, z);
      const sc = (0.9 + r() * 0.8) * (1 + d / 45);
      o.position.set(x, -0.6 * sc * r(), z);
      o.rotation.set((r() - 0.5) * 0.35, r() * Math.PI * 2, (r() - 0.5) * 0.35);
      o.scale.setScalar(sc);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
    meshes.push(m);
    void k;
  });
  // the names, small: low plinths in an arc behind the seal, each lit like a rune
  const pg = plinthGeometry();
  pg.setAttribute("aRow", rowAttribute(NAMED));
  const named = new InstancedMesh(pg, horrorMaterial(epitaphs()), NAMED);
  for (let i = 0; i < NAMED; i++) {
    const a = Math.PI * (1.12 + (i / NAMED) * 0.76) + (r() - 0.5) * 0.06;
    const d = (i % 2 ? 6.5 : 9) + r() * 1.5;
    o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    o.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0);
    o.scale.setScalar(1);
    o.updateMatrix();
    named.setMatrixAt(i, o.matrix);
  }
  named.frustumCulled = false;
  named.instanceMatrix.needsUpdate = true;
  const sky = new Mesh(quadGeometry(), skyMaterial());
  sky.frustumCulled = false;
  sky.renderOrder = -0.5;
  const ground = new Mesh(groundGeometry(), groundMaterial());
  ground.position.y = 0.005;
  const drawn = new Mesh(shardGeometry(), horrorMaterial());
  drawn.frustumCulled = false;
  const root = new Group();
  root.add(ground, named, ...meshes);
  return { root, sky, drawn, mats: [sky.material, ground.material, named.material, drawn.material, ...meshes.map((m) => m.material)] };
}
registerWarm("p-epsilon-hollow", buildGraveyard);

export default function Move(cut) {
  const { tl, mode } = cut;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const g = useMemo(() => takeWarm("p-epsilon-hollow", buildGraveyard), []);
  useEffect(() => {
    g.root.position.set(live.seal.x, 0, live.seal.z); // the field stands round the seal where it docked
    return () => {
      for (const m of g.mats) m.dispose();
    };
  }, [g]);

  useCutFrame((t, state) => {
    const still = mode !== "full";
    const show = smooth(tl.bloom[0], tl.bloom[1], t) * (1 - smooth(tl.collapse[1] - 0.2, tl.duration - 0.4, t));
    const cutOpen = still ? 0 : smooth(tl.collapse[0] + 0.15, tl.collapse[1], t);
    for (const m of g.mats) {
      const u = m.uniforms;
      u.uShow.value = show;
      u.uCut.value = cutOpen;
      u.uRes.value.set(size.width, size.height);
      if (u.uTime) u.uTime.value = state.clock.elapsedTime;
      if (!u.uRes) continue;
    }
    const S = g.sky.material.uniforms;
    S.uInvVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    S.uCam.value.copy(camera.position);
    // Epsilon-Hollow hangs over the lens's centre, high: it owns the top of the frame wherever the grammar puts the camera
    camera.getWorldDirection(FWD);
    FWD.y = 0;
    if (FWD.lengthSq() < 1e-6) FWD.set(0, 0, -1);
    S.uHole.value.copy(FWD.normalize()).setY(0.62).normalize();
    g.sky.visible = g.root.visible = show > 0.002;

    // the drawn stone: out of the ground beside the seal, held up like a sword, then the swing
    const s = live.seal;
    const draw = still ? 1 : smooth(tl.move[0], tl.move[1], t);
    const swing = still ? 0 : smooth(tl.collapse[0] - 0.2, tl.collapse[0] + 0.25, t);
    const d = g.drawn;
    d.visible = show > 0.002;
    d.position.set(s.x + 1.1, -1.9 + 2.2 * draw, s.z - 0.4);
    d.rotation.set(0, 0, 0.25 * draw - 2.4 * swing);
    d.scale.setScalar(1);

    if (still) return;
    // the caster, upright: flippers in the hand sign that opens the domain, until it reaches for the shard
    const turn = moveAt(tl, t);
    live.pose.sign = Math.max(signAt(tl, t), smooth(0.2, 0.9, t) * (1 - smooth(tl.move[0] - 0.6, tl.move[0], t))) * (1 - turn);
    live.pose.raise = Math.max(live.pose.raise, draw * (1 - swing));
    live.pose.point = Math.max(live.pose.point, swing * (1 - smooth(tl.collapse[1], tl.duration, t)));
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Speaker {...cut} />
      <primitive object={g.sky} />
      <primitive object={g.root} />
      <primitive object={g.drawn} />
    </>
  );
}
