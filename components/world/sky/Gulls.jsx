"use client";

// Seabirds: a loose flock of kittiwakes (white body, dove-grey wings, ink
// tips) wheeling over wherever the seal is, the way gulls follow a boat.
// One instanced mesh; the wingbeat is in the vertex shader (bursts of
// flapping between long glides, each bird on its own beat), and the shadow
// pass runs the same shader so the shadows flap too.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Color, DoubleSide, Euler, Float32BufferAttribute, MeshDepthMaterial, MeshStandardMaterial, Object3D, RGBADepthPacking } from "three";
import { live } from "../../../lib/world/store";
import { C } from "../palette";

const BIRDS = 7;
const SPEED = 5.5; // m/s along the circle
const SHOULDER = 0.07; // m from the centre line: where each wing hinges
const FOLLOW = 7; // s for the flock's centre to catch up with the seal
const AHEAD = -7; // m up the screen of the seal, so the circle sits in view

// A bird facing +z, wings along x: [x, y, z] corners of each triangle, with
// the colour for the triangle.
function buildBird() {
  const body = new Color("#ffffff");
  const wing = new Color("#c3cad6");
  const tip = new Color(C.charcoal);
  const beak = new Color("#f2c14e");
  const tris = [];
  const add = (color, ...pts) => tris.push([color, pts]);
  // the body: a spindle, nose to tail
  const nose = [0, 0.01, 0.34];
  const tail = [0, 0.03, -0.26];
  const top = [0, 0.1, 0.06];
  const bottom = [0, -0.07, 0.06];
  const left = [-0.085, 0.01, 0.06];
  const right = [0.085, 0.01, 0.06];
  add(body, nose, right, top);
  add(body, nose, top, left);
  add(body, nose, bottom, right);
  add(body, nose, left, bottom);
  add(body, tail, top, right);
  add(body, tail, left, top);
  add(body, tail, right, bottom);
  add(body, tail, bottom, left);
  add(beak, [0, 0.01, 0.44], [0.03, 0.01, 0.33], [-0.03, 0.01, 0.33]);
  // the tail fan
  add(body, [0, 0.03, -0.2], [0.1, 0.03, -0.36], [-0.1, 0.03, -0.36]);
  // each wing: an M in plan, the inner wing swept forward to the wrist and
  // the outer wing back to an inked tip
  for (const s of [-1, 1]) {
    const shoulderLead = [s * SHOULDER, 0.03, 0.12];
    const shoulderTrail = [s * SHOULDER, 0.03, -0.08];
    const wristLead = [s * 0.36, 0.05, 0.14];
    const wristTrail = [s * 0.34, 0.05, -0.06];
    const handLead = [s * 0.52, 0.03, 0.06];
    const handTrail = [s * 0.5, 0.03, -0.1];
    const tipPt = [s * 0.68, 0.0, -0.14];
    add(wing, shoulderLead, wristLead, wristTrail);
    add(wing, shoulderLead, wristTrail, shoulderTrail);
    add(wing, wristLead, handLead, handTrail);
    add(wing, wristLead, handTrail, wristTrail);
    add(tip, handLead, tipPt, handTrail);
  }
  const pos = [];
  const col = [];
  for (const [color, pts] of tris) {
    for (const p of pts) {
      pos.push(...p);
      col.push(color.r, color.g, color.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// The wingbeat: every vertex past the shoulder turns about it. Flapping
// comes in bursts (a slow cycle per bird), gliding holds a slight dihedral.
const time = { value: 0 };
function flap(shader) {
  shader.uniforms.uTime = time;
  shader.vertexShader = shader.vertexShader
    .replace("void main() {", "uniform float uTime;\nvoid main() {")
    .replace(
      "#include <begin_vertex>",
      /* glsl */ `
      vec3 transformed = vec3(position);
      float ax = abs(position.x);
      if (ax > ${SHOULDER.toFixed(3)}) {
        float ph = float(gl_InstanceID) * 2.39;
        float burst = smoothstep(-0.1, 0.5, sin(uTime * 0.5 + ph));
        float a = 0.16 + burst * 0.6 * sin(uTime * 8.5 + ph);
        float r = ax - ${SHOULDER.toFixed(3)};
        transformed.x = sign(position.x) * (${SHOULDER.toFixed(3)} + r * cos(a));
        transformed.y = position.y + r * sin(a);
      }
      `,
    );
}

const dummy = new Object3D();
const euler = new Euler(0, 0, 0, "YXZ");

export default function Gulls() {
  const ref = useRef();
  const geometry = useMemo(buildBird, []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, side: DoubleSide });
    m.onBeforeCompile = flap;
    m.customProgramCacheKey = () => "sky-gull";
    return m;
  }, []);
  const depth = useMemo(() => {
    const m = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, side: DoubleSide });
    m.onBeforeCompile = flap;
    m.customProgramCacheKey = () => "sky-gull-depth";
    return m;
  }, []);
  const flock = useRef({ x: live.seal.x, z: live.seal.z + AHEAD });
  const birds = useMemo(
    () => Array.from({ length: BIRDS }, (_, i) => ({
      radius: 9 + (i % 3) * 2.2,
      angle: i * 0.55 + (i % 2) * 2.6,
      height: 9.5 + (i % 4) * 0.9,
      phase: i * 1.7,
    })),
    [],
  );

  useLayoutEffect(() => {
    if (ref.current) ref.current.customDepthMaterial = depth;
  }, [depth]);

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.elapsedTime;
    time.value = t;
    const f = flock.current;
    const k = 1 - Math.exp(-dt / FOLLOW);
    f.x += (live.seal.x - f.x) * k;
    f.z += (live.seal.z + AHEAD - f.z) * k;
    for (let i = 0; i < BIRDS; i++) {
      const b = birds[i];
      const r = b.radius + 2 * Math.sin(t * 0.21 + b.phase);
      b.angle += (SPEED / r) * dt;
      const a = b.angle;
      dummy.position.set(f.x + Math.cos(a) * r, b.height + 0.8 * Math.sin(t * 0.4 + b.phase), f.z + Math.sin(a) * r);
      // heading along the circle (angle rising from +x toward +z), banked
      // into the turn: the outer (right) wing up
      euler.set(0.05 * Math.sin(t * 0.7 + b.phase), -a, 0.42);
      dummy.quaternion.setFromEuler(euler);
      dummy.scale.setScalar(1.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, BIRDS]} castShadow frustumCulled={false} />;
}
