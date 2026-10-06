// pr-highway-3244 WORLD / E6: five grandstand blocks and their crowd (rail frame; layer 1, the crowd animates).
// BLOCKS: 44 m long, 6 tiers, rise 0.7 m, run 1.25 m. Front face at |x| = 20; tier i is a slab x in [20 + 1.25 i, 20 + 1.25 (i+1)],
//   height 0.7 (i+1); back wall at |x| = 27.8, 4.9 m tall; front rail 1 m. Three blocks on the left (+x), two on the right (-x),
//   centred on the finish: z = zFin + {-48, -2, 44} left, zFin + {-25, 21} right. Concrete lit #d8c8b8 / shadow #9a8aa0 (the anime
//   program shades it flat, two tones + ink).
// CROWD: tiers 1..4, a seat every 0.62 m (aisles every 11 m left empty): ~1450 instances, each ONE merged figure
//   (body box, head, two arms; aPart 0 body, 1 head, 2 left arm, 3 right arm). Flat 2-tone cel in the fragment:
//     t = step(0.15, n . L),  L = normalize(S + (0, 0.6, 0))   col = mix(c * (0.55, 0.42, 0.62), c, t)   (violet-shifted shadow)
//   shirts cycle #ffc820 #e23a2e #2f8cff #ff8ab0 (no white: no bloom), skin from the bible ramp.
//   Vertex wave, excite e = 0.62 + 0.38 w, w = pulse around the Ka-chow glint and the line crossing:
//     arm raise  a = e (1.4 + 1.5 (0.5 + 0.5 sin(6.5 t + 40 seed + 1.3 side))) * (0.5 + 0.5 [fract(7 seed) > 0.35])   (some do not wave)
//     rotate the arm about its shoulder (side 0.24, 0.52, 0) by side * a, clamped to 3.1 (straight up = pi)
//     body bob  y += 0.06 e |sin(4.55 t + 40 seed)|
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAL, V, SUN, paintGeo, mergeParts } from "./common.js";

export const BLOCKS = (zFin) => [
  { sd: 1, z: zFin - 48 }, { sd: 1, z: zFin - 2 }, { sd: 1, z: zFin + 44 },
  { sd: -1, z: zFin - 25 }, { sd: -1, z: zFin + 21 },
];

function standGeometry(THREE, blocks) {
  const parts = [], B = (w, h, d, x, y, z, c, s) => parts.push(paintGeo(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c, s));
  for (const b of blocks) {
    for (let i = 0; i < 6; i++) {
      const h = 0.7 * (i + 1);
      B(1.25, h, 44, b.sd * (20 + 1.25 * i + 0.625), h / 2, b.z, i % 2 ? PAL.concrete : "#cdbdb0", PAL.concreteShadow);
    }
    B(0.6, 4.9, 44, b.sd * 27.8, 2.45, b.z, PAL.concreteShadow, "#6c5c7c");
    B(0.18, 1.0, 44, b.sd * 19.7, 0.5, b.z, PAL.rail, "#5a4a6a");
    for (let k = 0; k <= 4; k++) B(0.7, 1.2, 0.18, b.sd * 19.7, 0.6, b.z - 22 + k * 11, PAL.rail, "#5a4a6a"); // rail posts at the aisles
  }
  return mergeParts(parts, "stands");
}

function figureGeometry(THREE) {
  const mk = (g, part) => { const n = g.attributes.position.count; g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1)); return g; };
  return mergeGeometries([
    mk(new THREE.BoxGeometry(0.38, 0.55, 0.28).translate(0, 0.3, 0), 0),
    mk(new THREE.SphereGeometry(0.14, 8, 6).translate(0, 0.72, 0), 1),
    mk(new THREE.BoxGeometry(0.09, 0.4, 0.09).translate(-0.24, 0.32, 0), 2),
    mk(new THREE.BoxGeometry(0.09, 0.4, 0.09).translate(0.24, 0.32, 0), 3),
  ]);
}

