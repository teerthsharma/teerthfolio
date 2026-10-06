// WORLD helpers for p-planimeter (promotion candidates: grid, varPaint, cel, texMat, canvasTex, addBlend, SEAL_CLEAR).
// Room coordinates: floor y = 0; the whole set sits in a group lifted to FLOOR (the seal's seat top is y = 0).
import {
  AddEquation, BufferAttribute, BufferGeometry, CanvasTexture, Color, CustomBlending, DataTexture, LinearFilter, OneFactor,
  OneMinusSrcAlphaFactor, ShaderMaterial, SRGBColorSpace, SrcAlphaFactor, Vector3, ZeroFactor,
} from "three";
import { paint, painted } from "../../../sdf.js";

export const FLOOR = -0.93;                       // floor height in seal coordinates (the Reviewer stands at y = -0.93)
export const ROOM = { x0: -6.2, x1: 6.2, z0: -5.1, z1: 11.5, h: 5.4 };
export const WIN = { zc: [-3.2, 0.6, 4.4, 8.2], hw: 1.4, y0: 0.8, y1: 4.5 };   // west windows (bible E1)
export const SUN = { az: -1.45, el: 0.21 };       // sky dome sun: 12 degrees above the horizon, west-north-west
export const sunDir = () => new Vector3(Math.sin(SUN.az) * Math.cos(SUN.el), Math.sin(SUN.el), -Math.cos(SUN.az) * Math.cos(SUN.el));

export const C = (h) => new Color(h);
// the bible's measured palette (sRGB hex; three converts to linear on construction)
export const P = {
  wallLit: "#f6e7cf", wallMid: "#e8c8a0", wallShade: "#b098c8", floorLit: "#d9a05e", floorMid: "#b9783f", floorShade: "#7a4a50",
  ceil: "#efe3cc", panel: "#fff6d6", red: "#b8232f", cream: "#fbf6ea", wood: "#a8683c", woodShade: "#7a4a50",
  frame: "#fbf6ea", frameShade: "#d9c8a8", sill: "#e9dcc2", curtain: "#f1a9b9", curtainShade: "#c0708a", tie: "#fff1c8", pelmet: "#8a5430",
  desk: "#d9a05e", deskShade: "#8a5a4a", leg: "#7d8896", legShade: "#4c5666", ink: "#3a2a22",
  haloRay: "#ffc766", coreRay: "#fff0b8", mote: "#fff6d6", sunset: "#ff9a4a", glow: "#ffd98a", sunCore: "#fff4c8",
  board: "#2f6f55", board2: "#1e4f3d", chalk: "#fffdf0", boardFrame: "#c9a066",
  bronze: "#a67c3c", bronzeShade: "#6b4a20", bronzeHi: "#e6c070", doorWall: "#8a5a34", doorShade: "#5a3a20", hall: "#fada51",
  green: "#038903", greenLit: "#3ddc84", greenRim: "#b0fff9", greenHalo: "#d4fffe",
};

