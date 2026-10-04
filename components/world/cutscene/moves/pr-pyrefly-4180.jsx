"use client";

// Pyrefly: Naruto's Rasengan on the chain that does not continue. A "to be
// continued" arrow of 208 dots (130 in the shaft, a 78-dot head, one dot at
// the tip) races left to right and stops dead on line A. The pup raises its
// flipper and a spinning blue sphere forms in it, banded like the real
// thing; on the move it is planted on the last dot, and the chain, pinned,
// goes cold. The land speaks, so the whole rig is turned toward the place
// (g3/common.jsx) and the arrow stands where the camera looks.
// Cost: the sphere, its two rings, the instanced chain, the ring: five draw
// calls. Card: lib/world/cutscene/cards/pr-pyrefly-4180.js.

import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, ShaderMaterial, TorusGeometry } from "three";
import { onTwos, signAt, smooth, Stage, useCutFrame } from "../kit";
import { landPoint } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { useStageGroup, CREAM } from "./g3/common";

const SHAFT = 130;
const HEAD = 12; // columns of the head, 12 + 11 + ... + 1 = 78 dots
const N = 208;
const FIST = [-0.55, 1.0, 0.8]; // the pup's raised flipper, in the pup's space (tuned from frames)
const CHAIN_Y = 2.05;
const CHAIN_Z = -3.2;
const CHAIN_X0 = -5.6;

// where each dot sits (before the rig scale) and when it appears
function layout() {
  const pts = [];
  for (let i = 0; i < SHAFT; i++) pts.push([CHAIN_X0 + i * 0.05, 0, 0.032]);
  const hx = CHAIN_X0 + SHAFT * 0.05 + 0.1;
  for (let c = 0; c < HEAD; c++) {
    const n = HEAD - c;
    for (let j = 0; j < n; j++) pts.push([hx + c * 0.125, (j - (n - 1) / 2) * 0.125, 0.052]);
  }
  return pts; // the last is the tip
}

