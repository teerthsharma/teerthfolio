// JA'FAR, THE STORM COLUMN and BAAL'S SIGIL, ported from components/world/cutscene/moves/p-monodromy/hero.js (the Sinbad
// character is the hero rig, not this file). limb is copied from p-caustic/susanoo.js and faceMesh from ./face.js.
import { AdditiveBlending, BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { faceMesh } from "./face.js";
import { C, merge, part } from "./look.js";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();

function limb(a, b, r1, r2, seg = 6) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}

// a chain of tapered limbs along a curve: p(t) -> [x, y, z], r(t)
function chain(p, r, n, color, k = 0, seg = 7) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p(i / n);
    const b = p((i + 1) / n);
    const g = limb(a, b, r(i / n), r((i + 1) / n), seg);
    out.push(part(g, typeof color === "function" ? color(i / n) : color, k));
    if (i < n - 1) out.push(part(new SphereGeometry(r((i + 1) / n) * 1.02, 7, 5), typeof color === "function" ? color((i + 1) / n) : color, k, [b[0], b[1], b[2]]));
  }
  return out;
}

// THE STORM ROUND THE PUP: a spinning column of cloud and light, and the ground ring it stands in
export function stormColumn() {
  const mkMat = (speed, hue) =>
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uHue: { value: hue } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uTime, uK, uHue;
        varying vec2 vUv;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
        void main() {
          float n = fbm(vec2(vUv.x * 9.0 + uTime * ${speed.toFixed(2)}, vUv.y * 3.0 - uTime * 2.2 + vUv.x * 3.0));
          float band = smoothstep(0.52, 0.74, n);
          float line = 1.0 - smoothstep(0.0, 0.05, abs(n - 0.6));
          float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.85, 0.96, 1.0), line + band * 0.35 * uHue);
          float a = (band * 0.38 + line * 0.9) * fade * uK;
          gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
        }`,
    });
  const a = new Mesh(new CylinderGeometry(0.6, 0.42, 3.2, 28, 1, true), mkMat(2.2, 1));
  const b = new Mesh(new CylinderGeometry(0.75, 0.55, 3.6, 28, 1, true), mkMat(-1.3, 0.4));
  a.position.y = 1.5;
  b.position.y = 1.6;
  const ground = new Mesh(
    new LatheGeometry([new Vector2(0, 0), new Vector2(1.9, 0), new Vector2(2.0, 0.0)], 40),
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: "varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uTime, uK;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float ang = atan(vP.y, vP.x);
          float ring = 1.0 - smoothstep(0.0, 0.05, abs(r - 1.7 - 0.06 * sin(uTime * 5.0)));
          float ring2 = 1.0 - smoothstep(0.0, 0.03, abs(r - 1.2 + 0.05 * sin(ang * 8.0 + uTime * 4.0)));
          float disc = (1.0 - smoothstep(0.0, 1.9, r)) * 0.35;
          vec3 col = vec3(0.35, 0.65, 1.0) * (ring + ring2 * 0.8 + disc) + vec3(0.8, 0.95, 1.0) * ring * 0.4;
          gl_FragColor = vec4(pow(col * uK, vec3(2.2)), 1.0);
        }`,
    }),
  );
  ground.position.y = 0.03;
  const g = new Group();
  g.add(a, b, ground);
  g.visible = false;
  return {
    g,
    tick(t, k) {
      g.visible = k > 0.01;
      for (const m of [a, b]) {
        m.material.uniforms.uTime.value = t;
        m.material.uniforms.uK.value = k;
      }
      ground.material.uniforms.uTime.value = t;
      ground.material.uniforms.uK.value = k;
      a.scale.set(1 + 0.05 * Math.sin(t * 5), 1, 1 + 0.05 * Math.sin(t * 5));
      b.rotation.y = -t * 0.8;
      a.rotation.y = t * 1.4;
    },
    dispose() {
      g.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    },
  };
}

