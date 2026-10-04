// THE HERO, in the dimension's print: the real 3D pup keeps its shape and its
// own colours, but its surfaces are printed (its coat separated into dots,
// a black-dot shadow, a thick ink line round every silhouette), plus two
// pieces of All Might: a cape that billows out behind it, and a hair-tuft V of
// light over the forehead (a long thin pair of rays, never an ear). Shape and
// colour only.

import { Box3, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { PRINT, SH, sr, u } from "./print";

const SHADE_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vCol;
  ${PRINT}
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    vec3 base = uBase * vCol;
    vec4 t = cmykOf(base);
    float nl = dot(n, normalize(vec3(-0.45, 0.75, 0.5)));
    float shade = 1.0 - smoothstep(-0.1, 0.25, nl);
    t.w += (1.0 - t.w) * shade * 0.32;
    t.w += (1.0 - t.w) * (1.0 - smoothstep(-0.6, -0.3, nl)) * 0.2;
    float lite = uSun * (1.0 - shade);
    t.z += 0.14 * lite * (1.0 - t.z);
    float rim = 1.0 - max(dot(n, v), 0.0);
    float ink = smoothstep(0.8, 0.88, rim);
    vec3 col = mix(inkPrint(t), INK_K, ink);
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), uOpacity);
  }`;

function printed(m) {
  return new ShaderMaterial({
    uniforms: { uCell: SH.uCell, uSun: SH.uSun, uBase: u(sr("#ffffff")), uOpacity: u(m.opacity ?? 1) },
    vertexColors: Boolean(m.vertexColors),
    transparent: m.transparent,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uSun;\n${SHADE_FRAG}`,
  });
}

// The pup's printed twin for each of its materials, swapped in and out.
export function pupPrint(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = printed(m);
      p.uniforms.uBase.value.copy(sr("#" + (m.color ?? new Color(1, 1, 1)).getHexString()));
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}

// ---- the cape ----
export function cape(body) {
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const g = new PlaneGeometry(1, 1, 8, 10);
  const m = new ShaderMaterial({
    uniforms: { uCell: SH.uCell, uTime: SH.uTime, uSun: SH.uSun, uPal: SH.uPal, uWind: u(0.2), uBillow: u(0), uAt: u(new Vector3(c.x, c.y + s.y * 0.36, c.z + s.z * 0.24)), uW: u(s.x * 0.62) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime, uWind, uBillow, uW;
      uniform vec3 uAt;
      varying vec2 vUv2;
      varying vec3 vW;
      void main() {
        vUv2 = uv;
        float x = uv.x - 0.5;
        float v = 1.0 - uv.y;
        vec3 dir = normalize(mix(vec3(0.0, -0.55, -1.0), vec3(0.15, 0.75, -0.7), uBillow));
        float wid = uW * (1.0 + v * (0.7 + 4.0 * uBillow));
        vec3 pos = vec3(x * wid, 0.0, 0.0) + dir * (1.7 * v) + uAt;
        float ph = uTime * (3.0 + 7.0 * uWind) - v * 6.0 + x * 3.0;
        pos.x += sin(ph) * 0.09 * v * (0.4 + uWind);
        pos.z += sin(ph * 1.3 + 1.3) * 0.22 * v * (0.3 + 1.6 * uWind);
        pos.y += cos(ph * 0.9) * 0.1 * v * uWind;
        pos.x += x * v * uWind * 0.9;
        vec4 w = modelViewMatrix * vec4(pos, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv2;
      varying vec3 vW;
      ${PRINT}
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec4 t = uPal[14];
        float v = 1.0 - vUv2.y;
        float fold = 0.5 + 0.5 * sin(vUv2.x * 19.0 + sin(uTime * 2.0 + v * 4.0) * 0.5);
        t.w += step(0.66, fold) * 0.4 * (1.0 - t.w);
        t.w += (1.0 - smoothstep(0.0, 0.5, n.z * (gl_FrontFacing ? 1.0 : -1.0) + 0.3)) * 0.2;
        // a gold hem
        t = mix(t, uPal[15], step(0.86, v) * step(v, 0.92));
        t = mix(t, uPal[17], step(0.93, v));
        float edge = min(min(vUv2.x, 1.0 - vUv2.x), vUv2.y);
        float ink = 1.0 - smoothstep(0.0, 0.025, edge);
        ink = max(ink, 1.0 - smoothstep(0.0, 0.012, abs(v - 0.93)));
        vec3 col = mix(inkPrint(t), INK_K, ink);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, m, g };
}

// ---- the hair-tuft V: two long thin rays of light from the hairline ----
export function vAura() {
  const g = new BufferGeometry();
  const L = 1.25;
  // a ray: a thin tapered blade from the origin up the +y axis
  const ray = (ang, len, w) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const P = (x, y) => [x * c - y * s, x * s + y * c, 0];
    return [...P(-w, 0), ...P(w, 0), ...P(0, len)];
  };
  const pos = [...ray(0.3, L, 0.05), ...ray(-0.3, L, 0.05), ...ray(0.62, L * 0.6, 0.035), ...ray(-0.62, L * 0.6, 0.035)];
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const uvs = [];
  for (let i = 0; i < 4; i++) uvs.push(0, 0, 1, 0, 0.5, 1);
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  const m = new ShaderMaterial({
    uniforms: { uCell: SH.uCell, uTime: SH.uTime, uK: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv2;
      void main() {
        vUv2 = uv;
        vec3 p = position * (0.15 + 0.85 * uK);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv2;
      ${PRINT}
      void main() {
        float edge = 1.0 - abs(vUv2.x * 2.0 - 1.0) * (1.0 - vUv2.y * 0.2); // 1 on the spine
        float tone = clamp(edge * 1.2 - vUv2.y * 0.25, 0.0, 1.0);
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.0, tone, 0.0), cv);
        col = mix(col, vec3(1.0), smoothstep(0.55, 0.8, edge) * 0.9);
        float a = max(cv, smoothstep(0.55, 0.8, edge)) * uK;
        if (a < 0.02) discard;
        gl_FragColor = vec4(pow(col, vec3(2.2)), a);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, m, g };
}