const VERT = /* glsl */ `
  attribute float aPart; attribute float aSeed; attribute vec3 aShirt; attribute vec3 aSkin;
  uniform float uTime; uniform float uExcite;
  varying vec3 vC; varying vec3 vN;
  void main() {
    vec3 p = position, n = normal;
    float ph = uTime * 6.5 + aSeed * 40.0;
    if (aPart > 1.5) {
      float sgn = aPart > 2.5 ? 1.0 : -1.0;
      vec3 piv = vec3(sgn * 0.24, 0.52, 0.0);
      float a = uExcite * (1.4 + 1.5 * (0.5 + 0.5 * sin(ph + sgn * 1.3))) * (0.5 + 0.5 * step(0.35, fract(aSeed * 7.0)));
      a = min(a, 3.1);
      float c = cos(sgn * a), s = sin(sgn * a);
      vec3 v = p - piv; v.xy = vec2(v.x * c - v.y * s, v.x * s + v.y * c); p = piv + v;
      n.xy = vec2(n.x * c - n.y * s, n.x * s + n.y * c);
    }
    p.y += 0.06 * uExcite * abs(sin(uTime * 4.55 + aSeed * 40.0));
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
    vC = aPart < 0.5 ? aShirt : aSkin;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRAG = /* glsl */ `
  uniform vec3 uSunW; varying vec3 vC; varying vec3 vN;
  void main() {
    vec3 L = normalize(uSunW + vec3(0.0, 0.6, 0.0));
    float t = step(0.15, dot(normalize(vN), L));
    vec3 col = mix(vC * vec3(0.55, 0.42, 0.62), vC, t);
    gl_FragColor = vec4(min(col, vec3(0.9)), 0.5);
  }`;

export function buildStands(ctx, zFin) {
  const { THREE, engine } = ctx;
  const rng = ctx.rng("stands");
  const blocks = BLOCKS(zFin);
  const group = new THREE.Group();
  const structure = engine.prop(standGeometry(THREE, blocks), 0.5);
  structure.userData.layer = 1;
  group.add(structure);

  // seats
  const seats = [];
  for (const b of blocks) for (let i = 1; i <= 4; i++) {
    for (let z = -21.4; z <= 21.4; z += 0.62) {
      const m = ((z + 22) % 11);
      if (m < 0.8 || rng() < 0.12) continue; // aisle or an empty seat
      seats.push([b.sd * (20 + 1.25 * i + 0.7), 0.7 * (i + 1), b.z + z + (rng() - 0.5) * 0.12, b.sd]);
    }
  }
  const N = seats.length;
  const geo = figureGeometry(THREE).toNonIndexed();
  const seed = new Float32Array(N), shirt = new Float32Array(N * 3), skin = new Float32Array(N * 3);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color();
  const im = new THREE.InstancedMesh(geo, null, N);
  for (let i = 0; i < N; i++) {
    const [x, y, z, sd] = seats[i];
    E.set(0, -sd * Math.PI / 2 + (rng() - 0.5) * 0.4, 0); Q.setFromEuler(E);
    const sc = 0.9 + rng() * 0.25; S.set(sc, sc, sc); P.set(x, y, z);
    M.compose(P, Q, S); im.setMatrixAt(i, M);
    seed[i] = rng();
    C.set(PAL.confetti[Math.floor(rng() * 4)]); if (rng() < 0.3) C.set("#f0e0c0"); C.multiplyScalar(0.9);
    shirt.set([C.r, C.g, C.b], i * 3);
    C.set(PAL.skin[Math.floor(rng() * 3)]); skin.set([C.r, C.g, C.b], i * 3);
  }
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute("aShirt", new THREE.InstancedBufferAttribute(shirt, 3));
  geo.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 3));
  const uniforms = { uTime: { value: 0 }, uExcite: { value: 0.62 }, uSunW: { value: new THREE.Vector3(...SUN) } };
  im.material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  im.frustumCulled = false; im.userData.layer = 1;
  group.add(im);
  return { group, uniforms, dispose() { structure.geometry.dispose(); structure.material.dispose(); geo.dispose(); im.material.dispose(); } };
}
