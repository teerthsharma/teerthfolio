"use client";

// Shared by the four g3 moves (Conan, Gandalf, Naruto, Aizen): a group that
// rides the pup through the scene, the ink look of the kit's speaker for the
// pieces a move adds to a figure, and a vertex-coloured box. Nothing here
// touches the kit; it only reads it.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BackSide, BoxGeometry, BufferAttribute, Color, DoubleSide, MeshBasicMaterial, SRGBColorSpace, ShaderMaterial } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paletteFor } from "../../../../../lib/world/cutscene/look";
import { figureAt, figureScale, smooth, turnFor } from "../../../../../lib/world/cutscene/timeline";
import { live } from "../../../../../lib/world/store";
import { HALFTONE } from "../../Stage";

export const CREAM = "#fbfaf7";
export const srgb = (c, a) => c.setRGB(a[0], a[1], a[2], SRGBColorSpace);

// A group at the pup, turned like the camera rig (a land speaker turns the
// whole shot), shown only while the stage is up and shrunk on the collapse.
// fn(t, state, dt) runs each frame the group is up.
export function useStageGroup(ref, { card, place, tl, mode }, fn) {
  const turned = card.speaker === "land";
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const a = live.arrival;
    const on = Boolean(a.id) && mode === "full" && live.inStage;
    g.visible = on;
    if (!on) return;
    const s = live.seal;
    const t = state.clock.elapsedTime - a.start;
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turned ? turnFor(card, place, s.x, s.z) : 0;
    g.scale.setScalar(Math.max(0.001, 1 - smooth(tl.collapse[0], tl.collapse[1], t)));
    fn(t, state, dt);
  }, -1.2);
}

// A box with its own vertex colour (merge several for one coloured card).
export function colorBox(w, h, d, at, hex) {
  const g = new BoxGeometry(w, h, d).translate(at[0], at[1], at[2]);
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(col, i * 3);
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}
export const merged = (parts) => {
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
};
export const flatMat = (extra) => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false, fog: false, ...extra });

// ---- the ink of the kit's figure, for pieces added to it ----
function inkMaterial() {
  return new ShaderMaterial({
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
        vec3 col = mix(uInk, mix(uInk, uRim, 0.22), uCell > 0.0 ? halftone(tone) : tone * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
function outlineMaterial() {
  return new ShaderMaterial({
    uniforms: { uRim: { value: new Color() } },
    side: BackSide,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.022, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      void main() { gl_FragColor = vec4(uRim, 1.0); }`,
  });
}
let INK = null;
export const inkMats = () => (INK ??= { ink: inkMaterial(), outline: outlineMaterial() });

// parts (indexed or not, any attributes) -> { ink, outline } geometries
export function inkGeo(parts) {
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    n.deleteAttribute("normal");
    return n;
  });
  const ink = mergeGeometries(clean);
  const outline = mergeVertices(ink.clone(), 1e-3);
  outline.computeVertexNormals();
  return { ink, outline };
}

// The entrance and exit of the kit's figure, on twos (Speaker.jsx).
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];

// A group that stands where the card's figure stands (children are in the
// figure's own space: feet at the origin, facing +z) and comes and goes with it.
export function FigureAttach({ card, tl, mode, children }) {
  const root = useRef();
  useEffect(() => {
    const p = paletteFor(card);
    const m = inkMats();
    m.ink.uniforms.uInk.value.set(p.ink);
    m.ink.uniforms.uRim.value.set(p.rim);
    m.outline.uniforms.uRim.value.set(p.rim);
  }, [card]);
  useFrame((state) => {
    const f = root.current;
    const a = live.arrival;
    if (!f) return;
    if (!a.id) {
      f.visible = false;
      return;
    }
    const t = state.clock.elapsedTime - a.start;
    const s = live.seal;
    const at = figureAt(card);
    const k = figureScale(card);
    inkMats().ink.uniforms.uCell.value = (card.stage?.halftone ?? 6) * 0.6 * state.gl.getPixelRatio();
    const inF = Math.floor((t - tl.enter) * 12);
    const outF = Math.floor((t - tl.collapse[0]) * 12);
    const frame = mode === "still" ? 9 : outF >= 0 ? 2 - outF : inF;
    f.visible = frame >= 0;
    if (f.visible) {
      const [sx, sy] = ENTER[frame] ?? [1, 1];
      f.position.set(s.x + at[0], at[1], s.z + at[2]);
      f.scale.set(k * sx, k * sy, k * sx);
      f.rotation.set(0, -0.42, 0);
    }
  });
  return <group ref={root} visible={false}>{children}</group>;
}
