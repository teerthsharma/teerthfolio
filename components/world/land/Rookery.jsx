"use client";

// THE ROOKERY (lib/world/rookery.js): an Adelie colony with pebble nests, birds, chicks, a toboggan groove and guano fans.
// Nests, birds and chicks are InstancedMeshes on the ground; the groove and fans are one vertex-coloured decal mesh.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry, Object3D, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BASE_BIRDS, BASE_CHICKS, BIRDS, CHICKS, DECAL, GROOVE_BIRDS, NESTS, SITE, STRETCH } from "../../../lib/world/rookery";
import { heightAt } from "../../../lib/world/terrain";
import { live, useUi } from "../../../lib/world/store";
import { C, mat } from "../palette";

const SCALE = [0.4, 0.6, 1, 1, 1.25];
const detail = (base, tier) => Math.max(1, Math.round(base * SCALE[tier]));
const GROOVE_TONE = new Color("#dfe6f3");
const FAN_TONE = [new Color("#e8d4cf"), new Color("#f4ebe8")];
const dummy = new Object3D();

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};

function bird() {
  const body = new IcosahedronGeometry(0.2, 1).scale(1, 1.7, 0.9).translate(0, 0.34, 0);
  const white = new Color(C.snow);
  const dark = new Color(C.charcoal);
  const pos = body.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) col.set(pos.getZ(i) > 0.03 ? [white.r, white.g, white.b] : [dark.r, dark.g, dark.b], i * 3);
  body.setAttribute("color", new Float32BufferAttribute(col, 3));
  body.deleteAttribute("normal");
  body.deleteAttribute("uv");
  const head = painted(new IcosahedronGeometry(0.11, 0).translate(0, 0.74, 0.02), C.charcoal);
  const beak = painted(new ConeGeometry(0.035, 0.09, 4).rotateX(Math.PI / 2).translate(0, 0.74, 0.14), "#c9643c");
  const g = mergeGeometries([body, head, beak]);
  g.computeVertexNormals();
  return g;
}

function decal() {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(DECAL.pos, 3));
  const col = new Float32Array(DECAL.tone.length * 3);
  DECAL.tone.forEach((t, i) => {
    const c = t ? FAN_TONE[0].clone().lerp(FAN_TONE[1], DECAL.fade[i]) : GROOVE_TONE;
    col.set([c.r, c.g, c.b], i * 3);
  });
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(DECAL.index);
  g.computeVertexNormals();
  return g;
}

export default function Rookery() {
  const ground = useMemo(decal, []);
  const nestGeo = useMemo(() => {
    const ring = (r, tube, radial, tubular, hex) => painted(new TorusGeometry(r, tube, radial, tubular).rotateX(Math.PI / 2).scale(1, 0.6, 1), hex);
    const g = mergeGeometries([ring(0.42, 0.09, 3, 10, "#8d8a92"), ring(0.25, 0.07, 3, 8, "#b0adb6")]);
    g.computeVertexNormals();
    return g;
  }, []);
  const birdGeo = useMemo(bird, []);
  const chickGeo = useMemo(() => new IcosahedronGeometry(0.13, 0), []);
  const at = useMemo(() => BIRDS.map((b) => heightAt(b.x, b.z)), []);
  const nests = useRef(null);
  const birds = useRef(null);
  const chicks = useRef(null);
  const tier = useUi((s) => s.tier) ?? 0;
  const groundMat = mat("#ffffff", { vertexColors: true, roughness: 0.92 });
  const nestMat = mat("#ffffff", { vertexColors: true, roughness: 0.9 });
  const birdMat = mat("#ffffff", { vertexColors: true, roughness: 0.6 });
  const chickMat = mat("#8b8f98", { roughness: 0.8 });

  useLayoutEffect(() => {
    const d = new Object3D();
    const put = (mesh, list, lift, yawOf) => {
      list.forEach((p, i) => {
        d.position.set(p.x, heightAt(p.x, p.z) + lift, p.z);
        d.rotation.set(0, yawOf(i), 0);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    put(nests.current, NESTS, 0.08, () => 0);
    put(birds.current, BIRDS, 0, (i) => BIRDS[i].yaw);
    put(chicks.current, CHICKS, 0.13, () => 0);
  }, [at]);

  useEffect(() => {
    if (birds.current) birds.current.count = Math.min(BIRDS.length, GROOVE_BIRDS + detail(BASE_BIRDS, tier));
    if (chicks.current) chicks.current.count = Math.min(CHICKS.length, detail(BASE_CHICKS, tier));
  }, [tier]);

  useFrame(({ clock }) => {
    const seal = live.seal;
    const d = Math.hypot(seal.x - SITE.x, seal.z - SITE.z);
    const mesh = birds.current;
    if (d > 60 || !mesh) return;
    const t = clock.elapsedTime;
    const near = d <= 40;
    for (let i = 0; i < STRETCH; i++) {
      const b = BIRDS[i];
      const s = near ? 1 + 0.09 * (1 + Math.sin((2 * Math.PI * t) / 2.4 + i)) : 1;
      dummy.position.set(b.x, at[i], b.z);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.scale.set(1, s, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh geometry={ground} material={groundMat} receiveShadow />
      <instancedMesh ref={nests} args={[nestGeo, nestMat, NESTS.length]} receiveShadow />
      <instancedMesh ref={birds} args={[birdGeo, birdMat, BIRDS.length]} castShadow receiveShadow />
      <instancedMesh ref={chicks} args={[chickGeo, chickMat, CHICKS.length]} receiveShadow />
    </>
  );
}
