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
// The sky, the ground and the stones are written fragments (moves/p-epsilon-hollow/graveyard.js); the stones are two
// InstancedMeshes (blank and named). Draws: sky 1, ground 1, stones 2, the drawn stone 1. Built by the shared prewarm.

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Group, InstancedMesh, Mesh, Object3D } from "three";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Speaker, Stage, moveAt, signAt, smooth, useCutFrame } from "../kit";
import { DEAD_PRS, epitaphs, groundGeometry, groundMaterial, quadGeometry, rowAttribute, skyMaterial, stoneGeometry, stoneMaterial } from "./p-epsilon-hollow/graveyard";

const FIELD = 2600; // blank stones, to the horizon
const NAMED = DEAD_PRS.length; // the near ones, carved

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
  const geo = stoneGeometry();
  const place = (mesh, i, x, z, s) => {
    o.position.set(x, -0.05 - r() * 0.15, z);
    o.rotation.set((r() - 0.5) * 0.22, (r() - 0.5) * 0.7, (r() - 0.5) * 0.22); // faces +z (the camera side), leaning
    o.scale.setScalar(s);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  };
  const field = new InstancedMesh(geo, stoneMaterial(), FIELD);
  for (let i = 0; i < FIELD; i++) {
    const a = r() * Math.PI * 2;
    const d = 9 + Math.sqrt(r()) * 150; // uniform in area out to the mist
    place(field, i, Math.cos(a) * d, Math.sin(a) * d, 0.9 + r() * 0.7);
  }
  const namedGeo = geo.clone();
  namedGeo.setAttribute("aRow", rowAttribute(NAMED));
  const named = new InstancedMesh(namedGeo, stoneMaterial(epitaphs()), NAMED);
  for (let i = 0; i < NAMED; i++) {
    // two loose rings round the seal's clearing, open toward the camera (+z)
    const a = Math.PI * (1.15 + (i / NAMED) * 1.7) + (r() - 0.5) * 0.12;
    const d = (i % 2 ? 4.6 : 6.4) + r() * 1.6;
    place(named, i, Math.cos(a) * d, Math.sin(a) * d, 1.05);
  }
  for (const m of [field, named]) {
    m.frustumCulled = false;
    m.instanceMatrix.needsUpdate = true;
  }
  const sky = new Mesh(quadGeometry(), skyMaterial());
  sky.frustumCulled = false;
  sky.renderOrder = -0.5;
  const ground = new Mesh(groundGeometry(), groundMaterial());
  ground.position.y = 0.005;
  const drawn = new Mesh(geo, stoneMaterial());
  drawn.frustumCulled = false;
  const root = new Group();
  root.add(ground, field, named);
  return { root, sky, drawn, mats: [sky.material, ground.material, field.material, named.material, drawn.material] };
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
    }
    const S = g.sky.material.uniforms;
    S.uInvVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    S.uCam.value.copy(camera.position);
    g.sky.visible = g.root.visible = show > 0.002;

    // the drawn stone: out of the ground beside the seal, held up like a sword, then the swing
    const s = live.seal;
    const draw = still ? 1 : smooth(tl.move[0], tl.move[1], t);
    const swing = still ? 0 : smooth(tl.collapse[0] - 0.2, tl.collapse[0] + 0.25, t);
    const d = g.drawn;
    d.visible = show > 0.002;
    d.position.set(s.x + 0.75, -1.0 + 2.2 * draw, s.z + 0.25);
    d.rotation.set(0, 0, 0.35 * draw - 2.4 * swing);
    d.scale.setScalar(0.9);

    if (still) return;
    const turn = moveAt(tl, t);
    live.pose.sign = signAt(tl, t) * (1 - turn);
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
