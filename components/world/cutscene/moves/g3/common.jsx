"use client";

// Shared by the four g3 moves (Conan, Gandalf, Naruto, Aizen): a group that
// rides the pup through the scene, the ink look of the kit's speaker for the
// pieces a move adds to a figure, and a vertex-coloured box. Nothing here
// touches the kit; it only reads it.

import { sceneT } from "../../../../../lib/world/cutscene/clock";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, ShaderMaterial, Vector3 } from "three";
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
// A portrait screen sees a narrow slice of the stage: pull the set in about the pup.
export const narrowK = () => (typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8 ? 0.6 : 1);
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
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turned ? turnFor(card, place, s.x, s.z) : 0;
    g.scale.setScalar(Math.max(0.001, (1 - smooth(tl.collapse[0], tl.collapse[1], t)) * narrowK()));
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
  // octahedra are non-indexed and boxes indexed: merge them all non-indexed
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const g = mergeGeometries(flat);
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
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
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

// ---------------------------------------------------------------------------
// The pieces the g3 fix round shares (all read-only against the kit).

// A box rotated about z, with its own vertex colour (strokes of a glyph).
export function colorBar(w, h, d, at, hex, rotZ = 0) {
  const g = new BoxGeometry(w, h, d).rotateZ(rotZ).translate(at[0], at[1], at[2]);
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(col, i * 3);
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}

// Low-poly shading baked into vertex colours: each flat face takes its part's
// colour lit by a fixed light, so a landform reads as faceted paper with no
// light, no texture and one draw call. base: one hex, or one per part.
const LIGHT = new Vector3(-0.4, 0.8, 0.55).normalize();
export function shaded(parts, base, dark = 0.45) {
  const V = new Vector3();
  const out = parts.map((p, pi) => {
    const g = p.index ? p.toNonIndexed() : p;
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    g.computeVertexNormals();
    const n = g.attributes.normal;
    const pos = g.attributes.position;
    const c = new Color(typeof base === "string" ? base : base[pi] ?? base[0]);
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      V.set(n.getX(i), n.getY(i), n.getZ(i));
      const k = dark + (1 - dark) * Math.max(0, V.dot(LIGHT));
      for (let j = 0; j < 3; j++) {
        col[(i + j) * 3] = c.r * k;
        col[(i + j) * 3 + 1] = c.g * k;
        col[(i + j) * 3 + 2] = c.b * k;
      }
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
    g.deleteAttribute("normal");
    return g;
  });
  return merged(out);
}

// The pup's own rig, found by shape (seal/variants/D.jsx): `rear` holds the
// body, the far flipper, the near flipper's mirror, the tail and the neck.
let RIG = null;
export function pupRig(scene) {
  if (RIG && RIG.rear.parent) return RIG;
  const seal = scene.getObjectByName("seal");
  if (!seal) return null;
  let rear = null;
  seal.traverse((o) => {
    if (!rear && o.children.length === 5 && o.children[2]?.scale?.x === -1) rear = o;
  });
  if (!rear) return null;
  const [body, flipL, mir, tail, neck] = rear.children;
  const head = neck.children[0];
  RIG = { seal, rear, flipL, flipR: mir.children[0], tail, neck, head, eyes: head.children[1], coat: body.material };
  return RIG;
}

const TIP = new Vector3();
// A point in a flipper's own space (x runs out along it), in the move's space.
export function flipperAt(flip, root, local = [0.62, 0.06, 0]) {
  flip.updateWorldMatrix(true, false);
  TIP.set(local[0], local[1], local[2]);
  flip.localToWorld(TIP);
  return root.worldToLocal(TIP);
}

// After the pup's own frame (D.jsx runs at 0 and was mounted first): fn(t, rig)
// while this move's scene is up. Clears the pup's tint (a radiation mote's
// emissive flash, the district's glow) so a stage never colours it.
export function usePupPost({ mode, tl }, fn) {
  const scene = useThree((s) => s.scene);
  useFrame((state, dt) => {
    const a = live.arrival;
    if (!a.id || mode !== "full") return;
    const rig = pupRig(scene);
    if (!rig) return;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    if (t > tl.collapse[1] + 0.05) return;
    rig.coat.emissiveIntensity = 0;
    rig.head.children[6].visible = rig.head.children[7].visible = false; // no halo in a scene
    fn?.(t, rig, dt);
  }, 0);
}

