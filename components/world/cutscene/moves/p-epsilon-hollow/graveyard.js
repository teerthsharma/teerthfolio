// THE GRAVEYARD OF EFFORTS (p-epsilon-hollow's domain, the owner's concept 2026-10-06): the graveyard is a PLANET. A
// small dead world, every metre of it a grave of something eldritch, and its SUN is EPSILON-HOLLOW: a black hole with
// an eye. The parts, all built once at mount:
//   skyMaterial()     a fullscreen fragment read as world directions (the inverse view-projection): the void, a violet-
//                     teal nebula, and the EYE: an almond of lensed light (the sclera), the accretion disc as the iris
//                     (gold-violet fibres turning inward), the event horizon as the pupil, the photon ring its limbus,
//                     three strands (memory cyan, files gold, scheduler pink) spiralling down into it. It sits below
//                     the surface's horizon: from the graves only its light shows; from orbit it fills the sky.
//   planetMaterial()  the planet: cracked basalt and bone dust, eldritch teal leaking from a crack network (3D Voronoi
//                     edges), lit only by the eye (a gold-violet crescent on the limb that faces it), a teal limb haze
//                     on the night side, and a low mist that only exists near the ground
// Every one of them opens along the slash (uCut): the domain splits and what is behind it shows.
// No NaN: every normalize and divide is guarded. Fog rides the scene's uniforms (UniformsLib.fog).

