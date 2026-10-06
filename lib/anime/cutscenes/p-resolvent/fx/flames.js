// THE WEIGHING FX (bible 3.11-3.13, shots 3 and 6): soul-flame on the pup's pan, scribble-hatch mass on Aura's pan,
// the dark-rose cast shape behind it, the silver Auserlese glow (frames 120-154), the pops at the break (frame 204).
// All are flat, hard-edged, redrawn on twos (uSeed changes only on the stepped clock t).
//
// soul-flame maths (p = (x in width units, y in 0..1 height)):
//   hook   = 0.30 y^3 (1 + .3 sin(.))                    the hooked top
//   prof(y,k) = k * 0.5 sin(pi y^0.62)^0.9 (1 - .5 y)     half-width of a tongue
//   wob    = 1 + .16 sin(15y + 3.7 s) + .10 sin(29y - 5.3 s)   jagged edge, s = the stepped seed (twos, no morph)
//   f      = max over 3 tongues of (width_i - |x_i|)      f > 0 inside; coverage = smoothstep(-aa, aa, f), aa = fwidth(f)
//   core   = |x| < .5 w1 and y < .72;  blotches = 3 discs (#fff6c0 #f4b8c8 white); 2 dark flick lines.
// scribble mass: ragged hunched flame mask, hatch = thin lines of fract(16 r + 2 theta / 2pi) about the heart (concentric spiral).
import { PAL, T, GLSL_CLEAR, GLSL_NOISE, shader, flatMat, bar, sstep, lerp, scaleTilt, pans, PAN, BEAM } from "./common.js";

const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const SOUL = /* glsl */ `
uniform vec3 cOuter, cCore, cYel, cPink, cFlick; uniform float uSeed, uAlpha; varying vec2 vUv; varying vec3 vW;
${GLSL_CLEAR}
float prof(float y, float k){ return k * 0.5 * pow(max(sin(3.14159 * pow(clamp(y, 0., 1.), 0.62)), 0.), 0.9) * (1.0 - 0.5 * y); }
float disc(vec2 p, vec2 c, float r){ return r - length(p - c); }
void main(){
  vec2 p = vec2(vUv.x - 0.5, vUv.y); float s = uSeed;
  float hook = 0.30 * pow(p.y, 3.0) * (1.0 + 0.3 * sin(s * 2.1));
  float wob = 1.0 + 0.16 * sin(p.y * 15.0 + s * 3.7) + 0.10 * sin(p.y * 29.0 - s * 5.3);
  float x1 = p.x - hook, w1 = prof(p.y, 1.0) * wob;
  float f1 = w1 - abs(x1);
  float y2 = (p.y - 0.05) / 0.7, x2 = p.x + 0.26 + 0.05 * sin(s * 1.9);
  float f2 = y2 > 0. ? prof(y2, 0.45) * (1.0 + 0.2 * sin(y2 * 20. + s * 2.)) - abs(x2) : -1.;
  float y3 = p.y / 0.5, x3 = p.x - 0.25 - 0.04 * sin(s * 2.7);
  float f3 = y3 > 0. ? prof(y3, 0.4) * (1.0 + 0.2 * sin(y3 * 17. - s * 2.)) - abs(x3) : -1.;
  float f = max(f1, max(f2, f3));
  if (p.y > 1.0 || p.y < 0.0) f = -1.;
  float aa = max(fwidth(f), 1e-4);
  float cov = smoothstep(-aa, aa, f);
  if (cov < 0.01) discard;
  vec3 col = cOuter;
  float fc = min(0.5 * w1 - abs(x1), (0.72 - p.y) * 0.3);
  col = mix(col, cCore, smoothstep(-aa, aa, fc));
  float b1 = disc(p, vec2(-0.06 + 0.04 * sin(s), 0.26), 0.085), b2 = disc(p, vec2(0.07, 0.48 + 0.02 * sin(s * 1.3)), 0.065), b3 = disc(p, vec2(-0.02, 0.37), 0.05);
  col = mix(col, cYel, 0.85 * smoothstep(-aa, aa, b1) * step(0., f));
  col = mix(col, cPink, 0.8 * smoothstep(-aa, aa, b2) * step(0., f));
  col = mix(col, vec3(1.0), 0.9 * smoothstep(-aa, aa, b3) * step(0., f));
  float l1 = step(abs((p.x - hook - 0.03) - 0.35 * (p.y - 0.8)), 0.006) * step(0.78, p.y) * step(p.y, 0.9);
  float l2 = step(abs((p.x - hook + 0.04) + 0.3 * (p.y - 0.66)), 0.006) * step(0.62, p.y) * step(p.y, 0.72);
  col = mix(col, cFlick, max(l1, l2) * step(0., f1));
  gl_FragColor = vec4(col, cov * uAlpha * sealClear(vW));
}`;

