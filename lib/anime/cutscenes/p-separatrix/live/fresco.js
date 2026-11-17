
import { CanvasTexture, DoubleSide, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from "three";

export const SUN = new Vector3(0.5, 0.2, -0.84).normalize();
export const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const u = (value) => ({ value });

export const BREAK = { phi: -0.9, half: 0.78 };
export const TIER_H = 3.5;

export const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  vec2 vor(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y);
      vec2 o = vec2(h21(i + g), h21(i + g + 17.3));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = h21(i + g + 5.1); } else if (d < d2) d2 = d;
    }
    return vec2(d2 - d1, id);
  }`;

export function frescoMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: u(0),
      uErase: u(0),
      uGild: u(-1),
      uZero: u(-1),
      uWipeDir: u(new Vector3(0, 0, -1)),
      uZeroDir: u(new Vector3(0, 0, -1)),
      uSun: u(SUN.clone()),
      uArC: u(new Vector2()),
      uAB: u(new Vector2(25, 21)),
      uBay: u(48),
      uBreak: u(new Vector2(BREAK.phi, BREAK.half)),
      uFloorY: u(0),
      uRipple: u(0),
    },
    vertexColors: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vC;
      varying float vK;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 w = modelMatrix * p;
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * n);
        vC = vec3(1.0);
        #ifdef USE_COLOR
          vC = color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC *= instanceColor;
        #endif
        vK = aKind;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uErase, uGild, uZero, uBay, uFloorY, uRipple;
      uniform vec3 uSun, uWipeDir, uZeroDir;
      uniform vec2 uArC, uAB, uBreak;
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vC;
      varying float vK;
      ${NOISE}
      const vec3 PLASTER = vec3(0.93, 0.76, 0.68);
      const vec3 OCHRE = vec3(0.60, 0.21, 0.12);
      const vec3 GOLD = vec3(0.99, 0.80, 0.34);
      const vec3 UMBER = vec3(0.24, 0.14, 0.16);
      const vec3 VIOLET = vec3(0.42, 0.31, 0.60);
      float topAt(float phi) {
        float d = abs(phi - uBreak.x) / uBreak.y;
        float t = d < 0.34 ? 0.0 : d < 0.58 ? 1.0 : d < 0.8 ? 2.0 : d < 1.0 ? 3.0 : 4.0;
        return t * 3.5 - 1.8;
      }
      float wallShade(vec3 p) {
        vec2 q = p.xz - uArC;
        vec2 d = normalize(uSun.xz);
        vec2 qa = q / uAB;
        vec2 da = d / uAB;
        float a = dot(da, da), b = 2.0 * dot(qa, da), c = dot(qa, qa) - 1.0;
        float disc = b * b - 4.0 * a * c;
        if (c > 0.0 || disc < 0.0) return 0.0;
        float s = (-b + sqrt(disc)) / (2.0 * a);
        vec2 hit = (q + d * s) / uAB;
        float phi = atan(hit.y, hit.x);
        float ray = p.y + s * uSun.y / max(length(uSun.xz), 0.001);
        float stands = step(ray, topAt(phi));
        float pier = step(0.265, abs(fract(phi / 6.2831853 * uBay + 0.5) - 0.5));
        return stands * pier;
      }
      vec3 plasterSketch(vec3 p, vec3 n, vec3 v, float edge) {
        vec3 c = PLASTER * (0.94 + 0.1 * fbm(p.xz * 0.9 + p.y * 0.4));
        float hatch = smoothstep(0.78, 0.9, fract(dot(p, vec3(0.9, 1.7, 0.6)) * 1.3)) * step(dot(n, uSun), 0.15);
        float line = max(edge, hatch * 0.55);
        float rim = smoothstep(0.7, 0.95, 1.0 - abs(dot(n, v)));
        return mix(c, OCHRE, clamp(max(line, rim * 0.8) * 0.9, 0.0, 1.0));
      }
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(vW - cameraPosition);
        float k = vK;
        vec3 col;
        float edge = clamp(length(fwidth(n)) * 2.4, 0.0, 1.0);

        if (k > 3.5) {
          if (uZero - acos(clamp(dot(v, uZeroDir), -1.0, 1.0)) > 0.02) discard;
          float lit = step(0.05, dot(n, uSun));
          float rim = pow(1.0 - abs(dot(n, v)), 2.2);
          vec3 base = vC;
          col = base * mix(0.62, 1.0, lit);
          col += vec3(1.0, 0.78, 0.38) * rim * (0.2 + 0.7 * step(0.0, dot(n, uSun) + 0.35)) * 0.8;
          col = mix(col, UMBER, edge * 0.55);
          gl_FragColor = vec4(col, 0.99);
          return;
        }

        float ang = acos(clamp(dot(v, uWipeDir), -1.0, 1.0));
        float gild = uGild - ang;
        float zang = acos(clamp(dot(v, uZeroDir), -1.0, 1.0));
        float zero = uZero - zang;

        vec2 np = k > 0.5 && k < 1.5 ? vec2(atan(v.x, -v.z) * 6.0, v.y * 14.0) : (abs(n.y) > 0.6 ? vW.xz * 0.5 : (abs(n.x) > abs(n.z) ? vec2(vW.z, vW.y) * 0.5 : vec2(vW.x, vW.y) * 0.5));
        float pat = fbm(np * 0.9 + 3.1) * 0.75 + h21(floor(np * 2.2)) * 0.25;
        float er = smoothstep(pat - 0.035, pat + 0.01, uErase * 1.25 - 0.06);
        er *= 1.0 - smoothstep(0.0, 0.05, gild);
        float lift = smoothstep(0.0, 0.05, uErase * 1.25 - 0.06 - pat + 0.07) * (1.0 - er) * (1.0 - smoothstep(0.0, 0.05, gild));

        vec3 base;
        float lit = step(0.08, dot(n, uSun));
        if (k > 0.5 && k < 1.5) {
          float h = v.y;
          float az = atan(v.x, -v.z);
          vec3 low = vec3(0.98, 0.72, 0.33), mid = vec3(0.86, 0.46, 0.55), high = vec3(0.30, 0.19, 0.52);
          base = mix(low, mid, smoothstep(0.0, 0.2, h));
          base = mix(base, high, smoothstep(0.16, 0.8, h));
          float stroke = fbm(vec2(az * 2.2, h * 46.0 + fbm(vec2(az * 3.0, h * 5.0)) * 4.0));
          base *= 0.9 + 0.2 * stroke;
          float cloud = smoothstep(0.58, 0.72, fbm(vec2(az * 3.4 + 7.0, h * 9.0)));
          base = mix(base, mix(vec3(0.96, 0.62, 0.52), vec3(0.62, 0.36, 0.62), smoothstep(0.1, 0.5, h)), cloud * 0.55 * smoothstep(0.02, 0.1, h));
          float sd = 1.0 - dot(v, normalize(uSun));
          base = mix(base, vec3(1.0, 0.86, 0.45), exp(-sd * 24.0) * 0.55);
          base = mix(base, vec3(1.0, 0.93, 0.62), 1.0 - smoothstep(0.0012, 0.0016, sd));
          lit = 1.0;
        } else if (k > 1.5 && k < 2.5) {
          vec2 q = vW.xz - uArC;
          base = vC * (0.92 + 0.14 * fbm(vW.xz * 0.35));
          float u = abs(q.x);
          float along = 1.0 - smoothstep(10.2, 11.2, abs(q.y + 0.0));
          base = mix(base, vec3(1.0, 0.72, 0.62), (1.0 - smoothstep(0.78, 0.84, u)) * 0.62 * along);
          base = mix(base, vec3(1.0, 0.40, 0.33), 1.0 - smoothstep(0.2, 0.25, u + 0.04 * sin(q.y * 1.7)));
          lit = 1.0;
        } else if (k > 2.5) {
          base = vC * (0.9 + 0.2 * fbm(vW.xz * 0.12));
        } else {
          base = vC;
        }
        float mott = fbm(vW.xz * 0.11 + vW.y * 0.17 + 4.0);
        base *= 0.86 + 0.26 * mott;
        base = mix(base, base * vec3(1.06, 0.92, 0.94), smoothstep(0.55, 0.8, mott) * 0.6);
        vec2 cp = (k > 0.5 && k < 1.5) ? vec2(atan(v.x, -v.z) * 38.0, v.y * 38.0) : np * (k > 1.5 && k < 2.5 ? 2.6 : 3.4);
        vec2 cr = vor(cp);
        float crack = 1.0 - smoothstep(0.012, 0.045, cr.x);
        base *= 1.0 - 0.2 * crack;
        float sh = 1.0 - lit;
        if (k < 0.5 || (k > 1.5 && k < 2.5)) {
          float castS = wallShade(vW) * step(0.02, dot(n, uSun) + 0.35);
          sh = max(sh, castS);
        }
        float deep = (1.0 - smoothstep(-2.4, -0.4, vW.y - uFloorY)) * step(k, 0.5);
        vec3 shade = mix(vec3(1.0), vec3(0.52, 0.40, 0.66), sh);
        shade = mix(shade, vec3(0.36, 0.26, 0.55), deep);
        col = base * shade;
        col += vec3(1.0, 0.86, 0.5) * (1.0 - sh) * 0.06 * step(k, 0.5);
        col = mix(col, UMBER, edge * (k > 0.5 && k < 1.5 ? 0.0 : 0.5));
        col = mix(col, col * 0.82, smoothstep(0.78, 0.98, 1.0 - abs(dot(n, v))) * step(k, 0.5));

        vec3 sketch = plasterSketch(vW, n, v, edge);
        if (k > 0.5 && k < 1.5) {
          float iso = abs(fract(fbm(vec2(atan(v.x, -v.z) * 3.0, v.y * 7.0)) * 7.0) - 0.5);
          sketch = mix(PLASTER * (0.95 + 0.08 * fbm(vec2(v.x, v.y) * 30.0)), OCHRE, (1.0 - smoothstep(0.02, 0.07, iso)) * 0.85 + (1.0 - smoothstep(0.0, 0.006, abs(v.y))) * 0.9);
        }
        col = mix(col, sketch, er);
        col = mix(col, vec3(1.0, 0.9, 0.78), lift * 0.55 * (1.0 - er));
        float band = 1.0 - smoothstep(0.0, 0.035, abs(gild - 0.012));
        col = mix(col, GOLD, band * step(0.001, uGild + 0.01) * (1.0 - step(2.0, uGild)) * 0.95);
        float zt = smoothstep(-0.01, 0.06, zero);
        col = mix(col, PLASTER * 1.02, zt);
        float zb = 1.0 - smoothstep(0.0, 0.05, abs(zero - 0.01));
        col = mix(col, GOLD, zb * step(0.001, uZero + 0.01) * (1.0 - step(2.0, uZero)) * 0.9);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 0.99);
      }`,
  });
}

