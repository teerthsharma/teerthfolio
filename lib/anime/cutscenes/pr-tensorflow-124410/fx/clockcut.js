// FX CLOCKCUT: the hold's clock, which the 34 degree frame cannot see, as a square cut-in panel in the upper right. The dial and the hands are the jojo table's
// (tsClockPolar, dioClockHand) keyed to the palette's ink and cream; the minute hand turns with MINUTE(t) by rotating the hands' sample point.
// Until the pack resolves the post pass has already cached the step, so a paused still shows the 2D panel below (same geometry, same beats) instead.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, WebGLRenderTarget } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { fnClashes, loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { HIT, MINUTE, palAt } from "../clock.js";
import { PALETTES, R } from "../live/ink.js";
import { araki } from "../live/shared.js";
import { TONE, toned } from "../tone.js";

const NAMES = ["tsClockPolar", "dioClockHand"];
const SPANS = [[5, 7.2], [HIT.drown, 8.4]], FLASH = [HIT.tock, HIT.tick], FLASH_W = 3 / 12;
const TABLE_MINUTE = 0.1047; // dioClockHand fixes its minute hand at -0.1047 rad; the rotation is MINUTE(t) minus that
const SIZE = 0.26, HOUR = -Math.PI / 3;
const VERT = /* glsl */ `
  uniform vec2 uPanC, uPanH; varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(uPanC + position.xy * uPanH, 0.0, 1.0); }`;
const HEAD = /* glsl */ `
  ${TONE}
  uniform vec3 uPanPal[16]; uniform float uPanRot, uPanRing;
  varying vec2 vUv;
`;
const BODY = /* glsl */ `
  void main() {
    vec2 u = vUv - 0.5, c = vec2(0.72, 0.55);
    float cs = cos(uPanRot), sn = sin(uPanRot);
    vec2 pd = u * 1.34 + c, ph = mat2(cs, sn, -sn, cs) * (u * 2.278 / 1.8) + c;
    vec3 dial = tsClockPolar(pd, 0.0), hand = dioClockHand(ph, 0.0);
    float disk = step(length(u) * 2.278, 1.0);
    float lumD = dot(dial, vec3(0.299, 0.587, 0.114)), lumH = dot(hand, vec3(0.299, 0.587, 0.114));
    vec3 ink = uPanPal[5], cream = uPanPal[15], coral = uPanPal[3];
    vec3 col = cream * 0.9;
    col = mix(col, mix(ink, cream, smoothstep(0.3, 0.5, lumD)), disk);
    col = mix(col, ink, disk * (1.0 - smoothstep(0.1, 0.25, lumH)));
    col = mix(col, coral, uPanRing * step(0.455, length(u)) * step(length(u), 0.49));
    col = mix(col, ink, step(0.48, max(abs(u.x), abs(u.y))));
    gl_FragColor = vec4(siteTone(pow(max(col, vec3(0.0)), vec3(2.2))), 1.0);
  }`;

const hex = (v) => `#${[v.x, v.y, v.z].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
const COL = PALETTES.map((p) => [R.ink, R.cream, R.coral].map((s) => toned(hex(p[s]))));
const seg = (B, x0, y0, x1, y1, w, c) => B.ribbon([[x0, y0], [x1, y1]], [w, w * 0.3], c);
// the 2D panel: the same square, border, twelve ticks, two hands and the coral flash ring as the table shader
const dial = (B, ts, A) => {
  const [ink, cream, coral] = COL[palAt(ts)], S = SIZE, x0 = 0.98 * A - S, y0 = 0.02, cx = x0 + S / 2, cy = y0 + S / 2;
  B.rect(x0, y0, x0 + S, y0 + S, ink);
  B.rect(x0 + 0.02 * S, y0 + 0.02 * S, x0 + 0.98 * S, y0 + 0.98 * S, cream);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; seg(B, cx + Math.sin(a) * 0.36 * S, cy - Math.cos(a) * 0.36 * S, cx + Math.sin(a) * 0.44 * S, cy - Math.cos(a) * 0.44 * S, 0.012 * S, ink); }
  const m = MINUTE(ts), hl = 0.36 * S, hh = 0.2 * S;
  seg(B, cx, cy, cx + Math.sin(HOUR) * hh, cy - Math.cos(HOUR) * hh, 0.03 * S, ink);
  seg(B, cx, cy, cx + Math.sin(m) * hl, cy - Math.cos(m) * hl, 0.02 * S, ink);
  if (FLASH.some((f) => ts >= f - 1e-6 && ts < f + FLASH_W - 1e-6)) {
    const pts = [], ws = [];
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([cx + Math.cos(a) * 0.47 * S, cy + Math.sin(a) * 0.47 * S]); ws.push(0.015 * S); }
    B.ribbon(pts, ws, coral);
  }
};

export function makeClockCut(ctx) {
  const group = new Group(), U = araki(ctx).U;
  const material = new ShaderMaterial({
    uniforms: { uPanPal: U.uPal, uPanC: { value: new Vector2() }, uPanH: { value: new Vector2(SIZE, SIZE) }, uPanRot: { value: 0 }, uPanRing: { value: 0 } },
    vertexShader: VERT, fragmentShader: "", depthTest: false, depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false; mesh.renderOrder = 1290; mesh.visible = false;
  group.add(mesh);
  const fallback = makeCel(ctx.engine, { max: 1200, order: 1290, draw: (B, ts, A) => { if (ts >= 0) dial(B, ts, A); } });
  group.add(fallback.group);
  const linkAll = () => {
    try {
      const R = ctx.engine.renderer, cam = ctx.player.camera, mask = cam.layers.mask, prev = R.getRenderTarget(), rt = new WebGLRenderTarget(4, 4);
      mesh.visible = true; cam.layers.enableAll(); R.setRenderTarget(rt);
      R.compile(group, cam); R.setRenderTarget(prev); rt.dispose(); cam.layers.mask = mask;
      mesh.visible = false;
    } catch (err) { console.warn("[pr-tensorflow-124410] clock cut-in warm-up skipped", err); }
  };
  Promise.resolve(loadPack("jojo")).then(() => {
    const clash = fnClashes(NAMES);
    if (clash.length) { console.error("[pr-tensorflow-124410] clock shader pull clash", clash); return; }
    material.fragmentShader = HEAD + glslFor(NAMES) + BODY;
    material.needsUpdate = true;
    linkAll();
  }).catch((err) => console.error("[pr-tensorflow-124410] clock cut-in unavailable", err));
  return {
    group,
    update(t) {
      const on = ctx.atTier ? ctx.atTier(2) : true, tq = Math.floor(t * 12 + 1e-6) / 12;
      const span = on && SPANS.some(([a, b]) => tq >= a - 1e-6 && tq < b - 1e-6), ready = !!material.fragmentShader;
      mesh.visible = span && ready;
      fallback.update(span && !ready ? tq : -1);
      if (!mesh.visible) return;
      const res = ctx.engine?.shared?.uRes?.value, asp = res ? res.x / res.y : 16 / 9;
      material.uniforms.uPanH.value.set(SIZE / asp, SIZE);
      material.uniforms.uPanC.value.set(1 - 0.04 - SIZE / asp, 1 - 0.04 - SIZE);
      material.uniforms.uPanRot.value = MINUTE(tq) + TABLE_MINUTE;
      material.uniforms.uPanRing.value = FLASH.some((f) => t >= f - 1e-6 && t < f + FLASH_W - 1e-6) ? 1 : 0;
    },
    dispose() { mesh.geometry.dispose(); material.dispose(); fallback.dispose(); },
  };
}
