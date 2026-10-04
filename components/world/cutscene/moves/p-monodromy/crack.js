// THE FOURTH WALL, BROKEN: a crack across the camera's own lens (one quad a metre in front of the camera, no post
// pass): a jagged main line, radial cracks, ring cracks, glass facets, glints on the edges. The main line is THE
// LOOP: it widens into a seam of light, the world folds shut along it (look.js uFold), and it heals from its ends.
// `foldPlane` turns the crack's line on the screen into the plane through the lens that the fold squeezes toward.
// Also the closing ring on the ground (the loop, closed where it began).

import { Mesh, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { Quaternion } from "three";

const Q = new Quaternion();
const A = new Vector3();
const B = new Vector3();

export function crackLens() {
  const m = new ShaderMaterial({
    uniforms: { uAspect: { value: 1.6 }, uGrow: { value: 0 }, uHeal: { value: 0 }, uGap: { value: 0 }, uTime: { value: 0 }, uAng: { value: 1.1 }, uC: { value: { x: 0.1, y: 0.08 } }, uStep: { value: 0 }, uFlash: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uAspect, uGrow, uHeal, uGap, uTime, uAng, uStep, uFlash;
      uniform vec2 uC;
      varying vec2 vUv;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      float jag(float s, float k) { return (vnoise(vec2(s * 9.0, k)) - 0.5) * 0.06 + (vnoise(vec2(s * 33.0, k + 3.0)) - 0.5) * 0.018; }
      // distance to the nearest voronoi edge: the glass facets
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
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) - uC;
        float r = length(p);
        float a = atan(p.y, p.x);
        float reach = uGrow * 1.7;
        // the main line: the loop
        vec2 d = vec2(cos(uAng), sin(uAng));
        vec2 nrm = vec2(-d.y, d.x);
        float s = dot(p, d);
        float t = dot(p, nrm) + jag(s, 1.0);
        float ext = reach * (1.0 - uHeal);
        float vis = 1.0 - smoothstep(ext * 0.92, ext, abs(s));
        float w = mix(0.0042, 0.0012, smoothstep(0.0, 1.4, abs(s))) + uGap * 0.03 * (1.0 - smoothstep(0.0, 1.0, abs(s))) * (1.0 - uHeal);
        float line = (1.0 - smoothstep(w * 0.7, w * 1.5, abs(t))) * vis;
        float halo = (1.0 - smoothstep(w, w * 6.0, abs(t))) * vis;
        // radial cracks
        float rad = 0.0;
        for (int i = 0; i < 9; i++) {
          float fi = float(i);
          float ang = fi * 0.7 + 0.35 * h21(vec2(fi, 3.0));
          float da = atan(sin(a - ang), cos(a - ang));
          float lenK = 0.28 + 0.6 * h21(vec2(fi, 9.0));
          float dist = r * abs(sin(da + jag(r, fi + 5.0) * 1.6));
          float on = step(0.0, cos(da)) * (1.0 - smoothstep(reach * lenK * 0.85, reach * lenK, r));
          rad = max(rad, (1.0 - smoothstep(0.0012, 0.0034, dist)) * on);
        }
        // ring cracks between the radials
        float ring = 0.0;
        for (int j = 0; j < 3; j++) {
          float fj = float(j);
          float R = 0.1 + 0.11 * fj + 0.012 * sin(a * 7.0 + fj * 2.0);
          float sector = step(0.42, h21(vec2(floor(a * 1.6 + fj), fj + 2.0)));
          ring = max(ring, (1.0 - smoothstep(0.001, 0.003, abs(r - R))) * sector * step(R, reach * 0.62));
        }
        float edge = max(max(line, rad), ring);
        // glass facets: faint tints and bright edges near the impact
        vec2 vq = vor(p * 7.0);
        float near = 1.0 - smoothstep(reach * 0.2, reach * 0.62, r);
        float facet = (vq.y - 0.5) * 0.1 * near * step(0.02, uGrow);
        float fedge = (1.0 - smoothstep(0.0, 0.05, vq.x)) * near * 0.28 * step(0.3, uGrow);
        // glints on the edges: a few flash each drawing
        float glint = step(0.955, h21(floor(p * 55.0) + uStep)) * max(edge, halo * 0.6);
        float flare = exp(-r * 11.0) * uFlash;
        vec3 col = mix(vec3(0.62, 0.92, 1.0), vec3(1.0, 0.98, 0.94), line);
        col += vec3(1.0, 0.9, 0.55) * glint;
        col += vec3(0.7, 0.9, 1.0) * fedge;
        // the seam: when it opens, warm light pours out of the loop
        float seam = (1.0 - smoothstep(w * 0.5, w * 1.2, abs(t))) * vis * uGap * (1.0 - uHeal);
        col = mix(col, vec3(1.0, 0.86, 0.5), seam * 0.9);
        float alpha = clamp(edge * 0.95 + halo * 0.18 + abs(facet) * 3.0 + fedge + glint * 0.9 + flare, 0.0, 1.0);
        // a dark hairline shadow beside every crack
        float shadow = (1.0 - smoothstep(w * 1.4, w * 3.2, abs(t))) * vis * 0.28;
        col = mix(vec3(0.05, 0.06, 0.12), col, clamp(edge + glint + fedge + flare + seam, 0.0, 1.0));
        alpha = max(alpha, shadow);
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.renderOrder = 35;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, m };
}

// lay the lens quad a metre in front of the camera, sized to the frustum
export function placeLens(mesh, camera) {
  camera.getWorldDirection(mesh.position);
  mesh.position.add(camera.position);
  mesh.quaternion.copy(camera.quaternion);
  const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.0;
  mesh.scale.set(h * camera.aspect, h, 1);
  // pushed one metre out along the view axis: the position above is camera + direction (1 m)
}

// the crack's line on the screen, as a plane through the lens: its world normal into `n`
export function foldPlane(camera, uC, ang, n) {
  const th = Math.tan((camera.fov * Math.PI) / 360);
  const ray = (X, Y, out) => out.set(2 * X * th, 2 * Y * th, -1);
  ray(uC.x, uC.y, A);
  ray(uC.x + Math.cos(ang) * 0.5, uC.y + Math.sin(ang) * 0.5, B);
  n.crossVectors(A, B).normalize();
  Q.copy(camera.quaternion);
  return n.applyQuaternion(Q);
}

// THE LOOP, CLOSED: a ring on the ground at the pup's feet that draws itself round and meets where it began
export function loopRing() {
  const g = new RingGeometry(1.05, 1.2, 64).rotateX(-Math.PI / 2);
  const m = new ShaderMaterial({
    uniforms: { uClose: { value: 0 }, uFade: { value: 1 } },
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uClose, uFade;
      varying vec2 vP;
      void main() {
        float u = atan(vP.y, vP.x) / 6.2831853 + 0.5;
        if (u > uClose) discard;
        float head = exp(-(uClose - u) * 14.0);
        vec3 col = mix(vec3(0.12, 0.74, 0.72), vec3(1.0, 0.82, 0.35), head);
        gl_FragColor = vec4(pow(col, vec3(2.2)), uFade);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.position.y = 0.04;
  mesh.visible = false;
  mesh.renderOrder = 4;
  return { mesh, m };
}
