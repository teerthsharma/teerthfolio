// p-tangle WORLD: the crater lake, the low mist, and the sky shafts (bible 3.3, 3.14, 6 FX table "Ripples", "Shafts").
//
// LAKE MATHS (fragment, world position wp, view V = normalize(cam - wp)):
//   slope field  sl = grad( vn(.6 q + (.12 t, 0)) + .5 vn(1.7 q - (0, .2 t)) ) * .035 / (1 + .02 dist)      (flat far, busy near)
//   ripples      4 slots (x, z, t0, amp): d = |q - c|, age = t - t0, front = 5.5 age (m/s, the bible's ring speed)
//                band = exp(-((d - front)/.9)^2), env = exp(-.45 age) S(0,.4,age) / (1 + .04 d)
//                sl += normalize(q - c) * band cos(5 (d - front)) .25 env amp     (a travelling ring of normals)
//   normal       n = normalize(-sl.x, 1, -sl.y);  R = reflect(-V, n), forced upward
//   mirror       sky(R) = rampSky(el) + sunGlow, hills in reflection where el < hillEl(az) (the far shore #5f7890)
//   Fresnel      F = .04 + .96 (1 - n.V)^5, the body is mix(deep, shallow, shallows near the islets) lit by a pink bounce
//   glare        exp(-ang^2 14) uGlareK * glareCol : the near-white field of frame 03, capped so it never milks
//   glitter      cells of ~2 px (cell = dist * .0032, quantised), one point per cell with a twinkle step on threes, gated by exp(-ang^2 3)
//   shafts       rust diagonal bands radiating from the sun: phi = atan(x, z + 400), band = S(.82,.95, sin(55 phi + 2 vn)) * .14 * #c46a3a
//   foam         a hard-edged lapping line around each islet: S(.06, 0, |dEdge - .25 - .1 sin(1.5 t + 3 dEdge)|)
import { AddEquation, BackSide, CircleGeometry, CustomBlending, DoubleSide, Mesh, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, SrcAlphaFactor, SphereGeometry, Vector2, Vector3, Vector4, ZeroFactor } from "three";
import { SKY_DECL, V } from "./sky.js";
import { ISLETS, SPIT, LAKE } from "./terrain.js";