const HALO = /* glsl */ `
uniform vec3 uCol; uniform float uA; varying vec2 vUv; varying vec3 vW; ${GLSL_CLEAR}
void main(){ vec2 d = (vUv - 0.5) * 2.0; float r = length(d); float g = exp(-r * r * 3.2) * step(r, 1.0);
  gl_FragColor = vec4(uCol, uA * g * sealClear(vW)); }`;

const MASS = /* glsl */ `
uniform vec3 cMass, cHatch; uniform float uSeed, uAlpha, uShadow; varying vec2 vUv; varying vec3 vW;
${GLSL_CLEAR}
${GLSL_NOISE}
void main(){
  vec2 q = vUv; float s = uSeed;
  if (uShadow > 0.5) { q = (vUv - vec2(0.5, 0.0)) / 1.12 + vec2(0.5 - 0.06, 0.05); }   // the hard dark-rose copy, offset and fatter
  float y = q.y;
  float wid = 0.44 * pow(max(sin(3.14159 * pow(clamp(y, 0., 1.), 0.55)), 0.), 0.7) * (1.0 - 0.25 * y);
  float shift = 0.10 * sin(y * 3.14159) * (1.0 + 0.3 * sin(s * 0.9));          // hunched
  float rag = (vn(vec2(y * 9.0, s)) - 0.5) * 0.20 + (vn(vec2(y * 21.0 + 3.0, s * 1.7)) - 0.5) * 0.08;
  float f = wid + rag * step(0.06, y) - abs(q.x - 0.5 - shift);
  if (q.y > 1.0 || q.y < 0.0) f = -1.;
  float aa = max(fwidth(f), 1e-4);
  float cov = smoothstep(-aa, aa, f);
  if (cov < 0.01) discard;
  vec3 col = cMass;
  vec2 c = vec2(0.5 + shift * 0.4, 0.42); vec2 qq = q - c;
  float r = length(qq), th = atan(qq.y, qq.x);
  float sp = r * 16.0 + th / 6.2832 * 2.0 + s * 0.04;
  float d = abs(fract(sp) - 0.5);
  float line = smoothstep(0.40, 0.44, d);
  col = mix(col, cHatch, line * 0.95);
  float a = cov * uAlpha;
  if (uShadow > 0.5) { col = vec3(0.294, 0.176, 0.353); a *= sealClear(vW); }
  gl_FragColor = vec4(col, a);
}`;

