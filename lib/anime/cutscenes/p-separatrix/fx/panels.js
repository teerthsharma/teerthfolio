// IMPACT PANELS of p-separatrix: the drawn hits (turn, pierce, last blow) and the return poof, flat to the lens over the picture.
// Frame 0 is a negative, then the page's spikes; the gold glint and the gold leaf band are pulled from the shader table, the rest is cel polygons.
import { AdditiveBlending, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { makeCel } from "../../../kit/fx/cel.js";
import { BACK, DOCK, PT } from "../clock.js";
import { CORAL, GOLD, OCHRE, PLASTER, TONE, UMBER, toned } from "../tone.js";

await loadPack("jojo");
await loadPack("cuts");
const GLINT = glslFor(["gerGlint"]);
const LEAF = glslFor(["sxGoldLeafBand"]);

const VS = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const GLINT_FS = /* glsl */ `
  uniform vec2 uRes; uniform vec2 uCtr; uniform float uR; uniform float uA;
  ${TONE}
  ${GLINT}
  void main() {
    vec2 p = vec2(0.72, 0.5) + (gl_FragCoord.xy - uCtr) / uRes.y * (0.65 / uR);
    vec3 c = clamp(gerGlint(p, 0.0) - vec3(0.227, 0.102, 0.227), 0.0, 1.0) * uA;
    gl_FragColor = vec4(siteTone(c), 1.0);
  }`;
const LEAF_FS = /* glsl */ `
  uniform vec2 uRes;
  ${TONE}
  ${LEAF}
  void main() {
    vec3 c = clamp(sxGoldLeafBand(gl_FragCoord.xy / uRes.y, 0.0), 0.0, 1.0);
    gl_FragColor = vec4(siteTone(c), 1.0);
  }`;

const U = (names) => Object.fromEntries(Object.entries(uniformsFor(names)).map(([k, v]) => [k, v && typeof v === "object" && "value" in v ? v : { value: v }]));
const quad = (fs, uniforms, order, additive = false) => {
  const mat = new ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fs, transparent: true, depthTest: false, depthWrite: false,
    ...(additive ? { blending: AdditiveBlending } : { premultipliedAlpha: true }) });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  return { mesh, uniforms, dispose() { mat.dispose(); mesh.geometry.dispose(); } };
};

const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const STAY = 7 / 24;
const C = { umber: toned(UMBER), gold: toned(GOLD), ochre: toned(OCHRE), plaster: toned(PLASTER), coral: toned(CORAL) };

const spikes = (B, cx, cy, n, r0, seed, col, edge, k = 1) => {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * Math.PI * 2, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    for (const [c, g] of edge ? [[edge, 0.014], [col, 0]] : [[col, 0]]) B.tri(cx + dx * (r - g), cy + dy * (r - g), cx + dx * 2.6 - dy * (w / 2 + g), cy + dy * 2.6 + dx * (w / 2 + g), cx + dx * 2.6 + dy * (w / 2 + g), cy + dy * 2.6 - dx * (w / 2 + g), c);
  }
};
const stroke = (B, A, hx, hy, ang, len, wid) => {
  const n = 14, pts = [], we = [], wc = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, d = (u - 0.5) * len, w = Math.pow(Math.sin(Math.PI * u), 0.55) * wid * 0.25;
    pts.push([A / 2 + (hx + Math.cos(ang) * d) * 0.5, 0.5 - (hy + Math.sin(ang) * d) * 0.5]);
    we.push(w); wc.push(w * 0.46);
  }
  B.ribbon(pts, we, C.coral);
  B.ribbon(pts, wc, C.plaster);
};
const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

