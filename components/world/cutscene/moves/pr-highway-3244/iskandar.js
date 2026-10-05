// ISKANDAR, the King of Conquerors, seated at the front of the Gordius Wheel: a giant red-bearded king, broad, in
// bronze armour under a fur collar, the reins in his left fist, his sword in his right. A figure, not a pup: hero
// rules (Genshin test): the silhouette carries the read (build, beard, mane, the cape in car.js), a painted ramp
// (shadow is a crimson-violet hue, not albedo * 0.2), a sun rim and a lightning-blue counter-rim, an ink hull.
// No copied face: two dark eyes, a nose, a laughing mouth in the beard.
// One merged geometry; aPart picks the bone (0 body, 1 head, 2 sword arm), posed by two uniform matrices.
// Cost: two draws (the fill and the ink hull), ~6k triangles. Frame: the chariot's (faces +x, y up, z the flank).

import { BackSide, BufferAttribute, CylinderGeometry, Matrix4, Mesh, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, BoxGeometry, ConeGeometry, Vector3 } from "three";
import { KEY_U, SKY, SUN_U, at, merge, paint } from "./shade";

const SKIN = "#eab48a";
const RED = "#d8301c"; // the beard and the mane
const BRONZE = "#c98a34";
const GOLD = "#ffcf3a";
const TUNIC = "#b0122a";
const FUR = "#f4ead6";
const INK = "#1a0e16";

export const NECK = [-0.95, 2.62, 0]; // the head's pivot
export const SHOULDER_R = [-0.98, 2.4, 0.8]; // the sword arm's pivot
export const SEAT = [-0.98, 2.74, -0.86]; // the pup's seat: on top of his left pauldron, outboard of the beard
const SWORD_TIP = new Vector3(0.05, 0.86, 0.5); // the rest pose's blade tip (the fist on the knee, the blade down the shin)
const HEAD_AT = [-0.95, 2.5, 0]; // the head is authored about this point, then set on the neck

const Y = new Vector3(0, 1, 0);
const tag = (g, part) => g.setAttribute("aPart", new BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1));
// a limb: a tapered cylinder from a to b, a ball at each end
function limb(L, a, b, r0, r1, hex, gloss = 0.2, part = 0) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const d = B.clone().sub(A);
  const m = new Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(Y, d.clone().normalize()), new Vector3(1, 1, 1));
  L.push(tag(paint(new CylinderGeometry(r1, r0, d.length(), 12, 1, true), hex, { gloss, smooth: true, m4: m }), part));
  L.push(tag(paint(new SphereGeometry(r0, 12, 8), hex, { gloss, smooth: true, m4: at(...a) }), part));
  L.push(tag(paint(new SphereGeometry(r1, 12, 8), hex, { gloss, smooth: true, m4: at(...b) }), part));
}
// a muscle: an ellipsoid stretched from a to b, `r` thick (a bicep, a forearm, a thigh), swollen toward `bulge`
function lobe(L, hex, a, b, r, part = 0, gloss = 0.2, bulge = 1) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const d = B.clone().sub(A);
  const m = new Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(Y, d.clone().normalize()), new Vector3(r * bulge, d.length() * 0.62, r));
  L.push(tag(paint(new SphereGeometry(1, 16, 12), hex, { gloss, smooth: true, m4: m }), part));
}
const ball = (L, hex, p, s, gloss = 0.2, part = 0, seg = [16, 12], r = [0, 0, 0]) => L.push(tag(paint(new SphereGeometry(1, seg[0], seg[1]), hex, { gloss, smooth: true, m4: at(...p, ...r, s) }), part));

// an arm: deltoid, bicep, a bronze-bracered forearm, the fist
function arm(L, sh, elbow, hand, side, part) {
  ball(L, SKIN, [sh[0] + 0.02, sh[1] - 0.12, sh[2] + side * 0.06], [0.24, 0.27, 0.22], 0.2, part);
  lobe(L, SKIN, sh, elbow, 0.22, part, 0.2, 1.15);
  lobe(L, BRONZE, elbow, hand, 0.18, part, 0.9);
  ball(L, SKIN, hand, 0.16, 0.2, part);
}

