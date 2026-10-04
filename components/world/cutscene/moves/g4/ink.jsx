"use client";

// Flat-ink figures, hand-lettered words and swaying cloth for the group-4
// docks. Built on the kit, never editing it: tapered limbs merged into one
// geometry, the Aether witness's halftone body and rim hull (m-at2800), a
// word on a transparent card, and a vertex-sway flap for a coat or cape.

import { BackSide, CanvasTexture, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paletteFor } from "../../../../../lib/world/cutscene/look";
import { HALFTONE } from "../../Stage";

const UP = new Vector3(0, 1, 0);
const QA = new Quaternion();
const VA = new Vector3();
const VB = new Vector3();
const bare = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};

// A tapered limb a -> b (radius r1 at a, r2 at b); six sides reads as low poly.
export function limb(a, b, r1, r2, sides = 6, sx = 1, sz = 1) {
  VA.fromArray(a);
  VB.fromArray(b);
  const len = VA.distanceTo(VB);
  const g = new CylinderGeometry(r2, r1, len, sides, 1).scale(sx, 1, sz);
  g.applyQuaternion(QA.setFromUnitVectors(UP, VB.clone().sub(VA).normalize()));
  g.translate((VA.x + VB.x) / 2, (VA.y + VB.y) / 2, (VA.z + VB.z) / 2);
  return bare(g);
}
export const ball = (at, r, sx = 1, sy = 1, sz = 1) => bare(new IcosahedronGeometry(r, 1).scale(sx, sy, sz).translate(...at));
export const join = (parts) => mergeGeometries(parts);

// The body hull's twin: welded and smoothed, so the rim pushes out evenly.
export function hullOf(geo) {
  const h = mergeVertices(geo.clone(), 1e-3);
  h.computeVertexNormals();
  return h;
}

// Ink with the rim light as halftone dots on the facets that turn away from
// the lens, and a thin solid rim from the inverted hull. One pair, tinted per
// scene with tintInk(card, cell).
let INKS = null;
export function inkPair() {
  INKS ??= {
    body: new ShaderMaterial({
      uniforms: { uCell: { value: 6 }, uInk: { value: new Color() }, uRim: { value: new Color() } },
      vertexShader: /* glsl */ `
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk;
        uniform vec3 uRim;
        varying vec3 vView;
        ${HALFTONE}
        void main() {
          vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
          if (dot(n, vView) > 0.0) n = -n;
          float tone = max(n.y, 0.0) * 0.5 + max(n.x, 0.0) * 0.35;
          gl_FragColor = vec4(mix(uInk, mix(uInk, uRim, 0.24), uCell > 0.0 ? halftone(tone) : tone * 0.5), 1.0);
        }`,
    }),
    rim: new ShaderMaterial({
      uniforms: { uRim: { value: new Color() } },
      side: BackSide,
      vertexShader: /* glsl */ `
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.024, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uRim;
        void main() { gl_FragColor = vec4(uRim, 1.0); }`,
    }),
  };
  return INKS;
}
export function tintInk(card, cell) {
  const k = inkPair();
  const p = paletteFor(card);
  k.body.uniforms.uInk.value.set(p.ink);
  k.body.uniforms.uRim.value.set(p.rim);
  k.body.uniforms.uCell.value = cell;
  k.rim.uniforms.uRim.value.set(p.rim);
  return k;
}

// A hand-lettered word on a transparent card (a mesh; billboard it yourself,
// drive material.opacity). The font arrives after the first frame, so the
// lettering redraws once it has.
export function makeWord(text, color = "#fbfaf7", height = 0.4, px = 96) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = `800 ${px}px "Shantell Sans", "Comic Sans MS", cursive`;
  const mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, opacity: 0 }));
  const draw = () => {
    ctx.font = font;
    c.width = Math.ceil(ctx.measureText(text).width) + 28;
    c.height = px + 28;
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(20,12,40,0.92)";
    ctx.strokeText(text, 14, c.height / 2 + 4);
    ctx.fillStyle = color;
    ctx.fillText(text, 14, c.height / 2 + 4);
    mesh.scale.set((c.width / c.height) * height, height, 1);
    if (mesh.material.map) mesh.material.map.dispose();
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  };
  draw();
  if (document.fonts?.ready) document.fonts.ready.then(draw);
  mesh.renderOrder = 20;
  return mesh;
}

// A flap that hangs from y = 0 and sways from its top edge in the vertex
// shader: a lab coat, a cape. The owner sets uniforms.uT (s) and uWind (0..1).
export function swayMaterial(color = "#fbfaf7") {
  return new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uWind: { value: 1 }, uC: { value: new Color(color) } },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uT;
      uniform float uWind;
      varying float vH;
      void main() {
        vec3 q = position;
        float hang = clamp(-q.y, 0.0, 2.0);
        q.z -= uWind * hang * (0.35 + 0.25 * sin(uT * 7.0 + q.x * 6.0));
        q.x += uWind * hang * 0.08 * sin(uT * 5.0 + hang * 3.0);
        vH = hang;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC;
      varying float vH;
      void main() { gl_FragColor = vec4(uC * (1.0 - 0.18 * clamp(vH, 0.0, 1.0)), 1.0); }`,
  });
}
export const flap = (w, h) => new PlaneGeometry(w, h, 1, 6).translate(0, -h / 2, 0);
