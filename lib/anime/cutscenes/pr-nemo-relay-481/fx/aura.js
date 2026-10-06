// Silver Ultra Instinct aura (bible 3 + 6): aura-flame (layered tongues, 3 tone steps, cyan outline), sparks, arcs, ignition ring.
// All timing is a pure function of stepped t. Flames re-randomise every 2 frames at 24 fps = 12 Hz.
import { makeCard, hash, clamp01, sstep, wk, disposeAll } from "./util.js";

// Flame card shader. Card space: x in [-1,1], y in [0,1] up from the feet. N = 7 tongues (bible).
// Per tongue i: centre xi = (i/6 - 0.5)*1.5, height hi = (0.55 + 0.45 rand)*(0.25 + 0.85 uA), half-width wi = 0.16 + 0.1 rand.
// Tongue field: d_i = 1 - |x - xi - wobble*y| / (wi * (1 - y/hi)), zero above hi; coverage f = max_i d_i * (0.35 + 0.65 taper).
// Wobble = (fbm(x*3, y*4 + seed) - 0.5) * 0.35: noise-posterised flame edge.
// Tone steps on f: f>0.62 core #f6f9ff, f>0.30 flame #c9d4e8, f>0.10 outline #a8d8ff, f>0 outer #6a8ac8.
// Body hole: ellipse centred (0, 0.36) radius (0.26, 0.40); alpha *= smoothstep(1.0, 1.25, e) keeps the pup unobscured.
// Luma cap: colour <= 0.92 per channel (the seal must never go milky). Sign pre-form: uGrey mixes toward grey.
const FLAME = /* glsl */ `
varying vec2 vUv; uniform float uA; uniform float uSeed; uniform float uGrey; uniform float uFade;
void main(){
  vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y);
  float sd = uSeed;
  float f = 0.0;
  for (int i = 0; i < 7; i++){
    float fi = float(i);
    float r1 = h21(vec2(fi, sd)), r2 = h21(vec2(fi + 9.0, sd));
    float xi = (fi / 6.0 - 0.5) * 1.5;
    float hi = (0.55 + 0.45 * r1) * (0.25 + 0.85 * uA);
    float wi = 0.16 + 0.10 * r2;
    float wob = (fbm(vec2(p.x * 3.0 + fi, p.y * 4.0 + sd * 1.7)) - 0.5) * 0.35;
    float taper = max(0.0, 1.0 - p.y / hi);
    float d = 1.0 - abs(p.x - xi - wob * p.y) / max(1e-3, wi * taper + 1e-3);
    d *= step(p.y, hi);
    f = max(f, d * (0.35 + 0.65 * taper));
  }
  vec3 core = vec3(0.965, 0.976, 1.0), mid = vec3(0.788, 0.831, 0.910), edge = vec3(0.659, 0.847, 1.0), outer = vec3(0.416, 0.541, 0.784);
  vec3 col = outer; float a = 0.0;
  if (f > 0.0)  { col = outer; a = 0.55; }
  if (f > 0.10) { col = edge;  a = 0.95; }
  if (f > 0.30) { col = mid;   a = 0.85; }
  if (f > 0.62) { col = core;  a = 0.9; }
  col = mix(col, vec3(0.54, 0.56, 0.60), uGrey);
  float e = length((p - vec2(0.0, 0.36)) / vec2(0.26, 0.40));
  a *= smoothstep(1.0, 1.25, e);
  a *= uFade * step(0.0001, f);
  col = min(col, vec3(0.92));
  gl_FragColor = vec4(col, a);
}`;

// Ring: radius r = uA (0..1 of the card), thickness shrinks as it expands; cyan edge band.
const RING = /* glsl */ `
varying vec2 vUv; uniform float uA; uniform vec3 uCol; uniform vec3 uEdge;
void main(){
  vec2 p = vUv * 2.0 - 1.0; float r = length(p);
  float th = 0.12 * (1.0 - uA) + 0.015;
  float d = abs(r - uA);
  float body = smoothstep(th, 0.0, d);
  float edge = smoothstep(th * 1.8, th, d) - body;
  vec3 c = uCol * body + uEdge * edge;
  float a = (body + edge * 0.8) * (1.0 - uA) * step(r, 1.0);
  gl_FragColor = vec4(min(c, vec3(0.92)), a);
}`;