let MATCAP = null;
export function matcap() {
  if (MATCAP) return MATCAP;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(50, 42, 4, 64, 64, 66);
  r.addColorStop(0, "#fff6c4");
  r.addColorStop(0.18, "#ffdf7c");
  r.addColorStop(0.48, "#e9ac30");
  r.addColorStop(0.78, "#a8690f");
  r.addColorStop(1, "#5e3608");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  g.globalAlpha = 0.18;
  g.fillStyle = "#fff0b0";
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(64, 64, 62 - i * 9, 20 + i * 8, -0.7, 0, Math.PI * 2);
    g.lineWidth = 3;
    g.strokeStyle = i % 2 ? "#fff0b0" : "#6b3f08";
    g.stroke();
  }
  MATCAP = new CanvasTexture(c);
  MATCAP.colorSpace = SRGBColorSpace;
  return MATCAP;
}

export function goldMaterial({ dots = true, zero = null } = {}) {
  return new ShaderMaterial({
    uniforms: { uMat: u(matcap()), uDot: u(7), uDim: u(1), uTime: u(0), uDots: u(dots ? 1 : 0), uZero: zero?.uZero ?? u(-1), uZeroDir: zero?.uZeroDir ?? u(new Vector3(0, 0, -1)) },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWp;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vWp = (modelMatrix * p).xyz;
        vec4 mv = modelViewMatrix * p;
        vV = -mv.xyz;
        vN = normalize(normalMatrix * n);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMat;
      uniform float uDot, uDim, uTime, uDots, uZero;
      uniform vec3 uZeroDir;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWp;
      void main() {
        if (uZero - acos(clamp(dot(normalize(vWp - cameraPosition), uZeroDir), -1.0, 1.0)) > 0.02) discard;
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(vV);
        vec3 c = texture2D(uMat, n.xy * 0.5 + 0.5).rgb;
        float rim = 1.0 - abs(dot(n, v));
        vec2 f = fract(gl_FragCoord.xy / uDot) - 0.5;
        float dotm = (1.0 - smoothstep(0.2, 0.3, length(f))) * smoothstep(0.5, 0.72, rim) * uDots;
        c = mix(c, vec3(0.30, 0.17, 0.05), dotm * 0.85);
        c = mix(c, vec3(0.55, 0.38, 0.2), (1.0 - uDim) * 0.6);
        gl_FragColor = vec4(c, 0.99);
      }`,
  });
}