import { CanvasTexture, Color, IcosahedronGeometry, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, SRGBColorSpace, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { DEAD_PRS } from "../../../../../lib/world/cutscene/graves";

export const PLANET_R = 170; // m: the horizon from a pup's eye is ~19 m away, so the world curves under it

// the slash, shared: a line through the screen centre (normal uCutN), open by uCut (0..1); its edge burns
export const CUT = /* glsl */ `
  uniform float uCut;
  uniform vec2 uCutN;
  uniform vec2 uRes;
  float slash(out float edge) {
    vec2 q = (gl_FragCoord.xy / max(uRes, vec2(1.0))) * 2.0 - 1.0;
    q.x *= uRes.x / max(uRes.y, 1.0);
    float d = abs(dot(q, uCutN));
    float open = uCut * 0.55;
    edge = uCut > 0.0 ? smoothstep(0.05, 0.0, abs(d - open)) : 0.0;
    return d < open ? 1.0 : 0.0;
  }`;
export const cutUniforms = () => ({ uCut: { value: 0 }, uCutN: { value: new Vector2(0.62, 0.78) }, uRes: { value: new Vector2(1280, 800) } });

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return s;
  }`;

export function skyMaterial() {
  return new ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      uInvVP: { value: new Matrix4() },
      uCam: { value: new Vector3() },
      uHole: { value: new Vector3(0, -0.17, -1).normalize() }, // set once a scene from the wide (the move)
      uTime: { value: 0 },
      uShow: { value: 0 },
      ...cutUniforms(),
    },
    vertexShader: /* glsl */ `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy * 2.0;
        gl_Position = vec4(vNdc, 0.99999, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform mat4 uInvVP;
      uniform vec3 uCam, uHole;
      uniform float uTime, uShow;
      varying vec2 vNdc;
      ${CUT}
      ${NOISE}
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        vec4 w = uInvVP * vec4(vNdc, 1.0, 1.0);
        vec3 dir = w.xyz / max(abs(w.w), 1e-5) * sign(w.w) - uCam;
        dir = dir / max(length(dir), 1e-5);
        // the eye's own frame: p is the angular offset from its centre (x across, y up)
        vec3 side = cross(uHole, vec3(0.0, 1.0, 0.0));
        vec3 e1 = side / max(length(side), 1e-4);
        vec3 e2 = cross(e1, uHole);
        float front = dot(dir, uHole);
        vec2 p = vec2(dot(dir, e1), dot(dir, e2)) * 2.6; // the pupil ~5 deg, the iris ~16 deg
        if (front < 0.0) p = vec2(9.0);
        float r = length(p);
        float th = atan(p.y, p.x);
        vec2 cs = vec2(cos(th), sin(th));
        float lr = log(max(r, 1e-3));
        // lensing: the sky is pushed outward round the pupil
        vec2 lp = p * (1.0 + 0.05 / (r * r + 0.01));
        // the void: black, a violet-teal nebula, cold stars
        vec3 col = vec3(0.004, 0.003, 0.008);
        vec2 sp = vec2(dir.x + dir.z, dir.y) * 2.4 + lp * 0.2;
        float neb = fbm(sp * 1.3 + vec2(uTime * 0.01, 0.0));
        float neb2 = fbm(sp * 2.9 - 4.0);
        col += vec3(0.14, 0.05, 0.22) * smoothstep(0.45, 0.85, neb);
        col += vec3(0.02, 0.15, 0.12) * smoothstep(0.55, 0.9, neb2);
        vec2 sc2 = vec2(dir.x + 0.37 * dir.z, dir.y + 0.61 * dir.z) * 420.0;
        float star = step(0.9975, hash(floor(sc2))) * smoothstep(0.35, 0.0, length(fract(sc2) - 0.5)) * smoothstep(0.9, 1.6, r);
        col += vec3(0.8, 0.85, 0.95) * star;
        // the lids: an almond of lensed light round the iris, the sclera; outside it the void is drained darker
        float ax = p.x / 1.75;
        float lid = 0.78 * max(1.0 - ax * ax, 0.0);
        float inLid = smoothstep(0.03, -0.03, abs(p.y) - lid) * step(abs(ax), 1.0);
        float lidLine = smoothstep(0.025, 0.0, abs(abs(p.y) - lid)) * step(abs(ax), 1.0) * smoothstep(1.0, 0.4, abs(ax));
        col *= 1.0 - 0.8 * smoothstep(2.4, 0.8, r) * (1.0 - inLid);
        // the sclera: the accretion disc's far light, lensed into a bowl, swirling inward
        float sw = fbm(cs * 3.0 + vec2(lr * 2.2 - uTime * 0.25, lr * 4.0));
        // dark: a bruise of violet, warming to gold only at the iris, veined by the swirl
        vec3 sclera = mix(vec3(0.06, 0.02, 0.09), vec3(0.55, 0.32, 0.16), smoothstep(1.2, 0.72, r)) * (0.3 + 0.9 * sw * sw);
        col = mix(col, sclera, inLid * smoothstep(0.55, 0.7, r));
        col += vec3(0.95, 0.7, 0.4) * lidLine * 0.55;
        // the iris: the disc face-on, gold at the pupil to violet at the rim, its fibres turning (the matter falling in)
        float ir = clamp((r - 0.24) / 0.46, 0.0, 1.0);
        float fib = fbm(cs * 7.0 + vec2(ir * 3.0 - uTime * 0.3, uTime * 0.1));
        float fib2 = 0.5 + 0.5 * sin(th * 46.0 + ir * 9.0 - uTime * 1.4 + fib * 6.0);
        vec3 iris = mix(vec3(1.0, 0.86, 0.48), vec3(0.95, 0.55, 0.18), smoothstep(0.0, 0.35, ir));
        iris = mix(iris, vec3(0.42, 0.14, 0.68), smoothstep(0.35, 0.95, ir));
        iris *= 0.45 + 0.75 * fib * (0.6 + 0.4 * fib2);
        float doppler = 0.75 + 0.45 * smoothstep(0.5, -0.5, p.x / max(r, 1e-3));
        float irisMask = smoothstep(0.72, 0.68, r) * smoothstep(0.22, 0.25, r);
        col = mix(col, iris * doppler, irisMask);
        col = mix(col, vec3(0.08, 0.02, 0.12), smoothstep(0.03, 0.0, abs(r - 0.71))); // the dark limbal ring
        // the strands: memory, files, scheduler, spiralling down the iris into the pupil
        vec3 sc[3];
        sc[0] = vec3(0.02, 0.85, 0.95); sc[1] = vec3(1.0, 0.78, 0.3); sc[2] = vec3(0.95, 0.35, 0.68);
        for (int i = 0; i < 3; i++) {
          float s = fract((th + 2.4 * lr - uTime * 0.45) / 6.2831853 + float(i) / 3.0);
          float k = smoothstep(0.012, 0.0, abs(s - 0.5) - 0.002) * smoothstep(1.5, 0.75, r) * smoothstep(0.2, 0.3, r);
          col = mix(col, sc[i], k * 0.7);
        }
        // the pupil: the event horizon, pure black, ringed by the photon ring
        float photon = smoothstep(0.022, 0.0, abs(r - 0.235));
        col = mix(col, vec3(0.0), smoothstep(0.225, 0.215, r));
        col = mix(col, vec3(1.0, 0.95, 0.82), photon);
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
  });
}

