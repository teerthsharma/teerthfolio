// THE PAINT-OVER PASS. bgPaintOver(root, look, o) gives every set piece under `root` the brush texture, the value gradient, the darker base and
// the pooled light of the look, WITHOUT changing a vertex position or a draw call: it writes uniforms and vertex colours only.
//   uber-material pieces (engine.prop / figure materials): grit (tools/grunge mottling and streaks), posterised brush noise, a dark foot (height fog),
//     a top-lit gradient over the vertex colours of tall pieces, and the look's first two pools of light as local glow lights.
//   baked window cards (a ShaderMaterial with tCard): replaced by the facade shader, so a flat grid of white rectangles becomes lit and dark
//     panes, sills, pipes and signs. The old material is left alone (its texture is the card's own).
// o: { gridCards (only cards with a uGrid window grid), grit 0.55, brush 0.5, foot 0.55, footH 6, gradient 0.35, pools true, cards true, facade: { ...city paint }, skip: (mesh) => bool, mode: "dark" | "haze" }
// Returns { meshes, cards, refresh() } ; refresh() re-reads the look's pools after you move them.
import { Color, Vector4 } from "three";
import { facadeMaterial } from "./city.js";

export function paintOverMaterialGLSL(look) { return facadeMaterial(look, {}, 0.5, { flatNormal: true }); }

const tint = new Color();

// a baked window card keeps its own grid and palette; the pane is painted over from its texels: the frame darkens, a lit pane gets a lamp
// gradient (hot at the ceiling, warm toward the sill) and a dim blind bar, a dark pane a cold diagonal sheen. No grid needs to be known.
const PANE = /* glsl */ `
  float pnL(vec2 uv) { vec4 t = texture2D(tCard, uv); return t.a < 0.5 ? 0.0 : dot(t.rgb, vec3(0.3, 0.59, 0.11)); }
  vec3 pnPaint(vec3 c, float a, vec2 uv) {
    vec2 px = 1.0 / vec2(textureSize(tCard, 0));
    float l0 = dot(c, vec3(0.3, 0.59, 0.11)), up = 0.0, dn = 0.0, lf = 0.0, rt = 0.0; float gU = 1.0, gD = 1.0, gL = 1.0, gR = 1.0;
    for (int k = 1; k <= 7; k++) {
      float d = float(k) * 1.5;
      gU *= step(0.5 * l0, pnL(uv + vec2(0.0, d * px.y))); up += gU;
      gD *= step(0.5 * l0, pnL(uv - vec2(0.0, d * px.y))); dn += gD;
      gL *= step(0.5 * l0, pnL(uv - vec2(d * px.x, 0.0))); lf += gL;
      gR *= step(0.5 * l0, pnL(uv + vec2(d * px.x, 0.0))); rt += gR;
    }
    float ty = (up + 0.5) / (up + dn + 1.0), tx = (lf + 0.5) / (lf + rt + 1.0);
    float edge = min(min(ty, 1.0 - ty) * 3.0, min(tx, 1.0 - tx) * 3.0);
    bool lit = l0 > 0.3;
    if (lit) {
      vec3 warm = c * vec3(1.06, 0.96, 0.8);
      c = mix(c * 0.55, warm, 0.6 + 0.4 * (1.0 - ty)) * (0.55 + 0.45 * smoothstep(0.0, 0.7, edge));
      float blind = smoothstep(0.62, 0.7, fract(tx * 2.0 + 0.5 * floor(uv.y * 40.0))) * step(0.5, fract(sin(floor(uv.y * 40.0) * 12.9) * 43758.5));
      c *= 1.0 - 0.28 * blind;
      c += warm * 0.22 * smoothstep(0.75, 1.0, 1.0 - ty);
    } else if (l0 < 0.14) {
      float sheen = smoothstep(0.25, 0.95, 0.5 + 0.5 * sin((uv.x * 7.0 + uv.y * 19.0) * 6.2832));
      c = c * 0.6 + vec3(0.07, 0.09, 0.16) * (0.45 + 0.55 * smoothstep(0.0, 1.0, 1.0 - ty)) + vec3(0.1, 0.12, 0.2) * sheen * 0.4;
      c *= 0.6 + 0.4 * smoothstep(0.0, 0.5, edge);
    }
    return c;
  }
`;
function paneCard(mat) {
  if (!mat.fragmentShader.includes("gl_FragColor = vec4(c.rgb * uTint, uId);")) return false;
  mat.fragmentShader = mat.fragmentShader.replace("void main()", `${PANE}
void main()`).replace("gl_FragColor = vec4(c.rgb * uTint, uId);", "gl_FragColor = vec4(pnPaint(c.rgb, c.a, vUv) * uTint, uId);");
  mat.needsUpdate = true;
  return true;
}