export function buildLake(ctx, U, noiseGlsl, add, dispose) {
  U.uRip = { value: Array.from({ length: 4 }, () => new Vector4(0, 0, -99, 0)) };
  const isl = [...ISLETS.map((m) => new Vector3(m.x, m.z, m.edge * 0.88)), new Vector3(SPIT.x, SPIT.z, SPIT.edge * 0.9)];
  U.uIslets = { value: isl };
  const mat = new ShaderMaterial({
    uniforms: U,
    vertexShader: "varying vec3 vWp; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${noiseGlsl}
${SKY_DECL}
uniform float uTime, uShaft, uGlareK, uHazeD; uniform vec4 uRip[4]; uniform vec3 uIslets[3];
uniform vec3 uDeep, uShallow, uBounce, uGlareCol, uHill, uShaftCol, uHaze;
varying vec3 vWp;
float crestH(float th) { return max(3.0, 9.0 + 6.0 * sin(2.3 * th + 0.7) + 3.5 * sin(5.1 * th + 2.0) + 1.8 * sin(11.0 * th)); }
void main() {
  vec3 wp = vWp; vec3 Vv = cameraPosition - wp; float dist = length(Vv); vec3 V = Vv / dist; vec2 q = wp.xz;
  float e = 0.35;
  vec2 a0 = q * 0.6 + vec2(uTime * 0.12, 0.0), b0 = q * 1.7 - vec2(0.0, uTime * 0.2);
  float w0 = vn(a0) + 0.5 * vn(b0);
  float wx = vn(a0 + vec2(e * 0.6, 0.0)) + 0.5 * vn(b0 + vec2(e * 1.7, 0.0));
  float wz = vn(a0 + vec2(0.0, e * 0.6)) + 0.5 * vn(b0 + vec2(0.0, e * 1.7));
  vec2 sl = vec2(wx - w0, wz - w0) / e * 0.035 / (1.0 + 0.02 * dist);
  float ringLit = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 r = uRip[i]; float age = uTime - r.z;
    if (r.w > 0.0 && age > 0.0) {
      vec2 dv = q - r.xy; float d = length(dv) + 1e-4;
      float fr = 5.5 * age; float k = (d - fr) / 0.9;
      float band = exp(-k * k); float env = exp(-0.45 * age) * smoothstep(0.0, 0.4, age) / (1.0 + 0.04 * d);
      sl += dv / d * band * cos(5.0 * (d - fr)) * 0.25 * env * r.w;
      ringLit += band * env * r.w;
    }
  }
  vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec3 R = reflect(-V, n); R.y = max(R.y, 0.002); R = normalize(R);
  float el = asin(R.y), az = atan(R.x, -R.z);
  vec3 sk = rampSky(el) + sunGlow(az, el);
  float hillEl = max(0.0, crestH(az) * (0.12 + 0.88 * smoothstep(0.25, 1.0, abs(az))) * 0.35 / 120.0);
  sk = mix(sk, uHill, smoothstep(hillEl, hillEl - 0.01, el) * 0.85);
  float cosT = max(dot(n, V), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  // shallows around the islets and the spit
  float shal = 0.0, foam = 0.0;
  for (int i = 0; i < 3; i++) {
    float dE = length(q - uIslets[i].xy) - uIslets[i].z;
    shal = max(shal, exp(-max(dE, 0.0) * 0.45));
    foam = max(foam, smoothstep(0.07, 0.0, abs(dE - 0.3 - 0.12 * sin(uTime * 1.5 + dE * 3.0))) * step(-0.05, dE));
  }
  vec3 body = mix(uDeep, uShallow, clamp(shal * 0.8 + (1.0 - cosT) * 0.15, 0.0, 1.0)) + uBounce * 0.06 * (1.0 - cosT);
  vec3 col = mix(body, sk, clamp(F, 0.0, 1.0));
  // glare field
  vec2 dd = vec2(az * cos(el), el - uSunEl); float ang2 = dot(dd, dd);
  col += uGlareCol * exp(-ang2 * 14.0) * uGlareK * 0.55 * smoothstep(0.0, 0.3, F + 0.3);
  // glitter, ~2 px points, twinkle on threes
  float cell = exp2(floor(log2(max(dist * 0.0032, 0.01)) * 2.0) / 2.0);
  vec2 gp = q / cell, gi = floor(gp), gf = fract(gp) - 0.5;
  float tt = floor(uTime * 4.0);
  float gate = step(1.0 - 0.07, h21(gi + tt * 7.13)) * exp(-ang2 * 3.0);
  vec2 off = (h22(gi) - 0.5) * 0.4;
  float spark = (1.0 - smoothstep(0.08, 0.26, length(gf - off))) * gate;
  float cross4 = max(1.0 - smoothstep(0.0, 0.05, abs(gf.x - off.x)), 1.0 - smoothstep(0.0, 0.05, abs(gf.y - off.y))) * (1.0 - smoothstep(0.1, 0.5, length(gf - off))) * gate * step(0.5, h21(gi + 5.0));
  col += uGlareCol * (spark + cross4 * 0.7) * 2.0 * uGlareK;
  // rust diagonal shafts across the water
  float phi = atan(q.x, q.y + 400.0);
  float band = smoothstep(0.82, 0.95, sin(55.0 * phi + 2.0 * vn(q * 0.05))) * (0.5 + 0.5 * vn(q * 0.03 + 3.0));
  col += uShaftCol * band * uShaft * exp(-pow(phi * 3.0, 2.0)) * 1.2;
  col += uGlareCol * ringLit * 0.18 + ${V("#f5d4cf")} * foam * 0.3;
  // atmosphere
  col = mix(col, rampSky(0.0) * 0.9 + uHaze * 0.1, 1.0 - exp(-dist / 330.0));
  gl_FragColor = vec4(col, 0.5);
}`,
  });
  const g = new CircleGeometry(1, 128).rotateX(-Math.PI / 2);
  const lake = new Mesh(g, mat); lake.scale.set(LAKE.ax, 1, LAKE.az); lake.position.y = LAKE.y; lake.frustumCulled = false;
  add(lake, 1); dispose(g); dispose(mat);
}

// the painted mist: two drifting sheets that clear around the seal, the girl and the spit's foot. Additive-free: tint over, alpha preserved.
export function buildMist(ctx, U, noiseGlsl, add, dispose) {
  const mk = (y, scale, speed, k) => {
    const mat = new ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, side: DoubleSide,
      blending: CustomBlending, blendEquation: AddEquation, blendSrc: SrcAlphaFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor,
      vertexShader: "varying vec3 vWp; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `${noiseGlsl}
uniform float uTime, uMistK; uniform vec3 uMistCol; varying vec3 vWp;
void main() {
  vec2 q = vWp.xz * ${scale.toFixed(4)} + vec2(uTime * ${speed.toFixed(3)}, 0.0);
  float m = fbm(vec2(q.x * 1.0, q.y * 2.4));
  float a = smoothstep(0.45, 0.8, m) * uMistK * ${k.toFixed(2)};
  float cl = min(min(length(vWp.xz - vec2(0.0, 0.0)), length(vWp.xz - vec2(2.0, -26.0))), length(vWp.xz - vec2(-30.0, 6.0)) * 0.6);
  a *= smoothstep(7.0, 18.0, cl);                                    // never over the seal or the girl
  a *= 1.0 - smoothstep(60.0, 140.0, length(vWp.xz));
  a *= smoothstep(2.0, 9.0, length(cameraPosition - vWp));
  gl_FragColor = vec4(uMistCol, a);
}`,
    });
    const geo = new CircleGeometry(150, 48).rotateX(-Math.PI / 2);
    const m = new Mesh(geo, mat); m.position.y = y; m.frustumCulled = false; m.renderOrder = 5;
    add(m, 1); dispose(geo); dispose(mat);
  };
  mk(0.45, 0.035, 0.12, 1.0);
  mk(1.8, 0.022, -0.07, 0.7);
}

// diagonal sky shafts radiating from the sun, baked into the plate (layer 0), additive in colour, alpha untouched
export function buildSkyShafts(ctx, U, add, dispose) {
  const mat = new ShaderMaterial({
    uniforms: U, side: BackSide, transparent: true, depthWrite: false,
    blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor,
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99998, p.w); }",
    fragmentShader: `uniform float uSunEl, uShaft; uniform vec3 uShaftCol; varying vec3 vD;
      float h(float x) { return fract(sin(x * 91.7) * 43758.5); }
      void main() {
        vec3 d = normalize(vD); float el = asin(clamp(d.y, -1.0, 1.0)), az = atan(d.x, -d.z);
        vec2 s = vec2(az * cos(el), el - uSunEl); float r = length(s); float phi = atan(s.y, s.x);
        float b = sin(phi * 9.0 + 6.0 * h(floor(phi * 9.0 / 6.2832 * 3.0))) * 0.5 + 0.5;   // 3 to 6 diagonal bands
        float mask = smoothstep(0.78, 0.95, b) * exp(-r * 1.6) * smoothstep(0.0, 0.05, el) * smoothstep(0.02, 0.15, r);
        gl_FragColor = vec4(uShaftCol * mask * uShaft * 1.4, 0.0);
      }`,
  });
  const g = new SphereGeometry(380, 48, 24);
  const m = new Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -9;
  add(m, 0); dispose(g); dispose(mat);
}
void Vector2;
