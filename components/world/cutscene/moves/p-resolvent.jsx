"use client";

// The Resolvent: Aizen ("Since when were you under the impression they were
// two?"). A coat-and-glasses ink figure stands already behind the pup. On
// line A two afterimages of the pup split off, one for softmax (amber) and
// one for the Markov path (cyan); on the move they slam into the pup and it
// squashes: one body. On line B a pane of glass in front of the scene cracks
// from the pup outward and shatters (Kyoka Suigetsu), and behind it stands
// one operator: a single pale disc. No shared stage piece is edited.
// Cost: the two afterimages (one mesh each), the pane (one mesh, shards and
// cracks in the shader), the disc, the ring, the coat: seven draw calls
// beyond the figure. Card: lib/world/cutscene/cards/p-resolvent.js.

import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, MeshBasicMaterial, RingGeometry, ShaderMaterial } from "three";
import { Speaker, Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { live } from "../../../../lib/world/store";
import { FigureAttach, inkGeo, inkMats, merged, srgb, useStageGroup } from "./g3/common";

const PANE = { x: 0.5, y: 1.4, z: 2.6, cols: 14, rows: 10, cell: 0.9 };
const ORIGIN = [0, 1.0]; // the crack starts at the pup's chest

// the afterimage: a low-poly pup, round head, no ears
function ghostGeo() {
  const body = new IcosahedronGeometry(0.5, 1).scale(0.85, 0.72, 1.3).translate(0, 0.52, -0.1);
  const head = new IcosahedronGeometry(0.4, 1).translate(0.05, 0.86, 0.5);
  const fl = [-1, 1].map((s) => new BoxGeometry(0.5, 0.07, 0.24).rotateZ(s * 0.5).translate(s * 0.5, 0.42, 0.15));
  const parts = [body, head, ...fl].map((g) => (g.index ? g.toNonIndexed() : g));
  for (const p of parts) {
    p.deleteAttribute("uv");
    p.deleteAttribute("normal");
  }
  return merged(parts);
}

// the pane of glass: jittered grid, two triangles a cell, everything the
// shatter needs in attributes so it costs the CPU nothing
function paneGeo() {
  const { cols, rows, cell } = PANE;
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const V = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) V.push([(i - cols / 2) * cell + (rand() - 0.5) * cell * 0.55, (j - rows / 2) * cell + (rand() - 0.5) * cell * 0.55]);
  }
  const pos = [];
  const cen = [];
  const bary = [];
  const rnd = [];
  const tri = (a, b, c) => {
    const r = rand();
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    [a, b, c].forEach((v, n) => {
      pos.push(v[0], v[1], 0);
      cen.push(cx, cy, 0);
      bary.push(n === 0 ? 1 : 0, n === 1 ? 1 : 0, n === 2 ? 1 : 0);
      rnd.push(r);
    });
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = V[j * (cols + 1) + i];
      const b = V[j * (cols + 1) + i + 1];
      const c = V[(j + 1) * (cols + 1) + i];
      const d = V[(j + 1) * (cols + 1) + i + 1];
      if (rand() < 0.5) {
        tri(a, b, d);
        tri(a, d, c);
      } else {
        tri(a, b, c);
        tri(b, d, c);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aCenter", new BufferAttribute(new Float32Array(cen), 3));
  g.setAttribute("aBary", new BufferAttribute(new Float32Array(bary), 3));
  g.setAttribute("aRnd", new BufferAttribute(new Float32Array(rnd), 1));
  return g;
}

function glassMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uK: { value: -1 }, uCrack: { value: 0 }, uOrigin: { value: ORIGIN }, uColor: { value: new Color() } },
    vertexShader: /* glsl */ `
      attribute vec3 aCenter;
      attribute vec3 aBary;
      attribute float aRnd;
      uniform float uK;
      uniform vec2 uOrigin;
      varying vec3 vBary;
      varying float vK;
      varying float vD;
      void main() {
        vec3 p = position - aCenter;
        float k = max(uK - aRnd * 0.2, 0.0);
        vec2 dir = aCenter.xy - uOrigin;
        vD = length(dir);
        dir /= max(vD, 0.001);
        float ang = k * (1.5 + 4.0 * aRnd) * (aRnd > 0.5 ? 1.0 : -1.0);
        float c = cos(ang), s = sin(ang);
        p.xy = mat2(c, s, -s, c) * p.xy;
        float c2 = cos(ang * 0.6), s2 = sin(ang * 0.6);
        p.xz = mat2(c2, s2, -s2, c2) * p.xz;
        vec3 w = aCenter + p + vec3(dir * (0.8 + 2.2 * aRnd) * k, 1.2 * k);
        w.y -= 4.5 * k * k;
        vBary = aBary;
        vK = k;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCrack;
      uniform vec3 uColor;
      varying vec3 vBary;
      varying float vK;
      varying float vD;
      void main() {
        float e = min(min(vBary.x, vBary.y), vBary.z);
        float edge = 1.0 - smoothstep(0.0, fwidth(e) * 2.4, e);
        float cracked = step(vD, uCrack * 9.0);
        float fade = 1.0 - smoothstep(0.9, 1.6, vK);
        float face = vK > 0.0 ? 0.1 : 0.0;
        float a = (edge * cracked * 0.95 + face) * fade;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
}

function operatorMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color() } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float disc = 1.0 - smoothstep(0.52, 0.56, r);
        float halo = exp(-r * 3.5) * 0.5;
        float rim = smoothstep(0.46, 0.52, r) * (1.0 - smoothstep(0.52, 0.56, r)) * 0.8;
        gl_FragColor = vec4(uColor * (disc * 0.6 + halo + rim), 1.0);
      }`,
  });
}