export default function flames(ctx, S, A) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "weigh-fx";
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
  const cam = ctx.player?.camera;
  const C = (h) => new THREE.Color(h);

  const soulMat = shader(THREE, { vert: VERT, frag: SOUL, uniforms: { cOuter: { value: C(PAL.soulEdge) }, cCore: { value: C(PAL.soulCore) }, cYel: { value: C(PAL.soulYellow) }, cPink: { value: C(PAL.soulPink) }, cFlick: { value: C(PAL.soulFlick) }, uSeed: { value: 0 }, uAlpha: { value: 1 }, uSeal: S.uSeal, uSealR: S.uSealR } });
  const soul = new THREE.Mesh(quad, soulMat);
  const haloMat = shader(THREE, { vert: VERT, frag: HALO, add: true, uniforms: { uCol: { value: C(PAL.soulHalo) }, uA: { value: 0.25 }, uSeal: S.uSeal, uSealR: S.uSealR } });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
  const massU = (shadow) => ({ cMass: { value: C(PAL.mass) }, cHatch: { value: C(PAL.hatch) }, uSeed: { value: 0 }, uAlpha: { value: 1 }, uShadow: { value: shadow }, uSeal: S.uSeal, uSealR: S.uSealR });
  const mass = new THREE.Mesh(quad, shader(THREE, { vert: VERT, frag: MASS, uniforms: massU(0), depthWrite: true }));
  const rose = new THREE.Mesh(quad, shader(THREE, { vert: VERT, frag: MASS, uniforms: massU(1) }));
  mass.renderOrder = 6; rose.renderOrder = 5; soul.renderOrder = 7; halo.renderOrder = 6;
  group.add(rose, mass, soul, halo);

  // silver Auserlese state: a 1.5 px white line (r .007) over a 6 px glow (r .04) on beam + 6 chains, and a pan halo each
  const barG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const bars = [];
  for (let i = 0; i < 7; i++) {
    const core = new THREE.Mesh(barG, flatMat(THREE, S, { color: PAL.silver, alpha: 0.95, add: true }));
    const glow = new THREE.Mesh(barG, flatMat(THREE, S, { color: PAL.silverGlow, alpha: 0.6, add: true }));
    group.add(core, glow); bars.push([core, glow]);
  }
  const panGlow = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shader(THREE, { vert: VERT, frag: HALO, add: true, uniforms: { uCol: { value: C(PAL.silverGlow) }, uA: { value: 0.6 }, uSeal: S.uSeal, uSealR: S.uSealR } })); group.add(m); return m; });

  const P = { aura: [0, 0, 0], pup: [0, 0, 0] };
  // soul-flame height (m): 0.5 pan while weak (flickers on at frame 120), swells 7.0-7.7 to 1.3 pan-widths, flares at the break, dies
  function soulH(t, brk) {
    if (t < T.weigh[0]) return 0;
    let h = 0.5 * PAN * 1.3;
    h = lerp(h, 1.3 * PAN, sstep(T.swell[0], T.swell[1], t));
    const a = t - brk;
    if (a > 0) h *= (1 + 0.3 * sstep(0, 0.1, a)) * (1 - sstep(0.25, 0.55, a));
    return h;
  }
  function update(t, dt, cue) {
    const brk = Number.isFinite(cue.since("break")) ? cue.t - cue.since("break") : T.brk;
    const seed = Math.floor(t * 12); // twos: the shape changes only on the 12 fps step
    const a = scaleTilt(t);
    pans(A.scale, a, P);
    const visible = t < brk + 0.6;

    const h = soulH(t, brk);
    const sv = visible && h > 0.001;
    soul.visible = halo.visible = sv;
    if (sv) {
      soul.position.set(P.pup[0], P.pup[1] + 0.04, P.pup[2]); soul.scale.set(h * 0.75, h, 1);
      halo.position.set(P.pup[0], P.pup[1] + h * 0.45, P.pup[2]); halo.scale.set(h * 1.5, h * 1.5, 1);
      soulMat.uniforms.uSeed.value = seed;
      // flickers on at 120 (stepped on/off), then the steady faint glow (egg 3) until the release
      const on = t < T.weigh[0] + 0.17 ? ((Math.floor(t * 12) & 1) ? 1 : 0.35) : 1;
      soulMat.uniforms.uAlpha.value = on;
      haloMat.uniforms.uA.value = (0.18 + 0.12 * sstep(T.swell[0], T.swell[1], t)) * on;
      if (cam) { soul.quaternion.copy(cam.quaternion); halo.quaternion.copy(cam.quaternion); }
    }
    // Aura's mass: same height as the soul at rest, pops out in 2 frames at the break
    const mh = 0.5 * PAN * 1.3 * 1.35;
    const pop = t - brk;
    const mv = t > 2.9 && pop < 2 / 24;
    mass.visible = mv; rose.visible = mv && pop <= 0;
    if (mv) {
      const k = pop > 0 ? 1.3 : 1;
      mass.position.set(P.aura[0], P.aura[1] + 0.04, P.aura[2]); mass.scale.set(mh * 0.85 * k, mh * k, 1);
      rose.position.copy(mass.position); rose.scale.copy(mass.scale);
      mass.material.uniforms.uSeed.value = seed; rose.material.uniforms.uSeed.value = seed;
      if (cam) { mass.quaternion.copy(cam.quaternion); rose.quaternion.copy(cam.quaternion); }
    }
    // silver glow 5.0-6.4 (4 frame fade each side)
    const g = sstep(T.weigh[0], T.weigh[0] + 4 / 24, t) * (1 - sstep(T.weigh[1] - 4 / 24, T.weigh[1], t));
    const on = g > 0.002 && t < brk;
    for (const [c, gl] of bars) c.visible = gl.visible = on;
    panGlow[0].visible = panGlow[1].visible = on;
    if (on) {
      const S0 = A.scale, endA = [S0[0], S0[1] - Math.sin(a) * BEAM, S0[2] + Math.cos(a) * BEAM], endP = [S0[0], S0[1] + Math.sin(a) * BEAM, S0[2] - Math.cos(a) * BEAM];
      const seg = [[endA, endP]];
      for (const [e, p] of [[endA, P.aura], [endP, P.pup]]) seg.push([e, p], [e, [p[0] + 0.45 * PAN, p[1], p[2]]], [e, [p[0] - 0.45 * PAN, p[1], p[2]]]);
      seg.forEach(([x, y], i) => { bar(bars[i][0], x, y, 0.007, THREE); bar(bars[i][1], x, y, 0.04, THREE); bars[i][0].material.uniforms.uA.value = 0.95 * g; bars[i][1].material.uniforms.uA.value = 0.6 * g; });
      [P.aura, P.pup].forEach((p, i) => { panGlow[i].position.set(p[0], p[1] + 0.05, p[2]); panGlow[i].scale.set(PAN * 1.7, PAN * 1.7, 1); panGlow[i].material.uniforms.uA.value = 0.6 * g; if (cam) panGlow[i].quaternion.copy(cam.quaternion); });
    }
  }
  return { group, update, dispose() { quad.dispose(); barG.dispose(); [soulMat, haloMat, mass.material, rose.material, ...panGlow.map((m) => m.material), ...bars.flat().map((b) => b.material)].forEach((m) => m.dispose()); } };
}
