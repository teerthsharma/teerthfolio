// Itomori, assembled: every geometry, material and mesh of the scene, built in small steps so the work can
// start while the seal is still walking up to the lab (prewarm, in ../p-tangle.jsx) and not in the first
// frame of the scene. `dispose` frees all of it; the pup's wrap is the one thing that is kept.

import { DoubleSide, Group, InstancedMesh, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { gridGeometry, knotGeometry, knotMaterial, loop, strand, tagGeometry, tagMaterial, tagTexture } from "./cord";
import { cometPiece, ghosts, particles, ribbonGeometry, titleCard } from "./fx";
import { girlGeometry, girlMaterial } from "./girl";
import { DISSOLVE, NOISE, OUT, SKY, g3, hash, sharedUniforms } from "./gl";
import { GIRL_AT, H, WATER_Y, boulders, forest, horizonTexture, lakeGeometry, lakeMaterial, reeds, terrainGeometry, terrainMaterial, town } from "./land";
import { shrineGeometry, shrineMaterial, streamers } from "./shrine";

// THE SKY SHELL: the painted sky as a dome that swells out of the pup (seen from outside it is a bubble of
// twilight, a gold rim), then stands as the backdrop
function skyShell(U) {
  const m = new ShaderMaterial({
    uniforms: { ...U, uInside: { value: 0 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec3 vW; varying vec3 vNn; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vNn = normalize(position); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vNn;
      uniform float uInside;
      ${NOISE}
      ${SKY}
      ${DISSOLVE}
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        float alpha = 1.0;
        vec3 col;
        if (uInside > 0.5) {
          col = sky(v);
          float e = dissolveEdge(1.15 + 0.3 * fbm(v.xz * 3.0 + v.y * 2.0));
          col += e * ${g3("#ffd6a0")} * 1.5;
        } else {
          // the bubble of twilight, seen from outside: the sky it will be, a gold rim
          vec3 d = vNn;
          col = sky(normalize(vec3(d.x, abs(d.y) * 0.7 + 0.05, d.z)));
          float f = pow(1.0 - abs(dot(normalize(vNn), v)), 2.0);
          col += ${g3("#ffc880")} * f * 0.8;
          alpha = mix(0.35, 1.0, f);
        }
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g: new SphereGeometry(1, 40, 20), m };
}

export const REST = {
  CL: new Vector3(1.7, 1.6, -2.7), // where the loops link
  PA: new Vector3(0.93, 0.12, -0.35).normalize(), // the way they are pulled
};

export function buildSteps() {
  const W = { U: sharedUniforms(), ready: false, disposed: false };
  const U = W.U;
  const steps = [
    () => {
      W.sky = skyShell(U);
      W.terrain = { g: terrainGeometry(), m: terrainMaterial(U) };
    },
    () => {
      W.hor = horizonTexture();
      W.lake = { g: lakeGeometry(), m: lakeMaterial(U, W.hor) };
      W.trees = forest(U);
    },
    () => {
      W.boulders = boulders(U);
      W.reeds = reeds(U);
      W.town = town(U);
    },
    () => {
      W.shrine = { g: shrineGeometry(), m: shrineMaterial(U) };
      W.shide = streamers(U);
      W.girl = { g: girlGeometry(), m: girlMaterial(U) };
    },
    () => {
      W.strand = strand(U);
      const grid = gridGeometry(72, 10);
      W.loopGrid = grid;
      W.loopA = loop(U, grid);
      W.loopB = loop(U, grid);
      W.knot = { g: knotGeometry(), ...knotMaterial(U) };
      W.tag = { map: tagTexture() };
      W.tag.g = tagGeometry();
      W.tag.m = tagMaterial(W.tag.map);
    },
    () => {
      W.ribbon = ribbonGeometry();
      W.comets = [cometPiece(U, W.ribbon, 0.0, [0.78, 0.5, 0.92]), cometPiece(U, W.ribbon, 2.1, [0.9, 0.55, 0.8]), cometPiece(U, W.ribbon, 4.7, [0.6, 0.6, 1.0])];
      W.ghosts = ghosts(U);
      W.fire = particles(U, 70, 0, (i) => [-12 + hash(i, 1) * 21, 0.5 + hash(i, 2) * 2.8, -18 + hash(i, 3) * 22, 0.7 + hash(i, 4) * 0.8], 0.0);
      W.lakeGlints = particles(U, 110, 1, (i) => [(hash(i, 1) - 0.5) * 70, WATER_Y + 0.02, -5 - hash(i, 2) ** 1.5 * 90, 0.5 + hash(i, 3) * 0.7], 0.012);
      W.airGlints = particles(U, 60, 1, (i) => [-6 + hash(i, 1) * 14, 0.6 + hash(i, 2) * 5.5, -14 + hash(i, 3) * 16, 0.5 + hash(i, 4) * 0.6], 0.006);
      W.burst = particles(U, 64, 2, () => [0, 0, 0, 0.6], 0.004);
      W.title = titleCard();
    },
    () => {
      // the scene's graph, built once; the move adds `W.root` under its rig
      const root = new Group();
      const mk = (g, m, order = 0) => {
        const o = new Mesh(g, m);
        o.frustumCulled = false;
        o.renderOrder = order;
        return o;
      };
      W.o = {
        sky: mk(W.sky.g, W.sky.m, -3),
        terrain: mk(W.terrain.g, W.terrain.m, -2),
        lake: mk(W.lake.g, W.lake.m, -2),
        shrine: mk(W.shrine.g, W.shrine.m, -2),
        girl: mk(W.girl.g, W.girl.m, -1),
        strandCore: mk(W.strand.g, W.strand.core, 2),
        strandHalo: mk(W.strand.g, W.strand.halo, 3),
        loopACore: mk(W.loopGrid, W.loopA.core, 2),
        loopAHalo: mk(W.loopGrid, W.loopA.halo, 3),
        loopBCore: mk(W.loopGrid, W.loopB.core, 2),
        loopBHalo: mk(W.loopGrid, W.loopB.halo, 3),
        knotCore: mk(W.knot.g, W.knot.core, 2),
        knotHalo: mk(W.knot.g, W.knot.halo, 3),
        tag: mk(W.tag.g, W.tag.m, 2),
      };
      W.o.sky.scale.setScalar(200);
      W.o.knotGroup = new Group();
      W.o.knotGroup.add(W.o.knotCore, W.o.knotHalo, W.o.tag);
      const add = (...x) => x.forEach((o) => root.add(o));
      add(W.o.sky, W.o.terrain, W.o.lake, W.trees, W.boulders, W.reeds, W.town.hm, W.town.win, W.o.shrine, W.shide, W.o.girl);
      add(W.o.strandCore, W.o.strandHalo, W.o.loopACore, W.o.loopAHalo, W.o.loopBCore, W.o.loopBHalo, W.o.knotGroup);
      for (const c of W.comets) add(c.ribbon, c.head);
      add(W.ghosts.mesh, W.fire.mesh, W.lakeGlints.mesh, W.airGlints.mesh, W.burst.mesh, W.title.mesh);
      W.root = root;
      W.girlAt = new Vector3(GIRL_AT[0], Math.max(H(GIRL_AT[0], GIRL_AT[1]), WATER_Y) + 0.0, GIRL_AT[1]);
      W.o.girl.position.copy(W.girlAt);
      W.o.girl.scale.setScalar(2.1);
      W.ready = true;
    },
  ];
  W.dispose = () => {
    if (W.disposed) return;
    W.disposed = true;
    const gs = new Set();
    const ms = new Set();
    W.root?.traverse((o) => {
      if (o.geometry) gs.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => ms.add(m));
    });
    [W.sky?.g, W.terrain?.g, W.lake?.g, W.shrine?.g, W.girl?.g, W.strand?.g, W.loopGrid, W.knot?.g, W.tag?.g, W.ribbon].forEach((g) => g && gs.add(g));
    [W.sky?.m, W.terrain?.m, W.lake?.m, W.shrine?.m, W.girl?.m, W.strand?.core, W.strand?.halo, W.loopA?.core, W.loopA?.halo, W.loopB?.core, W.loopB?.halo, W.knot?.core, W.knot?.halo, W.tag?.m].forEach((m) => m && ms.add(m));
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
    W.hor?.dispose();
    W.tag?.map?.dispose();
    W.title?.tex.dispose();
    for (const o of [W.trees, W.reeds, W.boulders, W.town?.hm, W.town?.win, W.shide, W.fire?.mesh, W.lakeGlints?.mesh, W.airGlints?.mesh, W.burst?.mesh, W.ghosts?.mesh]) if (o instanceof InstancedMesh) o.dispose();
    W.root?.removeFromParent();
  };
  return { W, steps };
}