// the coat: long, flared, below and behind the kit figure (its own space)
const coat = () => inkGeo([new CylinderGeometry(0.27, 0.5, 1.05, 7, 1, true).translate(0, 0.68, -0.04), new CylinderGeometry(0.33, 0.28, 0.2, 7, 1, true).translate(0, 1.5, -0.01)]);

export default function Move(cut) {
  const { card, tl } = cut;
  const root = useRef();
  const A = useRef();
  const B = useRef();
  const pane = useRef();
  const one = useRef();
  const ring = useRef();
  const g = useMemo(
    () => ({
      ghost: ghostGeo(),
      matA: new MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.6, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }), // softmax
      matB: new MeshBasicMaterial({ color: "#4fd8ff", transparent: true, opacity: 0.6, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }), // the Markov path
      pane: paneGeo(),
      glass: glassMaterial(),
      disc: new CircleGeometry(1, 40),
      discMat: operatorMaterial(),
      ring: new RingGeometry(0.8, 1, 40),
      ringMat: new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
      coat: coat(),
    }),
    [],
  );
  useMemo(() => {
    const p = paletteFor(card);
    srgb(g.glass.uniforms.uColor.value, p.core);
    srgb(g.discMat.uniforms.uColor.value, p.core);
    srgb(g.ringMat.color, p.core);
  }, [card, g]);

  const [m0, m1] = tl.move;
  const CRACK = [m1, m1 + 0.55];
  const BREAK = m1 + 0.6;

  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    const slam = t - m1;
    live.pose.sign = signAt(tl, t) * (1 - smooth(m0, m1, t));
    live.pose.crouch = slam > 0 ? 0.9 * Math.exp(-slam * 3.5) : 0.4 * smooth(m0, m1, t);
  });

  const ink = inkMats();
  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const hit = T - m1;
    // the afterimages: split off on line A, stutter in place, slam in on the move
    const out = smooth(tl.lineA, tl.lineA + 0.5, T);
    const e = smooth(m0, m1, T);
    const come = 1 - e * e;
    const step = Math.floor(T * 6);
    [[A.current, -1.7, 0], [B.current, 1.8, 1]].forEach(([m, x0, i]) => {
      m.visible = out > 0.01 && hit < 0.05;
      m.position.set(x0 * out * come + 0.08 * (step % 2 ? 1 : -1) * come, 0.04 * ((step + i) % 2), 0.25 + 0.2 * out * (i ? 1 : -1) * come);
      m.rotation.y = 0.6 + (i ? -0.2 : 0.2);
      m.scale.setScalar(Math.max(0.001, out * (1 + 0.1 * e)));
    });
    // the glass: cracks from the pup, then breaks and falls
    g.glass.uniforms.uCrack.value = smooth(CRACK[0], CRACK[1], T);
    g.glass.uniforms.uK.value = T >= BREAK ? T - BREAK : -1;
    pane.current.position.set(PANE.x, PANE.y, PANE.z);
    pane.current.visible = hit >= 0 && T < BREAK + 1.8;
    // one operator behind it
    const born = smooth(BREAK, BREAK + 0.7, T);
    one.current.visible = born > 0.01;
    one.current.position.set(0.2, 1.55, -1.4);
    one.current.scale.setScalar(Math.max(0.001, 1.5 * born * (1 + 0.04 * Math.sin(T * 3))));
    // the flash where the afterimages meet the pup
    ring.current.visible = hit >= 0 && hit < 0.45;
    if (ring.current.visible) {
      ring.current.position.set(0, 0.7, 0.8);
      ring.current.scale.setScalar(0.3 + 2.6 * Math.min(1, hit / 0.4));
      g.ringMat.opacity = 1 - hit / 0.45;
    }
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <FigureAttach {...cut}>
        <mesh geometry={g.coat.outline} material={ink.outline} />
        <mesh geometry={g.coat.ink} material={ink.ink} />
      </FigureAttach>
      <group ref={root} visible={false}>
        <mesh ref={A} geometry={g.ghost} material={g.matA} visible={false} />
        <mesh ref={B} geometry={g.ghost} material={g.matB} visible={false} />
        <mesh ref={one} geometry={g.disc} material={g.discMat} visible={false} />
        <mesh ref={pane} geometry={g.pane} material={g.glass} visible={false} frustumCulled={false} />
        <mesh ref={ring} geometry={g.ring} material={g.ringMat} visible={false} />
      </group>
    </>
  );
}