export function buildAura(ctx, frame, win) {
  const THREE = ctx.THREE, g = new THREE.Group();
  const H = frame.H;
  // flame card spans y 0..1 of the card; card centre sits H*0.9 above the feet so the bottom meets the ground
  const flame = makeCard(ctx, FLAME, { uGrey: { value: 0 }, uFade: { value: 1 } }, H * 1.8, H * 1.8, { back: 0.45 * H });
  flame.userData.lift = H * 0.9 - H * 0.55;
  g.add(flame);
  // second, larger, dimmer layer with its own seed: the layered coloured-outline depth
  const flame2 = makeCard(ctx, FLAME, { uGrey: { value: 0 }, uFade: { value: 0.6 } }, H * 2.1, H * 2.1, { back: 0.7 * H });
  flame2.userData.lift = H * 1.05 - H * 0.55;
  g.add(flame2);

  const ring = makeCard(ctx, RING, { uCol: { value: new THREE.Color("#f6f9ff") }, uEdge: { value: new THREE.Color("#a8d8ff") } }, H * 7, H * 7, { back: 0.2 * H });
  g.add(ring);

  // sparks: 140 points rising off the body, pure function of t
  const NS = 140, sp = new Float32Array(NS * 3), sph = new Float32Array(NS);
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sgeo.setAttribute("ph", new THREE.BufferAttribute(sph, 1));
  const smat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 700 }, uA: { value: 0 } },
    vertexShader: "attribute float ph; varying float vL; uniform float uPx; void main(){ vL = ph; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(1.5, (1.0 - ph) * 0.07 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying float vL; uniform float uA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard; vec3 col = mix(vec3(0.659,0.847,1.0), vec3(0.965,0.976,1.0), 1.0 - r*2.0); gl_FragColor = vec4(min(col, vec3(0.92)), uA * (1.0 - vL)); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sgeo, smat); sparks.frustumCulled = false; sparks.renderOrder = 5; g.add(sparks);

  // electric arcs: 9 jagged 8-segment polylines hugging the body, regenerated each 2 frames (seeded by step)
  const NA = 9, SEG = 8, ap = new Float32Array(NA * SEG * 2 * 3);
  const ageo = new THREE.BufferGeometry(); ageo.setAttribute("position", new THREE.BufferAttribute(ap, 3));
  const amat = new THREE.LineBasicMaterial({ color: new THREE.Color("#a8d8ff"), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const arcs = new THREE.LineSegments(ageo, amat); arcs.frustumCulled = false; arcs.renderOrder = 5; g.add(arcs);

  const tmp = new THREE.Vector3(), sz = new THREE.Vector2();
  const wSign = win("sign", 7.0, 0.5), wIgn = win("ignition", 7.5, 0.58), wSpend = win("spend", 13.5, 1.2);

  return {
    group: g,
    update(t) {
      const seed = Math.floor(t * 12); // twos
      const ks = wk(wSign, t), ki = wk(wIgn, t), kx = wk(wSpend, t);
      // amplitude: 0 before sign; grey flicker during sign; surge over the ignition window; hold; gutter at spend
      let amp = 0, grey = 0, fade = 1;
      if (ks >= 0 && ki < 0) { grey = 1; amp = 0.18 + 0.12 * (seed & 1); fade = seed % 3 === 0 ? 0 : 0.8; }
      if (ki >= 0) { amp = ki > 1 ? 1 : sstep(0, 1, ki); grey = ki < 0.5 ? 1 - ki * 2 : 0; }
      if (kx >= 0) { const k = kx > 1 ? 1 : kx; amp *= 1 - sstep(0, 1, k); grey = sstep(0.5, 1, k) * 0.5; }
      const on = amp > 0.01 && fade > 0;
      for (const m of [flame, flame2]) {
        m.visible = on; m.material.uniforms.uA.value = amp;
        m.material.uniforms.uSeed.value = seed + (m === flame2 ? 41 : 0);
        m.material.uniforms.uGrey.value = grey; m.userData.anchor.copy(frame.chest);
      }
      flame.material.uniforms.uFade.value = fade; flame2.material.uniforms.uFade.value = 0.6 * fade;
      // ignition ring
      const rt = t - wIgn.t0;
      ring.visible = rt >= 0 && rt <= 0.8;
      ring.material.uniforms.uA.value = clamp01(rt / 0.8); ring.userData.anchor.copy(frame.chest);
      // sparks
      sparks.visible = on; smat.uniforms.uA.value = 0.9 * amp;
      ctx.engine.renderer?.getDrawingBufferSize(sz); smat.uniforms.uPx.value = sz.y || 700;
      for (let i = 0; i < NS; i++) {
        const ph = (t * (0.5 + hash(i) * 0.7) + hash(i + 50)) % 1;
        const ang = hash(i + 100) * 6.283, rad = (0.25 + 0.5 * hash(i + 150)) * frame.H * (1 + ph * 0.6);
        frame.world(Math.cos(ang) * rad, ph * frame.H * 1.7 + 0.05 * frame.H, Math.sin(ang) * rad, tmp);
        sp[i * 3] = tmp.x; sp[i * 3 + 1] = tmp.y; sp[i * 3 + 2] = tmp.z; sph[i] = ph;
      }
      sgeo.attributes.position.needsUpdate = true; sgeo.attributes.ph.needsUpdate = true;
      // arcs
      arcs.visible = on && amp > 0.5;
      if (arcs.visible) {
        for (let a = 0; a < NA; a++) {
          const ang0 = hash(a + seed * 7.1) * 6.283, y0 = hash(a + 20 + seed) * 1.3 * frame.H;
          let px = Math.cos(ang0) * 0.4 * frame.H, py = y0, pz = Math.sin(ang0) * 0.4 * frame.H;
          for (let s = 0; s < SEG; s++) {
            const nx = px + (hash(a * 13 + s + seed * 3) - 0.5) * 0.35 * frame.H;
            const ny = py + (hash(a * 17 + s + seed) - 0.3) * 0.3 * frame.H;
            const nz = pz + (hash(a * 19 + s + seed * 5) - 0.5) * 0.35 * frame.H;
            const o = (a * SEG + s) * 6;
            frame.world(px, py, pz, tmp); ap[o] = tmp.x; ap[o + 1] = tmp.y; ap[o + 2] = tmp.z;
            frame.world(nx, ny, nz, tmp); ap[o + 3] = tmp.x; ap[o + 4] = tmp.y; ap[o + 5] = tmp.z;
            px = nx; py = ny; pz = nz;
          }
        }
        ageo.attributes.position.needsUpdate = true;
      }
    },
    dispose() { disposeAll(g); },
  };
}
