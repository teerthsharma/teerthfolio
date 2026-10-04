"use client";

// The real pup as a prop. The pup is ~16 plain meshes under the group named
// "seal". A clone shares its geometry and materials and copies every node's
// local transform each frame, after the pup has posed itself, so it moves as
// the pup does. With a `shell` material every mesh draws as a flat colour
// pushed out along its normals: a thick outline at full saturation. Halos,
// glints and other transparent bits are left out of the copy.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, Color, ShaderMaterial } from "three";

// A thick flat outline; uSplit colours the half beyond world x = uCx with uB (a botched fusion: half blue, half violet).
export function shellMaterial(hex, push = 0.04) {
  return new ShaderMaterial({
    uniforms: { uPush: { value: push }, uA: { value: new Color(hex) }, uB: { value: new Color(hex) }, uSplit: { value: 0 }, uCx: { value: 0 }, uK: { value: 1 } },
    side: BackSide,
    vertexShader: /* glsl */ `
      uniform float uPush;
      varying float vX;
      void main() {
        vec4 w = modelMatrix * vec4(position + normal * uPush, 1.0);
        vX = w.x;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uSplit;
      uniform float uCx;
      uniform float uK;
      varying float vX;
      void main() { gl_FragColor = vec4((uSplit > 0.5 && vX > uCx ? uB : uA) * uK, 1.0); }`,
  });
}

// Mount inside the group `gref` points at; the owner places and turns that group.
export function PupClone({ gref, shell = null, top = 0 }) {
  const st = useRef(null);
  useFrame((state) => {
    const g = gref.current;
    if (!g || !g.visible) return;
    if (!st.current) {
      const seal = state.scene.getObjectByName("seal");
      const src = seal?.children.find((c) => !c.isMesh);
      if (!src) return;
      const dst = src.clone(true);
      const A = [];
      const B = [];
      src.traverse((o) => A.push(o));
      dst.traverse((o) => B.push(o));
      for (let i = 0; i < A.length; i++) {
        const o = B[i];
        if (!o.isMesh) continue;
        const m = A[i].material;
        if (m.transparent || !o.geometry.attributes.normal) {
          o.visible = false;
          A[i] = null; // never shown: a halo, a glint, a flat decal
        } else if (shell) o.material = shell;
      }
      if (top) {
        // an outline wants only the big masses: body, head, flippers
        const size = (o) => {
          o.geometry.boundingSphere ?? o.geometry.computeBoundingSphere();
          return o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
        };
        const big = B.filter((o, i) => A[i] && o.isMesh).sort((x, y) => size(y) - size(x));
        for (const o of big.slice(top)) {
          o.visible = false;
          A[B.indexOf(o)] = null;
        }
      }
      g.add(dst);
      st.current = { A, B };
    }
    const { A, B } = st.current;
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      if (!a) continue;
      const b = B[i];
      b.position.copy(a.position);
      b.quaternion.copy(a.quaternion);
      b.scale.copy(a.scale);
      b.visible = a.visible;
    }
  }, 0.2);
  return null;
}
