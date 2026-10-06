// Ki orbs and shock field (bible 3 + 6 + easter egg 3): 23 small orbs (the PR's 23 files) hurled from Jiren-seal's lane,
// one 4 m big orb in a pink-violet shock field with white fizz debris. Orbs miss the seal laterally; none crosses lens-to-seal
// because the lane runs along the seal's local z and the lateral miss is >= 0.55 m (x seal scale).
// Beat names read: "bigorb" (default 4.6 s, 1.1 s) and "dodge" (default 8.08 s, 5.42 s; the 23 orbs spread across it).
import { GLSL_NOISE, hash, clamp01, disposeAll } from "./util.js";

const N = 23;
// Orb shader. Self-lit sphere. Radial value v = 1 - fresnel-ish n.v: centre bright.
// Colour ramp: core #fff2a0 (v>0.7), mid #f0a030 (v>0.35), rim #d86020. Small orbs tint via uTint (#ff8a1f / #ff4fc8).
// Interior fizz: fbm(vN.xy*5 + t*3) thresholds into white specks: sp = step(0.74, fbm), adds white (0.95) flecks.
// Luma capped 0.97 (far from the seal; the cap is protective, 0.92 applies to seal-adjacent light).
const ORB_V = "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }";
const ORB_F = GLSL_NOISE + /* glsl */ `
varying vec3 vN; varying vec3 vV; uniform float uT; uniform vec3 uTint; uniform float uA; uniform float uSeed;
void main(){
  float v = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  vec3 core = vec3(1.0, 0.949, 0.627), mid = vec3(0.941, 0.627, 0.188), rim = vec3(0.847, 0.376, 0.125);
  vec3 col = rim;
  col = mix(col, mid, smoothstep(0.30, 0.42, v));
  col = mix(col, core, smoothstep(0.66, 0.78, v));
  col = mix(col, uTint, 0.35 * (1.0 - smoothstep(0.0, 0.5, v)));
  float fz = fbm(vN.xy * 5.0 + vec2(uSeed, uT * 3.0));
  col += vec3(0.55) * step(0.70, fz) * (0.5 + 0.5 * v);   // white fizz specks
  col *= 0.8 + 0.4 * fz;                                    // noisy interior texture
  gl_FragColor = vec4(min(col, vec3(0.97)), uA);
}`;
// Shock-field billow: inside-facing sphere, pink-violet #d06ad0 -> #8a4ad8, fbm cloud, edge fade.
// alpha = smoothstep(0.35, 0.8, fbm(dir*3 + t)) * (1 - r)^1, additive.
const FIELD_F = GLSL_NOISE + /* glsl */ `
varying vec3 vN; varying vec3 vV; uniform float uT; uniform float uA;
void main(){
  float v = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float c = fbm(vN.xy * 3.0 + vN.zy * 2.0 + vec2(uT * 1.5, 0.0));
  float bill = smoothstep(0.35, 0.8, c);
  vec3 col = mix(vec3(0.541, 0.290, 0.847), vec3(0.816, 0.416, 0.816), bill);
  float edge = pow(1.0 - v, 1.5);
  gl_FragColor = vec4(col * 0.9, uA * (0.12 + bill * 0.55) * (0.3 + edge));
}`;