export function iskandarGeometry() {
  let L = [];
  // the throne he sits on, at the back of the car
  L.push(tag(paint(new BoxGeometry(0.5, 0.45, 1.1), BRONZE, { gloss: 0.8, m4: at(-1.3, 0.85, 0) }), 0));
  L.push(tag(paint(new BoxGeometry(0.12, 0.8, 1.1), GOLD, { gloss: 1, m4: at(-1.58, 1.35, 0) }), 0));
  // hips, a crimson kilt
  ball(L, TUNIC, [-1.0, 1.2, 0], [0.4, 0.26, 0.56]);
  // legs: heavy thighs forward to the knees, greaves down to boots on the floor
  for (const s of [-1, 1]) {
    lobe(L, TUNIC, [-1.05, 1.2, s * 0.28], [-0.36, 1.26, s * 0.34], 0.24);
    lobe(L, BRONZE, [-0.38, 1.28, s * 0.34], [-0.3, 0.72, s * 0.35], 0.17, 0, 0.9);
    ball(L, "#5a2a1a", [-0.22, 0.69, s * 0.35], [0.2, 0.09, 0.13]);
  }
  // THE BARREL CHEST: a bronze cuirass sculpted with pecs and abs, a gold rim at the waist, a sun boss
  ball(L, BRONZE, [-0.97, 2.0, 0], [0.5, 0.64, 0.7], 1, 0, [22, 16]);
  for (const s of [-1, 1]) ball(L, BRONZE, [-0.6, 2.2, s * 0.26], [0.2, 0.21, 0.27], 1, 0, [16, 12], [0, 0, -0.25]);
  for (const y of [1.6, 1.76, 1.92]) for (const s of [-1, 1]) ball(L, BRONZE, [-0.53 - (1.92 - y) * 0.12, y, s * 0.11], [0.08, 0.07, 0.095], 1);
  L.push(tag(paint(new TorusGeometry(0.5, 0.05, 6, 24).rotateX(Math.PI / 2).scale(0.92, 1, 1.25), GOLD, { gloss: 1, smooth: true, m4: at(-0.97, 1.48, 0) }), 0));
  ball(L, GOLD, [-0.43, 2.0, 0], [0.04, 0.1, 0.1], 1);
  // traps to huge shoulders: gold pauldrons over the deltoids, and the fur collar the cloak hangs from
  for (const s of [-1, 1]) {
    ball(L, BRONZE, [-1.0, 2.52, s * 0.4], [0.28, 0.17, 0.32], 1);
    ball(L, GOLD, [SHOULDER_R[0], 2.52, s * 0.8], [0.34, 0.22, 0.33], 1, 0, [18, 12], [s * 0.35, 0, 0]);
  }
  L.push(tag(paint(new TorusGeometry(0.42, 0.14, 8, 22).rotateX(Math.PI / 2), FUR, { gloss: 0.1, smooth: true, m4: at(-1.02, 2.6, 0) }), 0));
  limb(L, [-0.98, 2.45, 0], NECK, 0.22, 0.2, SKIN);
  // the left arm, the reins in its fist
  const handL = [0.0, 2.0, -0.66];
  arm(L, [SHOULDER_R[0], 2.38, -0.86], [-0.55, 2.02, -1.0], handL, -1, 0);
  for (const s of [-1, 1]) limb(L, handL, [1.75, 1.45, s * 0.62], 0.014, 0.014, "#ffd84a", 0.8);
  // THE HEAD (part 1): a broad face framed by the wild red mane and the great beard, a laughing grin
  const H = 1;
  const L0 = L;
  L = [];
  ball(L, SKIN, [-0.9, 2.74, 0], [0.21, 0.24, 0.2], 0.2, H);
  ball(L, RED, [-1.03, 2.84, 0], [0.25, 0.25, 0.27], 0.3, H);
  for (let i = 0; i < 7; i++) {
    const z = (i - 3) * 0.09;
    L.push(tag(paint(new ConeGeometry(0.1, 0.5, 8), RED, { gloss: 0.3, smooth: true, m4: at(-1.24, 2.88 - 0.04 * Math.abs(i - 3), z, z * 1.6, 0, 1.7 + 0.1 * Math.abs(i - 3)) }), H));
  }
  for (const s of [-1, 1]) {
    ball(L, RED, [-0.96, 2.78, s * 0.22], [0.17, 0.24, 0.12], 0.3, H); // the mane, framing the face
    ball(L, RED, [-0.85, 2.6, s * 0.17], [0.15, 0.19, 0.11], 0.3, H); // the beard up the cheeks
  }
  ball(L, RED, [-0.82, 2.53, 0], [0.22, 0.25, 0.25], 0.3, H);
  L.push(tag(paint(new ConeGeometry(0.2, 0.5, 10), RED, { gloss: 0.3, smooth: true, m4: at(-0.79, 2.3, 0, 0, 0, Math.PI + 0.3) }), H));
  ball(L, INK, [-0.66, 2.6, 0], [0.045, 0.055, 0.12], 0, H); // the laughing mouth
  ball(L, "#fff8ec", [-0.635, 2.625, 0], [0.02, 0.016, 0.09], 0.4, H); // the grin's teeth
  ball(L, RED, [-0.68, 2.67, 0], [0.05, 0.035, 0.15], 0.3, H); // the moustache
  ball(L, SKIN, [-0.68, 2.73, 0], [0.06, 0.055, 0.05], 0.2, H); // nose
  for (const s of [-1, 1]) {
    ball(L, INK, [-0.71, 2.79, s * 0.08], [0.02, 0.025, 0.03], 0, H);
    ball(L, RED, [-0.7, 2.83, s * 0.085], [0.03, 0.022, 0.07], 0.3, H, [8, 6], [s * 0.3, 0, 0]); // brows
  }
  // the head is the king's read: a size up, set on the neck
  const hs = 1.4;
  L0.push(merge(L).translate(-HEAD_AT[0], -HEAD_AT[1], -HEAD_AT[2]).scale(hs, hs, hs).translate(NECK[0], NECK[1] - 0.04, NECK[2]));
  L = L0;
  // THE SWORD ARM (part 2), at rest: the fist on the right knee, the blade down the shin
  const A = 2;
  const handR = [-0.38, 1.52, 0.7];
  arm(L, SHOULDER_R, [-0.74, 1.88, 0.98], handR, 1, A);
  limb(L, [-0.44, 1.6, 0.71], [-0.32, 1.44, 0.69], 0.05, 0.05, GOLD, 1, A); // the hilt
  L.push(tag(paint(new BoxGeometry(0.07, 0.05, 0.36), GOLD, { gloss: 1, m4: at(...handR) }), A)); // the guard
  limb(L, handR, SWORD_TIP.toArray(), 0.06, 0.014, "#eef6ff", 1, A); // the Kupriotes blade
  return merge(L);
}