function rasengan() {
  return new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDeep: { value: new Color("#1b4dff") }, uMid: { value: new Color("#4cc4ff") }, uWhite: { value: new Color("#f4fbff") } },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      varying float vF;
      void main() {
        vP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uWhite;
      varying vec3 vP;
      varying float vF;
      void main() {
        float a = atan(vP.z, vP.x);
        float band = sin(a * 3.0 + vP.y * 14.0 - uT * 16.0);
        float band2 = sin(a * 5.0 - vP.y * 9.0 + uT * 11.0);
        vec3 col = mix(uDeep, uMid, smoothstep(-0.3, 0.5, band));
        col = mix(col, uWhite, smoothstep(0.78, 0.98, band) * 0.8 + smoothstep(0.9, 1.0, band2) * 0.5);
        col = mix(col, uWhite, pow(vF, 2.2) * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export default function Move(cut) {
  const { card, place, tl } = cut;
  const root = useRef();
  const ball = useRef();
  const rings = useRef();
  const chain = useRef();
  const burst = useRef();
  const g = useMemo(() => {
    const pts = layout();
    const dots = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ toneMapped: false, fog: false }), N);
    dots.frustumCulled = false;
    dots.setColorAt(0, new Color(CREAM));
    return {
      pts,
      dots,
      o: new Object3D(),
      cream: new Color(CREAM),
      cold: new Color("#7f8fb8"),
      tmp: new Color(),
      sphere: new IcosahedronGeometry(1, 2),
      sphereMat: rasengan(),
      ringGeo: new TorusGeometry(1.45, 0.045, 4, 32),
      ringMat: new MeshBasicMaterial({ color: "#d6f3ff", toneMapped: false, fog: false, transparent: true, opacity: 0.9 }),
      burst: new RingGeometry(0.8, 1, 40),
      burstMat: new MeshBasicMaterial({ color: "#8fdcff", transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
    };
  }, []);

  // the pose: the opening sign, then the flipper closes on the sphere and thrusts
  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    const hold = smooth(2.7, 3.2, t);
    const fade = signAt(tl, t);
    live.pose.sign = fade * (1 - hold);
    live.pose.fist = fade * hold;
    live.pose.crouch = 0.5 * smooth(tl.move[0], tl.move[1], t) * (1 - smooth(tl.move[1] + 0.2, tl.move[1] + 0.8, t));
  });

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const s = live.seal;
    const at = landPoint(card, place);
    const k = Math.min(1.8, Math.max(1, (0.6 * Math.hypot(at.x - s.x, at.z - s.z)) / Math.hypot(1.7, 3.2)));
    const [m0, m1] = tl.move;
    const hit = T - m1;
    const o = g.o;
    // the chain: dots race in left to right, stop, shudder and go cold when pinned
    const dots = chain.current;
    for (let i = 0; i < N; i++) {
      const p = g.pts[i];
      const born = 2.0 + 0.9 * (i / (N - 1));
      let sc = smooth(born, born + 0.14, T) * (i === N - 1 ? 0.07 : i >= SHAFT ? 0.04 : 0.02);
      let dy = 0;
      if (hit >= 0) {
        const d = (N - 1 - i) / 60; // the blow runs back down the chain
        dy = 0.05 * Math.exp(-hit * 5) * Math.sin(hit * 40 - d * 9) * Math.exp(-d);
        dots.setColorAt(i, i === N - 1 ? g.cream : g.tmp.copy(g.cream).lerp(g.cold, smooth(0, 0.5 + d * 0.3, hit)));
      } else dots.setColorAt(i, g.cream);
      if (i === N - 1) sc *= 1.8;
      o.position.set(p[0] * k, CHAIN_Y * k + p[1] * k + dy, CHAIN_Z * k + p[2]);
      o.rotation.set(0, i * 0.7, i * 0.4);
      o.scale.setScalar(Math.max(0.0001, sc * k));
      o.updateMatrix();
      dots.setMatrixAt(i, o.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;

    // the rasengan: forms in the flipper, thrown onto the last dot, spins there
    const tip = g.pts[N - 1];
    const tx = tip[0] * k;
    const ty = CHAIN_Y * k;
    const tz = CHAIN_Z * k + 0.1;
    const grow = smooth(3.0, 4.2, T);
    const fly = smooth(m0, m1, T);
    const e = fly * fly;
    const b = ball.current;
    b.visible = grow > 0.01;
    b.position.set(FIST[0] + (tx - FIST[0]) * e, FIST[1] + (ty - FIST[1]) * e + 0.5 * Math.sin(Math.PI * e), FIST[2] + (tz - FIST[2]) * e);
    const size = (0.07 + 0.19 * grow + (hit >= 0 ? 0.04 + 0.03 * Math.exp(-hit * 6) : 0)) * (1 + 1.2 * e * k * 0.8);
    b.scale.setScalar(Math.max(0.001, size));
    b.rotation.set(0.25, 0, 0.35);
    g.sphereMat.uniforms.uT.value = T;
    rings.current.visible = b.visible;
    rings.current.position.copy(b.position);
    rings.current.rotation.set(1.2 + T * 7, T * 5, 0.4);
    rings.current.scale.setScalar(Math.max(0.001, size * 1.3));
    // the blow
    burst.current.visible = hit >= 0 && hit < 0.5;
    if (burst.current.visible) {
      burst.current.position.set(tx, ty, tz + 0.05);
      burst.current.scale.setScalar(0.25 + 2.4 * Math.min(1, hit / 0.45));
      g.burstMat.opacity = 1 - hit / 0.5;
    }
  });

  return (
    <>
      <Stage {...cut} />
      <group ref={root} visible={false}>
        <mesh ref={ball} geometry={g.sphere} material={g.sphereMat} visible={false} />
        <mesh ref={rings} geometry={g.ringGeo} material={g.ringMat} visible={false} />
        <primitive ref={chain} object={g.dots} />
        <mesh ref={burst} geometry={g.burst} material={g.burstMat} visible={false} />
      </group>
    </>
  );
}
