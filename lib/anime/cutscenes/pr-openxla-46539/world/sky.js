// SKY for pr-openxla-46539 (bible 3 "Storm sky and the opened sky").
// (1) NIGHT: a baked dome (layer 0). Flat cel cloud shapes in MHA navy, painted underlit by the fire at the horizon, with a
//     Ben-Day dot layer in the cloud shadow band. 360 degrees (the avenue is seen from both ends); az 0 = world -z.
//   cloud field   band = fbm(warp(q, 0.9)) + 0.30 smoothstep(0.05, 0.9, el) - 0.12, q = (2.1 az, 4.2 el)
//                 the az seam is closed by cross-fading f(az) with f(az -+ 2pi) at weight 0.5 smoothstep over the last 0.9 rad
//   cloud mask    celStep(band, 0.50)             (hard cel edge, fwidth anti-aliased)
//   cloud tones   high: #101831 / #162149 / #1c2a61 by band 0.50 / 0.62 / 0.72
//                 low (near the fire): #1a0f1e / #471f19 / #7a2a10 chosen by celStep(lowK, 0.45 + 0.25 vn)
//   gap + glow    deep #0a0f20 -> #101831 with el; horizon fire bands #471f19 / #7a2a10 / #ff8a20 at glow = 1 - smoothstep(0, 0.35, el)
//   dots          cell 0.013 rad, rotated 45 deg; radius 0.34 in the cloud shadow band; CMY by cell parity; 25 per cent
// (2) THE OPENED SKY: a LIVE dome overlay (layer 1) drawn only where it has something to say (everything else is discarded, so the
//     baked night shows through). Around the hole centre c (the strike direction, raised 0.8 rad):
//   rho = acos(d.c), phi = atan(d.e2, d.e1); the hole radius R(phi) = uR (1 + 0.45 (fbm(cos phi, sin phi) - 0.5)) is a torn cel edge.
//   inside   sky ramp #667da9 -> #2c53af (t = rho/R) with a pale #d0e7fb lining at the rim, flat-cel cumulus #f4f8ff / #8aa0d0
//            on a sky plane (uv = (d.e1, d.e2) / cos), the sun (core, halo, 16 rays) at the centre, gold #fff3b0, core > 1 blooms
//   outside  the VORTEX: spiral s = 3 phi - 4 log(1 + 2u) + spin, u = (rho - R)/uR; arms where fbm(0.55 s, 3u) + 0.18 fbm(2 s, 9u) is
//            above 0.42 + 0.55 smoothstep(0, reach, u); navy cel tones, a sun-gold rim on the inner edge. The spin scrolls on twos.
import { BackSide, ShaderMaterial, Mesh, SphereGeometry, Vector3 } from "three";
import { C } from "./palette.js";
import { V, lerp, sm } from "./lib.js";

const NIGHT = `
  float cloudF(vec2 q) { return fbm(warp(q, 0.9)); }
  float cloudSeam(float az, float el) {
    const float PI = 3.14159265, D = 0.9;
    float f = cloudF(vec2(az * 2.1, el * 4.2));
    if (az > PI - D) { float w = 0.5 * smoothstep(PI - D, PI, az); f = mix(f, cloudF(vec2((az - 2.0 * PI) * 2.1, el * 4.2)), w); }
    else if (az < -PI + D) { float w = 0.5 * smoothstep(-PI + D, -PI, az); f = mix(f, cloudF(vec2((az + 2.0 * PI) * 2.1, el * 4.2)), w); }
    return f;
  }
  vec3 sky(float az, float el) {
    if (el < 0.0) return ${V(C.wallD)};
    float dens = cloudSeam(az, el);
    float band = dens + 0.30 * smoothstep(0.05, 0.9, el) - 0.12;
    float cloud = celStep(band, 0.50);
    // gap sky: deep navy, climbing to the zenith, with the fire glow banded on the horizon
    vec3 gap = mix(${V(C.nearBlack)}, ${V(C.navyD)}, smoothstep(0.0, 1.0, el));
    float glow = 1.0 - smoothstep(0.0, 0.35, el);
    glow *= 0.75 + 0.5 * vn(vec2(az * 9.0, el * 14.0));
    gap = mix(gap, ${V(C.flash)}, celStep(glow, 0.30));
    gap = mix(gap, ${V(C.fireHole)}, celStep(glow, 0.55));
    gap = mix(gap, ${V(C.fireEdge)}, celStep(glow, 0.86) * 0.9);
    // cloud body
    float lowK = 1.0 - smoothstep(0.0, 0.45, el);
    float low = celStep(lowK, 0.45 + 0.25 * vn(vec2(az * 6.0, el * 9.0)));
    vec3 hi = cel3(band, 0.62, 0.72, ${V(C.navyD)}, ${V(C.navy)}, ${V(C.navyL)});
    vec3 lo = cel3(band, 0.62, 0.72, ${V("#1a0f1e")}, ${V(C.flash)}, ${V(C.fireHole)});
    vec3 body = mix(hi, lo, low);
    vec3 col = mix(gap, body, cloud);
    // Ben-Day dots in the cloud shadow band
    vec2 q = rot(0.7854) * (vec2(az, el) / 0.013);
    vec2 f = fract(q) - 0.5, id = floor(q);
    float sh = cloud * (1.0 - celStep(band, 0.62));
    float dotM = (1.0 - smoothstep(0.34 * sh - 0.07, 0.34 * sh, length(f))) * step(0.01, sh);
    float par = mod(id.x + id.y, 3.0);
    vec3 dc = par < 0.5 ? ${V(C.cyan)} : (par < 1.5 ? ${V(C.magenta)} : ${V(C.gold)});
    col = mix(col, dc * 0.8, 0.25 * dotM);
    return col;
  }`;