export function bgPaintOver(root, look, o = {}) {
  const O = { grit: 0.55, brush: 0.5, foot: 0.55, footH: 6, gradient: 0.35, pools: true, cards: true, mode: "dark", ...o };
  const shaded = new Set(), out = { meshes: [], cards: [], uber: [] };
  root.updateMatrixWorld(true);
  const dark = new Color(look.o.shade ?? "#6070a0").multiplyScalar(0.12);
  root.traverse((m) => {
    if (!m.isMesh || m.userData.bgPainted || O.skip?.(m)) return;
    const mat = m.material, u = mat?.uniforms;
    if (!u) return;
    if (u.uStone && u.uBrush && u.uFog) {
      if (u.uStone.value.x === 0 && O.grit > 0) u.uStone.value.set(3, 0.9, 0.5 * O.grit, 0.42 * O.grit);
      if (O.brush > 0 && u.uBrush.value.x === 0) u.uBrush.value.set(1, 0.9, 0, 0.5);
      if (u.uFog.value.x === 0 && O.foot > 0) {
        u.uFog.value.set(O.foot, 0, O.footH, 0.001);
        if (O.mode === "haze") u.uFogCol.value.fromArray(look.u.uHaze.value.toArray()); else u.uFogCol.value.copy(dark);
      }
      if (O.pools) out.uber.push(u);
      const g = m.geometry;
      if (O.gradient > 0 && g.attributes.aCol && !shaded.has(g)) {
        shaded.add(g);
        const P = g.attributes.position, N = g.attributes.normal, A = g.attributes.aCol, S = g.attributes.aShade;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < P.count; i++) { const y = P.getY(i); lo = Math.min(lo, y); hi = Math.max(hi, y); }
        if (hi - lo > 1.5) for (let i = 0; i < P.count; i++) {
          if (N && N.getY(i) > 0.7) continue;
          const k = (P.getY(i) - lo) / (hi - lo), d = O.gradient * (1 - k), l = O.gradient * 0.25 * k * k;
          A.setXYZ(i, A.getX(i) * (1 - d * 0.55) + l * 0.12, A.getY(i) * (1 - d * 0.5) + l * 0.1, A.getZ(i) * (1 - d * 0.4) + l * 0.08);
          if (S) S.setXYZ(i, S.getX(i) * (1 - d * 0.5), S.getY(i) * (1 - d * 0.5), S.getZ(i) * (1 - d * 0.4));
        }
        A.needsUpdate = true; if (S) S.needsUpdate = true;
      }
      m.userData.bgPainted = true; out.meshes.push(m);
    } else if (u.tCard && O.cards && !u.uGrid && O.panes !== false) {
      if (paneCard(mat)) { m.userData.bgPainted = true; out.cards.push(m); }
    } else if (u.tCard && O.cards && !O.gridCards) {
      const g = m.geometry; g.computeBoundingBox();
      const b = g.boundingBox, w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z), h = b.max.y - b.min.y;
      const grid = u.uGrid?.value, bay = grid ? (w / grid.x) / 3.0 : 1;
      const fm = facadeMaterial(look, { bay, ...(O.facade ?? {}) }, 0.5, { flatNormal: true });
      fm.uniforms.uFac2.value = new Vector4(1, w, h, (u.uSeed?.value ?? m.id) * 1.0);
      m.material = fm; m.userData.bgPainted = true; out.cards.push(m);
    }
  });
  const refresh = () => {
    const [p0, p1] = look.u.uPool.value, c0 = look.u.uPoolCol.value[0];
    for (const u of out.uber) {
      if (!u.uGlow0) continue;
      u.uGlow0.value.set(p0.x, p0.y, p0.z, p0.w); u.uGlow1.value.set(p1.x, p1.y, p1.z, p1.w);
      u.uGlowCol.value.copy(tint.copy(c0)).multiplyScalar(0.4);
    }
  };
  if (O.pools) refresh();
  out.refresh = refresh;
  return out;
}