// JA'FAR: a tall white-robed general. Groups for the animation: the arms (shoulder pivots), the sleeves flapping
// off them, the head and the silver ponytail. The face is a drawn plate (cel.js); the panic is in the body.
export function jafar(mat) {
  const root = new Group();
  const body = [];
  const robe = new LatheGeometry([[0.54, 0], [0.5, 0.45], [0.4, 0.95], [0.3, 1.3], [0.24, 1.55], [0.1, 1.64]].map(([r, y]) => new Vector2(r, y)), 14);
  body.push(part(robe, "#f6f2ea", 0));
  body.push(part(new LatheGeometry([[0.42, 0.9], [0.33, 1.0], [0.3, 1.1], [0.38, 1.06]].map(([r, y]) => new Vector2(r, y)), 14), "#14757d", 0)); // the sash
  body.push(part(new BoxGeometry(0.18, 0.5, 0.05), "#14757d", 0, [0, 1.38, 0.27, 0.12, 0, 0]));
  body.push(part(new BoxGeometry(0.1, 0.05, 0.06), C.gold, 2, [0, 1.06, 0.34]));
  body.push(part(new SphereGeometry(0.31, 10, 8), "#f6f2ea", 0, [0, 1.5, 0, 0, 0, 0, 1.15, 0.5, 0.8])); // the shoulders
  const torso = new Mesh(merge(body), mat);
  root.add(torso);
  const head = new Group();
  head.position.set(0, 1.75, 0);
  const headParts = [
    part(new SphereGeometry(0.19, 12, 9), C.skin, 0),
    part(new SphereGeometry(0.205, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.46).rotateX(-0.3), "#e8edf7", 0, [0, 0.01, -0.01]), // the silver hair
    part(new TorusGeometry(0.2, 0.035, 6, 14), "#14757d", 0, [0, 0.08, 0, Math.PI / 2 - 0.25, 0, 0]), // a band
  ];
  head.add(new Mesh(merge(headParts), mat));
  head.add(faceMesh({ eyes: { shape: "round", iris: "#6a7cd8", sclera: "#ffffff" }, brow: { tilt: -0.3, color: "#aab4d8" }, mouth: { kind: "open" }, blush: false }, [0, 0, 0], 0.19)); // the panic: wide eyes, brows up, an open mouth
  const tail = new Group();
  tail.position.set(0, 0.1, -0.19);
  const tp = (t) => [0, -0.08 - 0.95 * t, -0.18 - 0.2 * Math.sin(t * 2.4)];
  tail.add(new Mesh(merge(chain(tp, (t) => 0.09 * (1 - t) + 0.02, 8, "#e8edf7", 0, 6)), mat));
  head.add(tail);
  root.add(head);
  // the sleeves: huge flared cones hanging off each arm, a gold cuff
  const arms = [];
  const sleeves = [];
  for (const s of [-1, 1]) {
    const arm = new Group();
    arm.position.set(s * 0.36, 1.5, 0);
    const sl = new Group();
    const cone = part(new CylinderGeometry(0.1, 0.34, 1.35, 10, 1, true).translate(0, -0.7, 0), "#f6f2ea", 0);
    const cuff = part(new CylinderGeometry(0.34, 0.35, 0.09, 10, 1, true), C.gold, 2, [0, -1.36, 0]);
    const lining = part(new CylinderGeometry(0.1, 0.3, 1.3, 10, 1, true).translate(0, -0.7, 0), "#14757d", 0, [0, 0, 0, 0, 0, 0, 0.9, 1, 0.9]);
    sl.add(new Mesh(merge([cone, cuff, lining]), mat));
    arm.add(sl);
    root.add(arm);
    arms.push(arm);
    sleeves.push(sl);
  }
  root.userData = { head, tail, arms, sleeves };
  return {
    root,
    // k: 0 stern .. 1 panic; cower: 0..1
    tick(t, panic, cower) {
      const w = Math.sin(t * 17);
      const w2 = Math.sin(t * 13 + 1);
      arms[0].rotation.set(0.25 * panic * w2, 0, -(0.3 + panic * (1.9 + 0.5 * w)) + cower * 1.4);
      arms[1].rotation.set(0.25 * panic * w, 0, 0.3 + panic * (1.9 + 0.5 * w2) - cower * 1.4);
      sleeves[0].rotation.set(0.5 * panic * w, 0, 0.3 * panic * w2);
      sleeves[1].rotation.set(0.5 * panic * w2, 0, -0.3 * panic * w);
      head.rotation.set(0.1 * cower, 0.4 * panic * Math.sin(t * 9), 0.15 * panic * Math.sin(t * 11));
      tail.rotation.set(0.5 * panic * Math.sin(t * 12), 0, 0.3 * panic * w);
      root.position.y = Math.max(0, Math.sin(t * 15)) * 0.22 * panic * (1 - cower);
      root.scale.y = 1 - 0.2 * cower;
    },
    dispose() {
      root.traverse((o) => o.isMesh && o.geometry.dispose());
    },
  };
}

// BAAL'S SIGIL: an 8-point star (two squares 45 degrees apart) in an outer circle with 16 ticks, a flat additive
// disc of radius r (m), gold toward the rim and cyan at the points. `tick(t, k)`: k 0..1 unfolds it, it turns 20 deg/s.
// Flat on the floor (`up`) or standing facing +z.
export function sigil(r, up = true) {
  const m = new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vP;
      float sq(vec2 p, float a) { float c = cos(a), s = sin(a); vec2 q = abs(mat2(c, -s, s, c) * p); return 1.0 - smoothstep(0.0, 0.022, abs(max(q.x, q.y) - 0.6)); }
      void main() {
        vec2 p = vP / ${r.toFixed(3)};
        float rr = length(p);
        float ang = atan(p.y, p.x);
        float star = max(sq(p, 0.0), sq(p, 0.7853982));
        float ring = 1.0 - smoothstep(0.0, 0.02, abs(rr - 0.9));
        float ticks = step(0.8, cos(ang * 16.0)) * step(0.92, rr) * step(rr, 0.99);
        float disc = (1.0 - smoothstep(0.0, 0.9, rr)) * 0.12;
        vec3 col = mix(vec3(0.914, 0.698, 0.227), vec3(0.31, 0.89, 1.0), smoothstep(0.35, 0.9, rr)) * 2.5;
        float a = (star + ring + ticks + disc) * smoothstep(uK * 1.02, uK * 1.02 - 0.15, rr) * min(uK * 3.0, 1.0);
        gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(new CircleGeometry(r, 64), m);
  const g = new Group();
  if (up) mesh.rotation.x = -Math.PI / 2;
  g.add(mesh);
  g.visible = false;
  return {
    g,
    tick(t, k) {
      g.visible = k > 0.01;
      m.uniforms.uK.value = k;
      g.rotation.y = up ? (t * 20 * Math.PI) / 180 : 0;
      mesh.rotation.z = up ? 0 : (t * 20 * Math.PI) / 180;
    },
    dispose() {
      mesh.geometry.dispose();
      m.dispose();
    },
  };
}