// The pup turns to face `yaw` (default: full front to the lens) between t0 and
// t1, held to the collapse: after Seal.jsx's own yaw (-1), before anything draws.
export function usePupFront({ mode, tl }, t0, t1, yaw = 0) {
  const scene = useThree((s) => s.scene);
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || mode !== "full") return;
    const rig = pupRig(scene);
    if (!rig) return;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const k = smooth(t0, t1, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    if (k > 0) {
      const y = rig.seal.rotation.y;
      rig.seal.rotation.y = y + Math.atan2(Math.sin(yaw - y), Math.cos(yaw - y)) * k;
    }
  }, -0.5);
}

// A four-point star glint in the xy plane (additive white).
export function starGeo(r = 1, w = 0.18) {
  const g = new BufferGeometry();
  const v = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const p = (ang, rr) => [Math.cos(ang) * rr, Math.sin(ang) * rr, 0];
    v.push(...p(0, 0), ...p(a + Math.PI / 4, r * w), ...p(a, r), ...p(0, 0), ...p(a, r), ...p(a - Math.PI / 4, r * w));
  }
  g.setAttribute("position", new BufferAttribute(new Float32Array(v), 3));
  return g;
}

// Hand lettering as a texture: the kit's comic face, the cream outline and the
// slightly-off cyan and ink plates of the bubbles' own onomatopoeia.
const comicFamily = () => getComputedStyle(document.body).getPropertyValue("--font-comic").trim() || "'Comic Sans MS', sans-serif";
export function letterTex(text, fill, size = 120) {
  const c = document.createElement("canvas");
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const out = { tex, aspect: 2 };
  const draw = () => {
    const font = `800 ${size}px ${comicFamily()}`;
    const ctx = c.getContext("2d");
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width + size * 0.7);
    const h = Math.ceil(size * 1.5);
    c.width = w;
    c.height = h;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const x = w / 2;
    const y = h / 2;
    ctx.fillStyle = "#1c1b19";
    ctx.fillText(text, x + size * 0.05, y + size * 0.06);
    ctx.fillStyle = "#2ec5ff";
    ctx.fillText(text, x - size * 0.045, y + size * 0.03);
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = "#fbfaf7";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    out.aspect = w / h;
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 ${size}px ${comicFamily()}`, text).then(draw, () => {});
  return out;
}
export const letterMat = (lt) => new MeshBasicMaterial({ map: lt.tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
export const PLANE = new PlaneGeometry(1, 1);

// The credit card: the real work the scene honours, a small cream card lower
// left that slides up under the flex and is the last thing to go. DOM, so it
// is crisp, and a skip removes it with the arrival (live.arrival.id cleared).
export function useCredit({ mode, tl }, repo, head, note) {
  const el = useRef(null);
  useEffect(() => {
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed",
      left: "max(16px, 2.2vw)",
      bottom: "1.2vh",
      zIndex: "30",
      display: "none",
      gap: "2px",
      padding: "8px 14px 9px",
      background: CREAM,
      color: "#1c1b19",
      border: "1.5px solid #1c1b19",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(12,8,30,.3)",
      pointerEvents: "none",
      maxWidth: "min(66vw, 22em)",
    });
    const line = (txt, css) => {
      const s = document.createElement("div");
      s.textContent = txt;
      Object.assign(s.style, css);
      d.appendChild(s);
    };
    line(repo, { font: "600 12px var(--mono)", opacity: ".72", letterSpacing: ".01em" });
    line(head, { font: "700 16px var(--font)", lineHeight: "1.2" });
    if (note) line(note, { font: "500 12px var(--font)", opacity: ".72", lineHeight: "1.3" });
    d.setAttribute("aria-hidden", "true");
    document.body.appendChild(d);
    el.current = d;
    return () => {
      d.remove();
      el.current = null;
    };
  }, [repo, head, note]);
  useFrame((state) => {
    const d = el.current;
    if (!d) return;
    const a = live.arrival;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const on = Boolean(a.id) && (mode === "still" || (t >= tl.lineB && t < tl.collapse[1] + 0.3));
    d.style.display = on ? "grid" : "none";
    if (on) {
      const f = mode === "still" ? 3 : Math.floor((t - tl.lineB) * 12);
      const k = [0.2, 0.6, 0.9, 1][Math.min(3, Math.max(0, f))]; // on twos: a slide up in three drawings
      d.style.transform = `translateY(${((1 - k) * 28).toFixed(0)}px)`;
      d.style.opacity = t > tl.collapse[1] ? String(Math.max(0, 1 - (t - tl.collapse[1]) / 0.3)) : "1";
    }
  });
}

// Any geometry with one vertex colour (so it merges with colorBox pieces).
export function tint(g, hex) {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(col, i * 3);
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}

// A tapered six-sided limb from a to b (arrays), for ink pieces.
const UPV = new Vector3(0, 1, 0);
export function limb(a, b, r1, r2) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), 6, 1);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UPV, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
