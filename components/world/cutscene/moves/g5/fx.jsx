"use client";

// Small cheap parts shared by the four g5 moves (p-nerve, p-separatrix,
// p-planimeter, p-tangle): a group that follows the pup and shows only inside
// the stage, flat/additive materials, a radial glow, a ribbon builder, and the
// figure's entrance frames so add-ons for the speaker (a cape, a pupil) step in
// and out with it. 3D only; the comic layer is ui/Bubbles.jsx.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, ShaderMaterial } from "three";
import { live } from "../../../../../lib/world/store";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ramp = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// 0..1 out to the end of the scene: the move lets go as the stage collapses
export const outK = (tl, t) => 1 - ramp(tl.collapse[1], tl.duration, t);
export const twos = (t) => Math.floor(t * 12) / 12;
export const rand = (seed) => {
  let s = (Math.imul(seed + 1, 2654435761) >>> 1) % 2147483646 + 1; // a hashed start: small seeds give alike first draws otherwise
  const next = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  next();
  next();
  return next;
};

// A group at the pup's feet, shown only while the stage is up in a full scene.
export function useStageGroup(cut, fn) {
  const ref = useRef();
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const on = cut.mode === "full" && live.arrival.id && live.inStage;
    g.visible = Boolean(on);
    if (!on) return;
    g.position.set(live.seal.x, 0, live.seal.z);
    fn?.(state.clock.elapsedTime - live.arrival.start, state, dt, g);
  }, -1.1);
  return ref;
}

export const flat = (color, o = {}) => new MeshBasicMaterial({ color, toneMapped: false, fog: false, side: DoubleSide, ...o });
export const additive = (color, o = {}) => flat(color, { blending: AdditiveBlending, transparent: true, depthWrite: false, ...o });
export const fade = (m, a) => {
  m.opacity = a;
  m.visible = a > 0.004;
};

// A soft radial light (additive), the place's colour in sRGB like Stage's.
export function glowMat(color, power = 2) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color).convertLinearToSRGB() }, uA: { value: 1 }, uP: { value: power } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 uColor;uniform float uA,uP;varying vec2 vUv;void main(){float r=length(vUv*2.-1.);float k=pow(1.-smoothstep(0.,1.,r),uP);gl_FragColor=vec4(pow(uColor,vec3(2.2))*k*uA,1.);}",
  });
}

// A flat ribbon along a polyline in the XY plane (z=0), `w` wide. One mesh.
export function ribbon(points, w, closed = false) {
  const pos = [];
  const n = points.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % n];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * (w / 2);
    const ny = (dx / l) * (w / 2);
    pos.push(ax + nx, ay + ny, 0, ax - nx, ay - ny, 0, bx + nx, by + ny, 0, bx + nx, by + ny, 0, ax - nx, ay - ny, 0, bx - nx, by - ny, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}

// The speaker's entrance and exit frames (Speaker.jsx's ENTER), so a cape or a
// glint steps in on the same twos: returns [sx, sy] or null while it is away.
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];
export function figureFrame(t, tl, mode) {
  const inF = Math.floor((t - tl.enter) * 12);
  const outF = Math.floor((t - tl.collapse[0]) * 12);
  const frame = mode === "still" ? 9 : outF >= 0 ? 2 - outF : inF;
  return frame < 0 ? null : ENTER[frame] ?? [1, 1];
}
