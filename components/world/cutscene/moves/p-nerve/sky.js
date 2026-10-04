// THE SKY: a low ceiling of heavy cloud lit from beneath by the city (a shard-ready dome, painted in the
// shader), and, once, above Ryuk, a gap that parts in the cloud and shows the SHINIGAMI REALM through it: a grey ash
// plain strewn with bones and a dead tree with a few red apples, seen upside-down as if from below. Then the cloud
// closes. The realm is modelled geometry; the gap is a ring of cloud puffs sliding open and shut. Rig frame.

import { ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, InstancedMesh, Mesh, Object3D, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { U, VERT, ball, box, hash, limb, lit, merge, prep, sm, tint } from "./look";
import { T } from "./timeline";

export const SKY_R = 140;
export const REALM_AT = new Vector3(8.5, 21.5, -104);
const D = new Object3D();

const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;

export function skyDome() {
  const g = prep(new IcosahedronGeometry(1, 3));
  const m = new ShaderMaterial({
    uniforms: { ...U, uInside: { value: 0 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${VERT}
      void main() {
        vec3 w, n;
        tenePos(w, n);
        vN = n;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uOrigin;
      uniform float uTime, uInside, uBreak, uCrack;
      varying vec3 vP0;
      varying vec3 vN;
      varying vec3 vBary;
      varying float vR;
      ${NOISE}
      void main() {
        vec3 camL = cameraPosition - uOrigin;
        vec3 v = normalize(vP0 - camL);
        float el = v.y;
        float az = atan(v.x, -v.z);
        float broad = fbm(vec2(az * 2.1 + uTime * 0.012, el * 6.0));
        float bands = fbm(vec2(az * 1.2, el * 24.0 + broad * 2.4));
        float dens = smoothstep(0.28, 0.72, broad * 0.65 + bands * 0.45);
        // the city's light under the ceiling: ochre at the horizon, thinning upward, brightest where the cloud is thin
        float glow = exp(-max(el, 0.0) * 7.5);
        vec3 under = vec3(0.64, 0.35, 0.14);
        vec3 teal = vec3(0.060, 0.100, 0.112);
        vec3 umber = vec3(0.028, 0.021, 0.019);
        vec3 c = mix(umber, teal, smoothstep(0.02, 0.45, el) * 0.5 + 0.18);
        c = mix(c, vec3(0.05, 0.075, 0.085), dens * smoothstep(0.1, 0.5, el) * 0.8);
        // the lit underside of the low cloud: warm streaks along the bottom of each billow
        float edge = smoothstep(0.35, 0.62, bands) * (1.0 - smoothstep(0.62, 0.9, bands));
        c += under * glow * (0.42 + 0.5 * (1.0 - dens) + 0.35 * edge);
        c += under * 0.45 * (1.0 - smoothstep(-0.10, 0.0, el)) * (0.55 + 0.45 * bands);
        c = mix(c, umber * 0.7, (1.0 - smoothstep(-0.55, -0.12, el)));
        float alpha = 1.0;
        if (gl_FrontFacing && uInside < 0.5) {
          // seen from outside while it swells: a bubble of umber with an ochre skin
          float f = pow(max(1.0 - abs(dot(normalize(vN), normalize(vP0 - camL))), 0.0), 2.0);
          c += f * vec3(0.55, 0.30, 0.12) * 0.7;
          alpha = mix(0.35, 1.0, f);
        }
        float web = 1.0 - smoothstep(0.012, 0.03, min(vBary.x, min(vBary.y, vBary.z)));
        c = mix(c, vec3(1.0, 0.93, 0.78), web * smoothstep(0.0, 1.0, uCrack / 60.0) * 0.55);
        if (uBreak > 0.0) alpha *= 0.55 * (1.0 - smoothstep(1.0, 1.5, uBreak + 0.3 * vR));
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// THE REALM: built right-way-up in its own frame (the plain at y 0), hung upside-down in the sky
function realmGeometry() {
  const plain = [];
  // the plain: a ragged disc and the rock under it
  const top = new CylinderGeometry(13, 11.5, 1.6, 16, 2);
  const p = top.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    if (r > 6) p.setXYZ(i, p.getX(i) * (0.88 + 0.2 * hash(i, 1)), p.getY(i) + (p.getY(i) > 0 ? (hash(i, 2) - 0.5) * 0.5 : 0), p.getZ(i) * (0.88 + 0.2 * hash(i, 3)));
  }
  plain.push(tint(top.translate(0, -0.8, 0), "#a8a291"));
  plain.push(tint(new ConeGeometry(11, 9, 11).rotateX(Math.PI).translate(0, -6.1, 0), "#6f6a5e"));
  // bones: long bones with knuckled ends, a few skulls, rib arcs, scattered over the plain
  const bones = [];
  for (let i = 0; i < 26; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const r = 2 + 9.5 * Math.sqrt(hash(i, 2));
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (x < -1.5 && x > -5 && Math.abs(z) < 2.5) continue; // the tree's foot
    const len = 1.6 + 2.4 * hash(i, 3);
    const yaw = hash(i, 4) * Math.PI;
    const dx = Math.cos(yaw) * len * 0.5;
    const dz = Math.sin(yaw) * len * 0.5;
    const tip = (hash(i, 5) - 0.5) * 0.5;
    bones.push(limb([x - dx, 0.12, z - dz], [x + dx, 0.12 + Math.abs(tip), z + dz], 0.16, 0.16, 5));
    bones.push(ball(0.28, x - dx, 0.14, z - dz, 1, 0.8, 1, 6, 4), ball(0.28, x + dx, 0.14 + Math.abs(tip), z + dz, 1, 0.8, 1, 6, 4));
  }
  for (const [sx, sz] of [[4.5, 3.5], [-7.5, -4], [7.8, -5.5]]) {
    bones.push(ball(0.62, sx, 0.55, sz, 1, 0.9, 1.1, 8, 6), box(0.5, 0.3, 0.6, sx, 0.2, sz + 0.5)); // a skull and its jaw
  }
  for (const [rx, rz] of [[1.5, -6.5], [-3.5, 7.5]]) {
    for (let k = 0; k < 5; k++) bones.push(new TorusGeometry(1.1 - k * 0.1, 0.07, 4, 10, Math.PI).rotateZ(0).translate(rx, 0.02, rz + k * 0.5));
  }
  const boneG = merge(bones.map((b) => tint(b, "#e6dfce")));
  // the dead tree: a trunk, branches, twigs
  const tree = [];
  tree.push(limb([-3.2, -0.2, 0], [-3.6, 8.5, 0.3], 0.62, 0.2, 7));
  const branches = [];
  for (let i = 0; i < 8; i++) {
    const h = 3 + i * 0.75;
    const side = i % 2 ? 1 : -1;
    const a = hash(i, 9) * 0.8 - 0.4;
    const bx = -3.3 - 0.04 * h;
    const ex = bx + side * (2.2 + 1.2 * hash(i, 2));
    const ey = h + 1.6 + hash(i, 3);
    tree.push(limb([bx, h, 0.1], [ex, ey, a * 3], 0.2, 0.05, 5));
    tree.push(limb([ex, ey, a * 3], [ex + side * 0.9, ey + 0.9, a * 3 + 0.5], 0.05, 0.02, 4));
    branches.push([ex, ey, a * 3]);
  }
  const treeG = merge(tree.map((b) => tint(b, "#4a443c")));
  const apples = merge([[-4.2, 6.8, 0.2], [-1.2, 7.4, 0.7], [-5.6, 9.2, -0.6], [-0.4, 9.4, 1.2], [-4.6, 5.0, 0.9], [-2.0, 5.6, -0.8]].map(([x, y, z]) => ball(0.42, x, y - 0.5, z, 1, 0.92, 1, 9, 7)), true);
  return { plain: merge(plain), bones: boneG, tree: treeG, apples };
}

export function buildRealm() {
  const geo = realmGeometry();
  const mats = {
    ash: lit({ albedo: "#d9d2c0", dir: [0.25, 1, 0.2], floor: 0.42, haze: "#a07848", fogK: 0.0035, vertexColors: true }),
    apple: lit({ albedo: "#c4131d", dir: [0.25, 1, 0.2], floor: 0.5, haze: "#a07848", fogK: 0.0035 }),
    puff: lit({ albedo: "#33414a", dir: [0, -1, 0], light: "#d9893e", floor: 0.0, haze: "#6a4a2a", fogK: 0.001 }),
  };
  const g = new Group();
  const realm = new Group();
  const mk = (geom, mat, parent = realm) => {
    const m = new Mesh(geom, mat);
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  mk(geo.plain, mats.ash);
  mk(geo.bones, mats.ash);
  mk(geo.tree, mats.ash);
  mk(geo.apples, mats.apple);
  realm.rotation.x = Math.PI; // seen from below
  realm.position.copy(REALM_AT);
  g.add(realm);
  // the gap: a ring of cloud puffs, dark on top and lit amber underneath, sliding open and shut
  const puffG = prep(new IcosahedronGeometry(1, 1).scale(1, 0.55, 0.8));
  const N = 28;
  const puffs = new InstancedMesh(puffG, mats.puff, N);
  puffs.frustumCulled = false;
  g.add(puffs);
  return {
    group: g,
    // o: 0 closed .. 1 open
    tick(t) {
      const o = sm(T.realm[0], T.realm[0] + 0.6, t) * (1 - sm(T.realm[1] - 0.7, T.realm[1], t));
      realm.visible = o > 0.03;
      realm.scale.setScalar(0.35 + 0.3 * o);
      realm.rotation.y = 0.2 + t * 0.02;
      const sk = sm(T.realm[0] - 0.3, T.realm[0] + 0.2, t) * (1 - sm(T.realm[1], T.realm[1] + 0.4, t));
      for (let i = 0; i < N; i++) {
        const ring = i % 2 ? 1 : 0.8;
        const a = (i / N) * Math.PI * 2 + hash(i, 1) * 0.3;
        const open = 2.2 + 9.2 * o; // the gap's radius
        const rr = open * (0.85 + 0.35 * hash(i, 2)) * ring + 1.4 * (1 - o) * hash(i, 3);
        const sz = (3.4 + 3.4 * hash(i, 4) + 1.5 * (1 - o)) * sk;
        D.position.set(REALM_AT.x + Math.cos(a) * rr * 1.25, REALM_AT.y + Math.sin(a) * rr * 0.9, REALM_AT.z + 5 + 3 * hash(i, 6));
        D.rotation.set(0, 0, a + Math.PI / 2 + (hash(i, 5) - 0.5) * 0.4);
        D.scale.set(sz * 1.3, sz, sz);
        D.updateMatrix();
        puffs.setMatrixAt(i, D.matrix);
      }
      puffs.instanceMatrix.needsUpdate = true;
      puffs.visible = t > T.realm[0] - 0.3 && t < T.realm[1] + 0.4; // the bank is only seen while the sky is parting
    },
    dispose() {
      for (const x of Object.values(geo)) x.dispose();
      puffG.dispose();
      for (const m of Object.values(mats)) m.dispose();
      puffs.dispose();
    },
  };
}
