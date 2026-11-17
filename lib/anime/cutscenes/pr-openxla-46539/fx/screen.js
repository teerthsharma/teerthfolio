// THE PAGE'S SCREEN DRAWINGS, flat to the lens: the impact panel and its crack, the glass web at the punch, the focus lines round the dash,
// the three words with their mis-registered copies, and the tinted flash. Each is the live's own shader on the live clock (live/fx.js, live/smash.js).
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3, Vector4 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { panelFx } from "../live/fx.js";
import { crackFx, focusFx } from "../live/smash.js";
import { lettering } from "../live/support.js";
import { BRK, DOCK, FOV, LAW, phase, smooth } from "../clock.js";
import { TONE, toned } from "../tone.js";

const VEIL = toned("#FFF4E4"), COPY_M = toned("#ED2A8A"), COPY_C = toned("#009EE0");
const NDC = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.12, 0.0, 1.0); }`;
const WORD_VERT = "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }";
const WORD_MAIN = `${TONE} uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }`;
const WORD_COPY = `uniform sampler2D tMap; uniform vec3 uCol; uniform float uK; varying vec2 vUv; void main() { float a = texture2D(tMap, vUv).a * uK; gl_FragColor = vec4(uCol * a, a); }`;

// one word: the live's canvas lettering (support.js) drawn through the site's tone map, with two mis-registered copies behind it
function word(text, color, tilt) {
  const L = lettering(text, color, tilt), tex = L.material.map;
  L.geometry.dispose();
  L.material.dispose();
  const make = (fragmentShader, uniforms, order) => {
    const m = new ShaderMaterial({ uniforms: { tMap: { value: tex }, uAt: { value: new Vector4(0, 0, 0.5, 0.2) }, ...uniforms }, vertexShader: WORD_VERT, fragmentShader, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true });
    const mesh = new Mesh(new PlaneGeometry(2, 2), m);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    mesh.visible = false;
    return { mesh, m };
  };
  const main = make(WORD_MAIN, {}, 1300);
  const mm = make(WORD_COPY, { uCol: { value: COPY_M }, uK: { value: 0.7 } }, 1299);
  const mc = make(WORD_COPY, { uCol: { value: COPY_C }, uK: { value: 0.7 } }, 1299);
  return {
    meshes: [main.mesh, mm.mesh, mc.mesh],
    show(on, nx, ny, frac, A, dx = 0) {
      const hh = 0.3125 * frac * A;
      main.mesh.visible = on;
      main.m.uniforms.uAt.value.set(nx + dx, ny, frac, hh);
      mm.mesh.visible = mc.mesh.visible = on;
      mm.m.uniforms.uAt.value.set(nx + dx + 0.006, ny - 0.004, frac, hh);
      mc.m.uniforms.uAt.value.set(nx + dx - 0.006, ny + 0.004, frac, hh);
    },
    dispose() { for (const m of [main.m, mm.m, mc.m]) m.dispose(); tex.dispose(); },
  };
}

export function buildScreen(ctx) {
  const group = new Group(), V = new Vector3(), crackAt = [0, 0];
  const cam = () => ctx.player?.camera;
  const pn = panelFx(), panel = { mesh: new Mesh(pn.g, pn.m), m: pn.m }, crack = crackFx(), focus = focusFx();
  for (const o of [panel, crack, focus]) {
    o.m.vertexShader = NDC;
    o.m.needsUpdate = true;
    o.mesh.frustumCulled = false;
    o.mesh.renderOrder = o === panel ? 1230 : o === crack ? 1225 : 1210;
    o.mesh.visible = false;
  }
  const set = (m, obj) => { for (const k in obj) m.uniforms[k].value = obj[k]; };
  const smashHit = word("SMASH!", "#ffc800", -0.1), smashPunch = word("SMASH!", "#ffc800", -0.1), rip = word("RIIIP!", "#1f5fe0", 0.06);
  const veil = makeCel(ctx.engine, { max: 4, order: 1250, draw(B, ts, A) {
    const p = phase(ts, ts), a = Math.max(0, 1 - Math.abs(p.age2 - 0.04) / 0.09) * 0.2 + Math.max(0, 1 - Math.abs(p.brk) / 0.1) * 0.14;
    if (a > 0.003) B.rect(0, 0, A, 1, VEIL, Math.min(1, a));
  } });
  group.add(panel.mesh, crack.mesh, focus.mesh, veil.group, ...smashHit.meshes, ...smashPunch.meshes, ...rip.meshes);
  group.userData.plateDepth = false;

  return {
    group,
    update(t, cue) {
      const tr = cue?.t ?? t, ph = phase(t, tr), c = cam();
      if (!c) return;
      const A = c.aspect, wide = A >= 1, odd = Math.floor(tr * 12) % 2 ? 1 : -1, jit = 0.05 / (8 * Math.tan((FOV * Math.PI) / 360) * A);
      panel.mesh.visible = ph.pk > 0.01 && ph.brk < 1.1;
      if (panel.mesh.visible) set(panel.m, { uK: ph.pk, uAsp: A, uCrack: smooth(BRK - 0.7, BRK - 0.02, ph.tt), uFall: ph.broken ? Math.min(1, ph.brk / 0.95) : 0 });
      const h = ctx.seal?.named?.()?.handR;
      if (ph.age2 <= 0.05 && h) { V.copy(h).project(c); crackAt[0] = V.x * A; crackAt[1] = V.y; }
      crack.mesh.visible = ph.age2 > 0.05 && ph.brk < 0.05;
      if (crack.mesh.visible) set(crack.m, { uK: smooth(0.05, 0.4, ph.age2) * (1 - smooth(0, 0.05, ph.brk)), uAsp: A, uCen: crackAt, uT: smooth(0.6, 2.2, ph.age2) });
      focus.mesh.visible = ph.focus > 0.01 && !ph.broken && ph.tt < LAW.collapse[0];
      if (focus.mesh.visible) {
        V.set(DOCK[0] + ph.dashX, 1.0, DOCK[2] + ph.dashZ).project(c);
        set(focus.m, { uK: ph.focus, uAsp: A, uCen: [V.x * A, V.y], uT: ph.tt });
      }
      const a1 = ph.age, a2 = ph.age2, bk = ph.brk;
      const pop1 = Math.min(1, (a1 - 0.17) / 0.08) * (1 + 0.25 * Math.max(0, 1 - (a1 - 0.17) / 0.2));
      smashHit.show(a1 > 0.17 && a1 < 0.9, wide ? 0.5 : 0.3, wide ? 0.5 : 0.62, (wide ? 0.34 : 0.7) * pop1, A);
      const pop2 = Math.min(1, (a2 - 0.1) / 0.08) * (1 + 0.25 * Math.max(0, 1 - (a2 - 0.1) / 0.2));
      smashPunch.show(a2 > 0.1 && a2 < 1.5, wide ? -0.52 : -0.3, wide ? 0.5 : 0.62, (wide ? 0.46 : 0.9) * pop2, A, jit * odd);
      const popR = Math.min(1, (bk + 0.02) / 0.09) * (1 + 0.25 * Math.max(0, 1 - bk / 0.25));
      rip.show(bk > -0.02 && bk < 1.15, 0, wide ? 0.3 : 0.25, (wide ? 0.36 : 0.7) * popR, A, jit * odd);
    },
    dispose() {
      veil.dispose();
      for (const o of [panel, crack, focus]) o.m.dispose();
      for (const w of [smashHit, smashPunch, rip]) w.dispose();
    },
  };
}