// One planet, one shader. Its centre and the eye are uniforms; the ground near the pup is the same sphere, so the
// horizon curves for real.
export function planetMaterial() {
  return new ShaderMaterial({
    fog: true,
    transparent: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uShow: { value: 0 },
        uTime: { value: 0 },
        uHole: { value: new Vector3(0, -0.17, -1).normalize() },
        uCenter: { value: new Vector3() },
        uR: { value: PLANET_R },
        uBasalt: { value: new Color("#231e2a") },
        uBone: { value: new Color("#8c8474") },
        uTeal: { value: new Color("#2cf2b4") },
        uGold: { value: new Color("#f2b25a") },
        uViolet: { value: new Color("#7a3fc0") },
        ...cutUniforms(),
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uHole, uCenter, uBasalt, uBone, uTeal, uGold, uViolet;
      uniform float uShow, uTime, uR;
      varying vec3 vWorld;
      ${CUT}
      float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
      vec3 h33(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
      float n3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      float f3(vec3 p) { return 0.5 * n3(p) + 0.25 * n3(p * 2.07 + 3.1) + 0.125 * n3(p * 4.13 + 7.7); }
      // F2 - F1 of a 3D Voronoi: thin where two cells meet, the cracks
      float cracks(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        float d1 = 8.0, d2 = 8.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = g + h33(i + g) - f;
          float d = dot(o, o);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        return sqrt(d2) - sqrt(d1);
      }
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        vec3 rel = vWorld - uCenter;
        vec3 n = rel / max(length(rel), 1e-3);
        vec3 toCam = cameraPosition - vWorld;
        float dist = length(toCam);
        vec3 v = toCam / max(dist, 1e-3);
        float alt = length(cameraPosition - uCenter) - uR;
        // the dead crust: basalt, bone dust in drifts, fine grit near the pup
        vec3 q = n * uR;
        float big = f3(n * 7.0);
        float fine = f3(q * 0.35);
        vec3 col = mix(uBasalt, uBasalt * 3.0, big) * (0.7 + 0.6 * fine);
        col = mix(col, uBone * 0.45, smoothstep(0.5, 0.72, f3(n * 4.0 + 9.0)) * 0.85);
        col = mix(col, uBone * 0.5, smoothstep(0.55, 0.8, f3(q * 0.9)) * 0.7 * smoothstep(120.0, 10.0, alt)); // bone grit underfoot
        // the cracks, two scales; eldritch light leaks out of them, breathing out of step
        // warped first, so the seams wander like fractures instead of tiling
        float c1 = cracks(n * 16.0 + (f3(n * 30.0) - 0.5) * 1.2);
        float c2 = cracks(q * 0.45 + (f3(q * 0.9) - 0.5) * 1.4);
        float breathe = 0.65 + 0.35 * sin(uTime * 1.1 + big * 12.0);
        // not every seam leaks: the light comes and goes along them, so they read as wounds, not tiles
        float leak = smoothstep(0.5, 0.72, f3(n * 22.0 + 4.0));
        float crack = smoothstep(0.035, 0.0, c1) * leak + 0.8 * smoothstep(0.018, 0.0, c2) * smoothstep(0.45, 0.68, f3(q * 0.08)) * smoothstep(160.0, 20.0, alt);
        col *= 1.0 - 0.45 * smoothstep(0.12, 0.0, c1); // the crack's dark lip
        // the eye is its only sun: a gold-violet crescent where the crust faces it
        float l = dot(n, uHole);
        float day = smoothstep(-0.08, 0.5, l);
        vec3 eyeLight = mix(uViolet, uGold, smoothstep(0.05, 0.6, l));
        col = col * (0.55 + 1.6 * day * eyeLight) + uTeal * crack * 0.75 * breathe * (1.0 - 0.6 * day);
        // the limb: teal haze on the night side, gold where the eye shines past it
        float fr = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 3.0);
        col += mix(uTeal * 0.35, uGold * 0.8, smoothstep(-0.3, 0.4, l)) * fr * smoothstep(5.0, 60.0, alt);
        // on the ground, the far graves sink into a low teal mist (it only exists near the crust)
        col = mix(col, vec3(0.03, 0.09, 0.1), smoothstep(14.0, 60.0, dist) * (1.0 - smoothstep(8.0, 45.0, alt)) * 0.8);
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// The near graves' epitaphs, one atlas row each: "repo #n" and the title.
export function epitaphs() {
  if (typeof document === "undefined") return null;
  const W = 512;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H * DEAD_PRS.length;
  const g = c.getContext("2d");
  DEAD_PRS.forEach(([repo, n, title], i) => {
    const y = i * H;
    g.fillStyle = "#ffffff";
    g.fillRect(0, y, W, H);
    g.fillStyle = "#000000";
    g.textAlign = "center";
    g.font = "bold 44px Georgia, serif";
    g.fillText(`${repo} #${n}`, W / 2, y + 54, W - 24);
    g.font = "26px Georgia, serif";
    g.fillText(title, W / 2, y + 100, W - 24);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export const planetGeometry = () => new IcosahedronGeometry(PLANET_R, 24); // ~12.5k tris: the shader carries the detail
export const quadGeometry = () => new PlaneGeometry(1, 1);
export const rowAttribute = (n) => new InstancedBufferAttribute(new Float32Array(Array.from({ length: n }, (_, i) => i % DEAD_PRS.length)), 1);
export { DEAD_PRS };