const VERT = `varying vec3 vD;
  void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vD = wp.xyz - cameraPosition;
    vec4 p = projectionMatrix * viewMatrix * wp; gl_Position = vec4(p.xy, p.w * 0.99998, p.w); }`;

const OPEN = (glsl) => `uniform vec3 uC; uniform float uR; uniform float uSpin; uniform float uT; uniform float uVortex; varying vec3 vD;
  ${glsl}
  void main() {
    vec3 d = normalize(vD);
    float cr = clamp(dot(d, uC), -1.0, 1.0);
    if (cr < 0.0) discard;
    float rho = acos(cr);
    vec3 up = abs(uC.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 e1 = normalize(cross(up, uC)); vec3 e2 = cross(uC, e1);
    float phi = atan(dot(d, e2), dot(d, e1));
    float edgeN = fbm(vec2(cos(phi), sin(phi)) * 2.2 + vec2(0.0, uSpin * 0.15));
    float R = uR * (1.0 + 0.45 * (edgeN - 0.5));
    if (rho < R) {
      float t = rho / max(R, 1e-4);
      vec3 col = mix(${V(C.dayMid)}, ${V(C.dayTop)}, smoothstep(0.1, 0.8, t));
      col = mix(col, ${V(C.dayLow)}, smoothstep(0.86, 1.0, t));
      vec2 uv = vec2(dot(d, e1), dot(d, e2)) / max(cr, 0.25) * 2.6;
      vec2 w = warp(uv * 0.8 + vec2(uT * 0.03, 0.0), 0.5);
      float cd = fbm(w * 1.5), sd = fbm((w + vec2(0.0, 0.10)) * 1.5);
      float cm = celStep(cd, 0.56) * smoothstep(0.25, 0.6, t);
      vec3 cum = mix(${V(C.cumShade)}, ${V(C.cumulus)}, celStep(cd - sd + 0.5, 0.5));
      col = mix(col, cum, cm);
      float core = 1.0 - celStep(t, 0.10), halo = 1.0 - celStep(t, 0.24);
      float rays = pow(0.5 + 0.5 * sin(phi * 16.0 + uSpin * 0.5), 5.0) * (1.0 - smoothstep(0.0, 0.9, t));
      col = mix(col, ${V(C.shaft)}, halo * 0.55);
      col += ${V(C.shaft)} * rays * 0.25;
      col = mix(col, vec3(1.0, 0.97, 0.82) * 1.25, core);
      gl_FragColor = vec4(col, 0.0); return;
    }
    float u = (rho - R) / max(uR, 0.02);
    float spiral = phi * 3.0 - log(1.0 + u * 2.0) * 4.0 + uSpin;
    float dens = fbm(vec2(spiral * 0.55, u * 3.0 + 4.0)) + 0.18 * fbm(vec2(spiral * 2.0, u * 9.0));
    float reach = 1.7 + 0.8 * uVortex;
    float cov = dens - 0.42 - 0.55 * smoothstep(0.0, reach, u) + (uVortex - 0.5) * 0.3;
    if (cov < 0.0) discard;
    vec3 col = cel3(cov, 0.12, 0.28, ${V(C.navyD)}, ${V(C.navy)}, ${V(C.navyL)});
    float inner = 1.0 - smoothstep(0.0, 0.18, u);
    col = mix(col, ${V(C.shaft)} * 0.9, celStep(inner, 0.45) * 0.85);
    gl_FragColor = vec4(col, 0.0);
  }`;

export function buildNightSky(ctx) {
  // one dome, the full circle: 4096 px is the bake cap, so 650 px/rad
  return ctx.bake.sky(NIGHT, { az: [-Math.PI, Math.PI], el: [-0.4, 1.45], pxPerRad: 650, tools: ["noise", "cel"] });
}

export function buildOpenSky(ctx) {
  const { engine } = ctx;
  const yaw = ctx.scene?.seal?.yaw ?? 0, EL = 0.8;
  const F = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const c = F.clone().multiplyScalar(Math.cos(EL)).add(new Vector3(0, Math.sin(EL), 0)).normalize();
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { uC: { value: c.clone() }, uR: { value: 0 }, uSpin: { value: 0 }, uT: { value: 0 }, uVortex: { value: 1 } },
    vertexShader: VERT, fragmentShader: OPEN(ctx.tools.glslFor(["noise", "cel"])),
  });
  const mesh = new Mesh(new SphereGeometry(380, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -9; mesh.userData.layer = 1; mesh.visible = false;
  const prevSun = engine.sun ? engine.sun.clone() : null;
  const sunPos = c.clone().multiplyScalar(300);
  return {
    mesh, hole: c,
    // t0: the moment the sky opens; ts: stepped time. Returns the opening 0..1.
    update(ts, t0) {
      const a = ts - t0, u = mat.uniforms;
      const on = a >= 0;
      mesh.visible = on;
      if (!on) { engine.sun = prevSun; return 0; }
      const open = sm(0, 1.3, a);
      u.uR.value = lerp(0.04, 0.85, 1 - (1 - open) * (1 - open));   // ease-out growth: the blast, then the settle
      u.uSpin.value = a * 1.5;
      u.uT.value = ts;
      u.uVortex.value = 1 - sm(1.5, 5.5, a);
      engine.sun = sunPos;
      return open;
    },
    dispose() { engine.sun = prevSun; mesh.geometry.dispose(); mat.dispose(); },
  };
}