// the sword arm's pose: lift (0 rest, 1 the blade raised up and forward); writes the matrix, returns the blade tip
const P = new Vector3();
const M1 = new Matrix4();
export function poseArm(m, lift) {
  P.set(...SHOULDER_R);
  m.makeTranslation(P.x, P.y, P.z).multiply(M1.makeRotationZ(2.35 * lift)).multiply(M1.makeRotationX(-0.25 * lift)).multiply(M1.makeTranslation(-P.x, -P.y, -P.z));
  return SWORD_TIP.clone().applyMatrix4(m);
}
// the head: a laugh tips it back (k 0..1), a chuckle shakes it
export function poseHead(m, k, shake) {
  P.set(...NECK);
  m.makeTranslation(P.x, P.y, P.z).multiply(M1.makeRotationZ(0.42 * k + shake)).multiply(M1.makeTranslation(-P.x, -P.y, -P.z));
}

const VERT = /* glsl */ `
  attribute vec3 aCol; attribute vec2 aMat; attribute float aPart;
  uniform mat4 uHead; uniform mat4 uArm; uniform float uInk;
  varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec2 vMat;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    if (aPart > 1.5) { p = uArm * p; n = mat3(uArm) * n; }
    else if (aPart > 0.5) { p = uHead * p; n = mat3(uHead) * n; }
    #ifdef INK
      float dc = length(cameraPosition - (modelMatrix * p).xyz);
      p.xyz += normalize(n) * uInk * clamp(dc / 9.0, 0.7, 4.0);
    #endif
    vec4 w = modelMatrix * p;
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vCol = aCol; vMat = aMat;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uKey;
  varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec2 vMat;
  ${SKY}
  void main() {
    vec3 n = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float ndl = dot(n, uKey);
    // the ramp: three painted bands, the shadow a crimson-violet hue
    float lit = smoothstep(-0.05, 0.03, ndl);
    float top = smoothstep(0.55, 0.6, ndl);
    vec3 c = mix(vCol * vec3(0.46, 0.27, 0.5), vCol * vec3(1.04, 0.9, 0.78), lit) + vCol * vec3(0.2, 0.14, 0.06) * top;
    // the metal: one hard gold glint
    float nh = max(dot(n, normalize(uKey + V)), 0.0);
    c += vec3(1.0, 0.88, 0.55) * step(0.94, nh) * vMat.y * 0.9;
    // rims: the sunset on the sun side, lightning blue on the other
    vec3 sunH = normalize(uSun * vec3(1.0, 0.0, 1.0) + vec3(0.0, 0.2, 0.0));
    float rim = smoothstep(0.58, 0.66, 1.0 - max(dot(n, V), 0.0));
    float sunSide = dot(n, sunH) * 0.5 + 0.5;
    c += rim * (vec3(1.0, 0.62, 0.25) * sunSide * 0.85 + vec3(0.25, 0.55, 1.0) * (1.0 - sunSide) * 0.7);
    float d = length(cameraPosition - vW);
    c = mix(c, hazeCol(-V), clamp(1.0 - exp(-d * 0.0042), 0.0, 1.0));
    gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
  }`;

export function iskandarMeshes(geometry) {
  const uniforms = { uKey: KEY_U, uSun: SUN_U, uHead: { value: new Matrix4() }, uArm: { value: new Matrix4() }, uInk: { value: 0.022 } };
  const fill = new Mesh(geometry, new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG }));
  const ink = new Mesh(geometry, new ShaderMaterial({
    uniforms,
    defines: { INK: 1 },
    side: BackSide,
    vertexShader: VERT,
    fragmentShader: `uniform vec3 uKey; varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec2 vMat; void main(){ gl_FragColor = vec4(${[0.1, 0.055, 0.086].map((v) => v.toFixed(3)).join(", ")}, 1.0); }`,
  }));
  fill.frustumCulled = ink.frustumCulled = false;
  return { fill, ink, uniforms };
}