// a flat-normal grid: p0 + u*i/nu + v*j/nv; the front face is cross(u, v), so choose u, v to face the room
export function grid(p0, u, v, nu = 1, nv = 1) {
  const pos = [], idx = [], nrm = [];
  const n = new Vector3().crossVectors(new Vector3(...u), new Vector3(...v)).normalize();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    pos.push(p0[0] + u[0] * i / nu + v[0] * j / nv, p0[1] + u[1] * i / nu + v[1] * j / nv, p0[2] + u[2] * i / nu + v[2] * j / nv);
    nrm.push(n.x, n.y, n.z);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = b + nu + 1, d = a + nu + 1;
    idx.push(a, b, c, a, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.setIndex(idx);
  return g;
}

// one solid-colour set prop on the shared anime program (3-band cel from the key light)
export function cel(ctx, geo, col, shade, o = {}) {
  const id = o.id ?? 0.5;
  painted(geo, paint(col, shade, { id, line: o.line ?? 1, bias: o.bias }), { bias: o.bias });
  const m = ctx.engine.prop(geo, id);
  if (o.emit) m.material.uniforms.uEmit.value.setRGB(o.emit[0], o.emit[1], o.emit[2]);
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  return m;
}

// a prop whose lit and shade colours vary per vertex (airbrush gradients). Geometry is in WORLD room coordinates.
// fn(x, y, z, i, geo) -> [Color lit, Color shade] (linear)
export function varPaint(ctx, geo, fn, o = {}) {
  const pos = geo.attributes.position, N = pos.count, id = o.id ?? 0.5;
  const cA = new Float32Array(N * 3), sA = new Float32Array(N * 3), xA = new Float32Array(N * 3), bA = new Float32Array(N * 4), nA = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [c, s] = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i, geo);
    cA.set([c.r, c.g, c.b], i * 3); sA.set([s.r, s.g, s.b], i * 3);
    xA.set([o.bias ?? 0.5, o.line ?? 1, id], i * 3); nA.set([0, 1, 0], i * 3);
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.setAttribute("aCol", new BufferAttribute(cA, 3)); geo.setAttribute("aShade", new BufferAttribute(sA, 3));
  geo.setAttribute("aXrd", new BufferAttribute(xA, 3)); geo.setAttribute("aBlob", new BufferAttribute(bA, 4)); geo.setAttribute("aBlobN", new BufferAttribute(nA, 3));
  return ctx.engine.prop(geo, id);
}

// unlit textured plate (paper, board, tags). Writes the set id to alpha; cutout (never blends the id channel).
const TEX_V = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
export function texMat(tex, o = {}) {
  return new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uId: { value: o.id ?? 0.5 }, uGain: { value: new Color(...(o.gain ?? [1, 1, 1])) }, uCut: { value: o.cut ?? -1 } },
    vertexShader: TEX_V,
    fragmentShader: "uniform sampler2D tMap; uniform float uId; uniform vec3 uGain; uniform float uCut; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < uCut) discard; gl_FragColor = vec4(c.rgb * uGain, uId); }",
  });
}

// a 2D canvas as a texture; headless (no document) falls back to a 1px texture so the layer still builds
export function canvasTex(w, h, draw) {
  if (typeof document === "undefined") {
    const t = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true;
    return { tex: t, g: null, canvas: null, redraw() {}, w, h };
  }
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d");
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace; tex.minFilter = LinearFilter; tex.generateMipmaps = false; tex.anisotropy = 4;
  const self = { tex, g, canvas, w, h, redraw(...a) { g.clearRect(0, 0, w, h); draw?.(g, w, h, ...a); tex.needsUpdate = true; } };
  self.redraw();
  return self;
}

// additive that never touches the id channel (alpha): rgb = dst + src, a = dst.a
export const addBlend = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor, transparent: true, depthWrite: false };
// straight alpha over, id channel preserved
export const overBlend = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: SrcAlphaFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor, transparent: true, depthWrite: false };

// L2: light cards, glows and motes fade out wherever they sit between the lens and the seal.
// sealClear(world pos) = 1 away from the seal's sight line, 0 on it. uSeal = the seal's chest, world space.
export const SEAL_CLEAR = /* glsl */ `
  uniform vec3 uSeal;
  float sealClear(vec3 wp) {
    vec3 ca = uSeal - cameraPosition;
    float tt = dot(wp - cameraPosition, ca) / max(dot(ca, ca), 1e-4);
    float dd = length(wp - cameraPosition - ca * clamp(tt, 0.0, 1.0));
    float before = 1.0 - smoothstep(0.88, 1.04, tt);            // only what is nearer the lens than the seal
    return mix(1.0, smoothstep(0.5, 1.5, dd), before);
  }`;

// deterministic scalar hash for JS-side variation
export const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// seconds a named beat starts at (scene data), else the bible's frame time
export function beatT(ctx, name, fallback) {
  const b = ctx.scene.beats?.find((x) => x.name === name);
  return b ? b.t : fallback;
}
export const F = (f) => f / 24; // bible frames (24 fps) to seconds
export const smooth01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// free every geometry and material under a group
export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.dispose?.(); });
    o.userData?.dispose?.();
  });
}
