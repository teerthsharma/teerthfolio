"use client";

// THE SASTRUGI PLAIN (lib/world/sastrugi.js): one InstancedMesh of ridges, noses up the wind; its shadows are its picture.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Object3D, Vector3 } from "three";
import { BASE, NOSE, RIDGES } from "../../../lib/world/sastrugi";
import { detail } from "../../../lib/world/detail";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { C, mat } from "../palette";

// Island.jsx's sun, in the ridge frame (the ridges are yawed by NOSE). Faces that look away from it are the lee.
const SUN = new Vector3(-14, 26, 12).normalize().applyAxisAngle(new Vector3(0, 1, 0), -NOSE);
const LIT = new Color(C.snow);
const LEE_BAND = new Color("#c3b3ea"); // the open west's lee band
const LEE_PLAIN = new Color("#e3a8d6"); // the Shape Garden's plain
const CENTRE = new Vector3(0, 0.3, 0);
const SPLIT = RIDGES.findIndex((r) => r.z > 20); // lib/world/sastrugi.js lists the band first
const BAND = SPLIT < 0 ? RIDGES.length : SPLIT;

// One ridge in a unit box (x length, y height, z width): tail on the ground, crest, undercut nose lip, eight triangles.
const T = [-0.5, 0, 0];
const A = [0.2, 0, -0.5];
const B = [0.2, 0, 0.5];
const K = [0.25, 1, 0];
const N = [0.5, 0.55, 0];
const F = [0.42, 0, 0];
const TRIS = [[T, A, K], [K, B, T], [A, F, K], [K, F, B], [K, N, F], [K, F, N], [T, A, F], [T, F, B]];

const at = (p) => new Vector3(...p);

function lit([a, b, c]) {
  const n = new Vector3().crossVectors(at(b).sub(at(a)), at(c).sub(at(a)));
  const side = n.dot(at(a).add(at(b)).add(at(c)).multiplyScalar(1 / 3).sub(CENTRE));
  return Math.abs(side) > 1e-6 && n.multiplyScalar(Math.sign(side)).normalize().dot(SUN) > 0.1;
}

function ridge(lee) {
  const g = new BufferGeometry();
  const colour = TRIS.flatMap((t) => {
    const c = lit(t) ? LIT : lee;
    return [c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b];
  });
  g.setAttribute("position", new Float32BufferAttribute(TRIS.flat(2), 3));
  g.setAttribute("color", new Float32BufferAttribute(colour, 3));
  return g;
}

const dummy = new Object3D();

export default function Sastrugi() {
  const bandGeo = useMemo(() => ridge(LEE_BAND), []);
  const plainGeo = useMemo(() => ridge(LEE_PLAIN), []);
  const material = mat("#ffffff", { side: DoubleSide, vertexColors: true });
  const band = useRef(null);
  const plain = useRef(null);
  const tier = useUi((s) => s.tier);
  const count = Math.min(RIDGES.length, detail(BASE, tier));

  useLayoutEffect(() => {
    RIDGES.forEach((r, i) => {
      dummy.position.set(r.x, heightAt(r.x, r.z), r.z);
      dummy.rotation.set(0, r.yaw, 0);
      dummy.scale.set(r.len, r.h, r.w);
      dummy.updateMatrix();
      (i < BAND ? band.current : plain.current).setMatrixAt(i < BAND ? i : i - BAND, dummy.matrix);
    });
    for (const mesh of [band.current, plain.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [bandGeo]);

  useEffect(() => {
    band.current.count = Math.min(BAND, count);
    plain.current.count = Math.max(0, count - BAND);
  }, [count]);

  return (
    <>
      <instancedMesh ref={band} args={[bandGeo, material, BAND]} castShadow receiveShadow />
      <instancedMesh ref={plain} args={[plainGeo, material, RIDGES.length - BAND]} castShadow receiveShadow />
    </>
  );
}