export function buildOrbs(ctx, frame, win) {
  const THREE = ctx.THREE, g = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const mkMat = (tint) => new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uTint: { value: new THREE.Color(tint) }, uA: { value: 1 }, uSeed: { value: 0 } }, vertexShader: ORB_V, fragmentShader: ORB_F, transparent: true, depthWrite: false });
  const orbs = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(sphere, mkMat(i % 2 ? "#ff4fc8" : "#ff8a1f"));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 6; g.add(m); orbs.push(m);
  }
  const big = new THREE.Mesh(sphere, mkMat("#f0a030")); big.visible = false; big.frustumCulled = false; big.renderOrder = 6; g.add(big);
  const field = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 } }, vertexShader: ORB_V, fragmentShader: FIELD_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  field.visible = false; field.frustumCulled = false; field.renderOrder = 5; g.add(field);

  // white fizzy debris: 8 specks per small orb + 60 around the big orb, flung backwards along the lane and falling
  const PER = 8, ND = N * PER + 60, dp = new Float32Array(ND * 3), da = new Float32Array(ND);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3)); dg.setAttribute("al", new THREE.BufferAttribute(da, 1));
  const dm = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 700 } },
    vertexShader: "attribute float al; varying float vA; uniform float uPx; void main(){ vA = al; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(1.5, 0.05 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying float vA; void main(){ if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(1.0, 0.97, 0.9, vA); }",
    transparent: true, depthWrite: false,
  });
  const debris = new THREE.Points(dg, dm); debris.frustumCulled = false; debris.renderOrder = 6; g.add(debris);

  const wBig = win("bigorb", 4.6, 1.1), wDodge = win("dodge", 8.08, 5.42);
  const sz = new THREE.Vector2();
  const FLIGHT = 0.5; // 12 frames at half speed (bible): the director supplies the slow motion; this is wall-clock of the stepped t
  const from = wDodge.b?.from || [0, 0.9, 7.0], S = () => frame.H;

  // orb i timing: slot spacing so that the 23 orbs fill the dodge window; each flies FLIGHT s along local z
  const slot = (i) => wDodge.t0 + (i / N) * (wDodge.dur - FLIGHT);
  const lat = (i) => (i % 2 ? 1 : -1) * (0.55 + 0.35 * hash(i + 3)) * S();
  const pos = (i, k, out) => frame.world(lat(i), (0.25 + 0.55 * hash(i + 9)) * S(), from[2] * S() * (1 - k) - 2.0 * S() * k, out);

  return {
    group: g,
    update(t) {
      ctx.engine.renderer?.getDrawingBufferSize(sz); dm.uniforms.uPx.value = sz.y || 700;
      let di = 0; const seed = Math.floor(t * 12);
      for (let i = 0; i < N; i++) {
        const k = (t - slot(i)) / FLIGHT, o = orbs[i];
        const vis = k >= 0 && k <= 1;
        o.visible = vis; di = i * PER;
        if (!vis) { for (let s = 0; s < PER; s++) da[di + s] = 0; continue; }
        pos(i, k, o.position);
        const r = (0.5 + 0.5 * hash(i + 31)) * 0.9 * S() * 0.55 + 0.12 * S(); // 0.5-2 m class, scaled to the pup
        o.scale.setScalar(r * (1 + 0.05 * Math.sin(seed + i)));
        o.material.uniforms.uT.value = t; o.material.uniforms.uSeed.value = i * 1.7;
        for (let s = 0; s < PER; s++) { // specks trail behind the orb (toward the thrower), fall and fade
          const age = clamp01(((k * 0.6 + hash(i * 8 + s)) % 1));
          const back = age * 0.9 * S();
          dp[di * 3] = o.position.x + (hash(s + i) - 0.5) * 0.3 * S() + Math.sin(frame.yaw) * back;
          dp[di * 3 + 1] = o.position.y + (hash(s * 3 + i) - 0.5) * 0.3 * S() - age * age * 0.5 * S();
          dp[di * 3 + 2] = o.position.z + Math.cos(frame.yaw) * back + (hash(s * 5 + i) - 0.5) * 0.3 * S();
          da[di] = (1 - age) * 0.9; di++;
        }
      }
      di = N * PER;
      // big orb: 4 m diameter-class (radius 2 m * pup scale), passing wide of the seal inside the pink-violet field
      const kb = (t - wBig.t0) / wBig.dur, vb = kb >= 0 && kb <= 1;
      big.visible = vb; field.visible = vb;
      if (vb) {
        const x = 3.6 * S(), z = 12 * S() * (1 - kb) - 6 * S() * kb;
        frame.world(x, 1.4 * S(), z, big.position);
        const R = 1.0 * S() * (1 + 0.03 * Math.sin(seed * 2));
        big.scale.setScalar(R); field.position.copy(big.position); field.scale.setScalar(R * 2.8);
        big.material.uniforms.uT.value = t; big.material.uniforms.uSeed.value = 77;
        field.material.uniforms.uT.value = t; field.material.uniforms.uA.value = Math.sin(Math.PI * kb) * 0.9;
        for (let s = 0; s < 60; s++) {
          const age = (kb * 1.4 + hash(s)) % 1, a2 = hash(s + 200) * 6.283, rr = R * (1.2 + 1.6 * age);
          dp[di * 3] = big.position.x + Math.cos(a2) * rr; dp[di * 3 + 1] = big.position.y + Math.sin(a2 * 1.7) * rr * 0.7 - age * age * S();
          dp[di * 3 + 2] = big.position.z + Math.sin(a2) * rr; da[di] = (1 - age) * 0.9; di++;
        }
      } else { for (let s = 0; s < 60; s++) da[N * PER + s] = 0; }
      dg.attributes.position.needsUpdate = true; dg.attributes.al.needsUpdate = true;
    },
    dispose() { disposeAll(g); },
  };
}