// the hits are scene.js beats { t, name: "panel", dur, at: "seal" | "slit" | "dv", kind, strokes: [[dx, dy, ang, len, wid]] }
export default function buildPanels(ctx) {
  const group = new Group(), V = new Vector3(), V0 = new Vector3();
  const uRes = ctx.engine?.shared?.uRes ?? { value: new Vector2(1280, 720) };
  const cam = () => ctx.player?.camera;
  const proj = (w, A) => { const c = cam(); if (!c) return null; V0.copy(w).project(c); return [(V0.x * 0.5 + 0.5) * A, 0.5 - V0.y * 0.5]; };
  const world = (p) => V.set(p[0] + DOCK[0], p[1] + DOCK[1], p[2] + DOCK[2]);
  const hits = (ctx.scene.beats ?? []).filter((b) => b.name === "panel");
  const at = (b, A) => proj(b.at === "seal" ? ctx.seal.chest(new Vector3()) : world(PT[b.at]), A);

  const cel = makeCel(ctx.engine, { max: 9000, order: 1260, draw(B, ts, A) {
    for (const b of hits) {
      const age = ts - b.t;
      if (age < -1e-6 || age >= b.dur + STAY - 1e-6) continue;
      const c = at(b, A) ?? [A / 2, 0.5], hx = (c[0] - A / 2) * 2, hy = (0.5 - c[1]) * 2;
      if (age >= b.dur - 1e-6) {
        const k = 1 - (age - b.dur) / STAY;
        for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k));
        continue;
      }
      const f = Math.floor(age * 24 + 1e-6), dark = f === 0, seed = Math.round(b.t * 10) + f * 7;
      if (dark || b.kind !== "last") B.rect(0, 0, A, 1, dark ? C.umber : C.plaster);
      spikes(B, c[0], c[1], 44, 0.24 + 0.05 * f, seed, dark ? C.gold : C.umber, dark ? C.ochre : null);
      for (const [dx, dy, ang, len, wid] of b.strokes ?? []) stroke(B, A, hx + dx, hy + dy, ang + (f - 1) * 0.02, len * (dark ? 0.8 : 1), wid * (dark ? 0.7 : 1));
    }
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.3 * bh * (1 + 0.14 * f);
    if (f < 2) { star(B, cx, cy, r, f * 0.4, C.umber); star(B, cx, cy, r * 0.9, f * 0.4 + 0.14, C.gold); return; }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)) * (1 + 0.18 * (f - 1)), x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q, w = 0.03 * (6 - f) / 4;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, [C.plaster, C.gold, C.ochre][i % 3]);
    }
  } });

  const glint = quad(GLINT_FS, { ...U(["gerGlint"]), uRes, uCtr: { value: new Vector2() }, uR: { value: 0.3 }, uA: { value: 1 } }, 1263, true);
  const leaf = quad(LEAF_FS, { ...U(["sxGoldLeafBand"]), uRes, uSxLeafK: { value: 0 }, uSxSealX: { value: 0.8 }, uSxSealY: { value: 0.35 }, uSxSealRX: { value: 0.12 }, uSxSealRY: { value: 0.18 } }, 1259);
  group.add(cel.group, glint.mesh, leaf.mesh);

  return {
    group,
    update(t, dt, cue) {
      cel.update(t, cue);
      const H = uRes.value.y, A = uRes.value.x / H;
      let showGlint = false, showLeaf = false;
      leaf.uniforms.uSxAspect.value = A;
      for (const b of hits) {
        const age = t - b.t, f = Math.floor(age * 24 + 1e-6);
        if (age < 0 || age >= b.dur || f < 1) continue;
        const c = at(b, A);
        if (!c) continue;
        showGlint = true;
        glint.uniforms.uCtr.value.set(c[0] * H, (1 - c[1]) * H);
        glint.uniforms.uR.value = 0.24 + 0.05 * f;
        if (b.kind !== "last") continue;
        showLeaf = true;
        leaf.uniforms.uSxLeafK.value = 5.5 * f;
        const s = proj(ctx.seal.chest(new Vector3()), A);
        if (s) { leaf.uniforms.uSxSealX.value = s[0]; leaf.uniforms.uSxSealY.value = 1 - s[1]; }
      }
      glint.mesh.visible = showGlint; leaf.mesh.visible = showLeaf;
    },
    dispose() { cel.dispose(); glint.dispose(); leaf.dispose(); },
  };
}
