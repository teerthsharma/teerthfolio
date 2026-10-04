// FULLMETAL ALCHEMIST builders: the sunset plaza, the blue transmutation circle, Alphonse, the stone spire, the Gate of Truth.
// One material (rimMaterial): flat toon bands, strong cyan/gold rim light, emissive "glow" kinds. Built once at mount.
import { AdditiveBlending, BackSide, BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, Object3D, ShaderMaterial, SphereGeometry } from "three";
import { circlePts, cutShape, layer, ringShape } from "./paper";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const D = new Object3D();
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const G = 6; // aMeta kind: emissive
const mesh = (mat, geo) => {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
};

export function rimMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexColors: true,
    uniforms: { uTime: { value: 0 }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aMeta;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = color.rgb;
        #endif
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        vN = mat3(modelMatrix) * n + vec3(0.0, 0.0001, 0.0);
        vMeta = aMeta;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uGlow;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta;
      void main() {
        vec3 n = normalize(vN + vec3(0.0, 0.0001, 0.0));
        if (!gl_FrontFacing) n = -n;
        vec3 base = pow(vCol, vec3(1.0 / 2.2));
        if (vMeta.x > 5.5) { gl_FragColor = vec4(base * (1.1 + 0.25 * uGlow), 1.0); return; }
        float d = dot(n, normalize(vec3(-0.45, 0.7, 0.55))) * 0.5 + 0.5;
        float shade = 0.7 + 0.18 * step(0.4, d) + 0.16 * step(0.72, d);
        vec3 v = normalize(cameraPosition - vWorld + vec3(0.0, 0.0001, 0.0));
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
        vec3 rc = mix(vec3(1.0, 0.72, 0.25), vec3(0.25, 0.85, 1.0), step(0.0, n.x));
        rim *= 1.0 - smoothstep(0.45, 0.9, abs(n.y));
        gl_FragColor = vec4(base * shade + rc * rim * 1.1, 1.0);
      }`,
  });
}

export function skyDome() {
  const m = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec3 dir = normalize(vW - cameraPosition + vec3(0.0, 0.0001, 0.0));
        float y = clamp(dir.y, -0.2, 1.0);
        vec3 c = mix(vec3(1.0, 0.72, 0.2), vec3(1.0, 0.4, 0.16), smoothstep(0.0, 0.18, y));
        c = mix(c, vec3(0.9, 0.16, 0.45), smoothstep(0.14, 0.45, y));
        c = mix(c, vec3(0.3, 0.14, 0.62), smoothstep(0.4, 0.95, y));
        vec3 sunDir = normalize(vec3(0.15, 0.17, -1.0));
        float s = dot(dir, sunDir);
        c += vec3(1.0, 0.8, 0.4) * pow(max(s, 0.0), 24.0) * 0.8;
        c = mix(c, vec3(1.0, 0.95, 0.65), smoothstep(0.9965, 0.9975, s));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh3 = new Mesh(new SphereGeometry(150, 24, 16), m);
  mesh3.frustumCulled = false;
  mesh3.renderOrder = -10;
  return { mesh: mesh3, dispose: () => (mesh3.geometry.dispose(), m.dispose()) };
}

const glowMat = (color) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uC: { value: new Color(color) }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float r = length(vUv*2.0-1.0); float k = 1.0 - smoothstep(0.0,1.0,r); gl_FragColor = vec4(uC * k * k * uK, 1.0); }`,
  });

// the plaza: concentric bands of sunset stone with dark joints, and a ring of purple pillars at the rim
export function plaza(mat) {
  const L = layer();
  const bands = ["#e8863a", "#c9482b", "#f5b44e", "#d9622f", "#ffc86a", "#b83a2c"];
  for (let i = 0; i < 6; i++) L.add(ringShape(Math.max(0.4, 30 - (i + 1) * 5), 30 - i * 5 + 0.02, 0.1, 48).rotateX(-Math.PI / 2), bands[i], {});
  for (let k = 0; k < 24; k++) L.add(new BoxGeometry(0.06, 0.12, 29).translate(0, 0.05, 14.5), "#7a1f2a", {}, 0, 0.02, 0, (k / 24) * Math.PI * 2);
  for (let k = 0; k < 9; k++) {
    const a = 0.5 + (k / 9) * Math.PI * 2;
    const h = 14 + 5 * hash(k, 2);
    L.add(new BoxGeometry(2.2, h, 2.2), "#3a1a58", {}, Math.cos(a) * 32, h / 2, Math.sin(a) * 32);
  }
  return mesh(mat, L.build());
}

// the transmutation circle, flat in XY then laid on the ground: two rings, a triangle, a turned triangle, runes
export function circle(mat) {
  const L = layer();
  const C = "#3fdcff";
  const W = "#ffffff";
  const E = { kind: G, noEdge: true };
  const tri = (r, rot) => [0, 1, 2].map((i) => [Math.cos(rot + (i * 2 * Math.PI) / 3) * r, Math.sin(rot + (i * 2 * Math.PI) / 3) * r]);
  const triRing = (r, w, rot, col) => L.add(cutShape(tri(r, rot), 0.05, [tri(r - w, rot).reverse()]), col, E);
  L.add(ringShape(6.9, 7.3, 0.05, 56), C, E);
  L.add(ringShape(6.15, 6.3, 0.05, 56), W, E);
  triRing(6.1, 0.22, Math.PI / 2, C);
  triRing(3.1, 0.18, -Math.PI / 2, W);
  L.add(ringShape(2.4, 2.6, 0.05, 40), C, E);
  L.add(ringShape(0.9, 1.1, 0.05, 28), W, E);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    L.add(cutShape([[-0.07, -0.22], [0.07, -0.22], [0.07, 0.22], [-0.07, 0.22]], 0.05), k % 2 ? W : C, E, Math.cos(a) * 6.6, Math.sin(a) * 6.6, 0, 0, 0, a + Math.PI / 2);
  }
  for (const [x, y] of tri(6.1, Math.PI / 2)) L.add(ringShape(0.25, 0.5, 0.05, 20), W, E, x, y, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    L.add(cutShape([[-0.1, 0], [0.1, 0], [0, 0.45]], 0.05), C, E, Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0, 0, 0, a - Math.PI / 2);
  }
  const root = new Group();
  const spin = new Group();
  const m = mesh(mat, L.build());
  m.rotation.x = -Math.PI / 2;
  spin.add(m);
  root.add(spin);
  const gm = glowMat("#1d6cff");
  const glow = new Mesh(new CircleGeometry(9, 40), gm);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  glow.frustumCulled = false;
  root.add(glow);
  root.visible = false;
  return { root, spin, glowMat: gm, dispose: () => (m.geometry.dispose(), glow.geometry.dispose(), gm.dispose()) };
}

// the tall column of light for the arrival and the return
export function column() {
  const gm = glowMat("#9fe6ff");
  const m = new Mesh(new CylinderGeometry(1.4, 1.4, 14, 16, 1, true), gm);
  m.position.y = 7;
  m.frustumCulled = false;
  m.visible = false;
  return { mesh: m, glowMat: gm, dispose: () => (m.geometry.dispose(), gm.dispose()) };
}

const STEEL = "#5873ae";
const DARK = "#1b2142";
const RED = "#e0262b";
const GOLD = "#f4b942";
// ALPHONSE: a hollow suit of armour, horned helmet, red loincloth, glowing eye-dots in a dark visor (about 5.7 m tall at scale 1)
export function alphonse(mat) {
  const root = new Group();
  const B = (w, h, d) => new BoxGeometry(w, h, d);
  const L = layer();
  for (const s of [-1, 1]) {
    L.add(B(0.6, 0.22, 0.95), DARK, {}, s * 0.45, 0.11, 0.12);
    L.add(B(0.52, 1.35, 0.52), STEEL, {}, s * 0.45, 0.9, 0);
    L.add(B(0.62, 0.3, 0.62), GOLD, {}, s * 0.45, 1.2, 0.02);
    L.add(new SphereGeometry(0.52, 14, 10), STEEL, {}, s * 1.2, 3.1, 0);
    L.add(new ConeGeometry(0.17, 0.7, 6), STEEL, {}, s * 1.45, 3.55, 0, 0, 0, -s * 0.6);
    L.add(B(0.42, 1.25, 0.42), STEEL, {}, s * 1.28, 2.3, 0);
    L.add(B(0.5, 0.42, 0.5), DARK, {}, s * 1.28, 1.5, 0.02);
  }
  L.add(B(1.6, 0.5, 0.78), STEEL, {}, 0, 1.75, 0);
  L.add(B(1.7, 0.2, 0.84), GOLD, {}, 0, 1.98, 0);
  const cloth = [[-0.62, 0], [0.62, 0], [0.5, -1.15], [0, -1.4], [-0.5, -1.15]];
  L.add(cutShape(cloth, 0.07), RED, {}, 0, 1.95, 0.46);
  L.add(cutShape(cloth, 0.07), "#a81a22", {}, 0, 1.95, -0.5);
  L.add(B(1.7, 1.4, 0.95), STEEL, {}, 0, 2.7, 0);
  L.add(B(1.25, 0.55, 0.24), DARK, {}, 0, 3.05, 0.5);
  L.add(B(1.3, 0.14, 0.28), GOLD, {}, 0, 2.5, 0.5);
  L.add(B(0.55, 0.3, 0.55), DARK, {}, 0, 3.55, 0);
  root.add(mesh(mat, L.build()));
  const head = new Group();
  head.position.set(0, 3.7, 0);
  const H = layer();
  H.add(B(0.95, 1.0, 0.85), STEEL, {}, 0, 0.5, 0);
  H.add(B(0.7, 0.34, 0.1), "#07060e", {}, 0, 0.55, 0.43);
  H.add(B(1.02, 0.1, 0.9), GOLD, {}, 0, 1.03, 0);
  for (const s of [-1, 1]) {
    H.add(new ConeGeometry(0.15, 1.1, 8), "#dfe6f5", {}, s * 0.42, 1.55, 0, 0, 0, -s * 0.4);
    H.add(new ConeGeometry(0.15, 0.4, 8), GOLD, {}, s * 0.62, 2.0, 0, 0, 0, -s * 0.4);
    H.add(cutShape([[0, 0], [s * 0.5, 0.05], [s * 0.62, 0.6], [s * 0.3, 0.4], [0, 0.55]], 0.06), STEEL, {}, s * 0.46, 0.45, 0.1);
  }
  H.add(cutShape([[-0.1, 0], [0.1, 0], [0.16, 0.7], [0.04, 1.1], [-0.12, 0.8]], 0.05), RED, {}, 0, 1.1, -0.08);
  head.add(mesh(mat, H.build()));
  const Ey = layer();
  for (const s of [-1, 1]) Ey.add(new SphereGeometry(0.075, 10, 8), "#e8fbff", { kind: G }, s * 0.17, 0.55, 0.5);
  head.add(mesh(mat, Ey.build()));
  root.add(head);
  return { root, head };
}

// the stone spire and the wall of pillars the ground reshapes into: instanced, scaled up from the plaza
export const SPIRES = (() => {
  const a = [{ x: 7.5, z: -4.2, w: 2.2, h: 11, cone: true, t0: 3.7 }];
  for (let i = 0; i < 9; i++) a.push({ x: 4.2 + i * 1.5, z: -3.0 - 1.4 * hash(i, 5) - (i % 2), w: 0.9 + hash(i, 1) * 0.7, h: 2.6 + hash(i, 2) * 5, cone: false, t0: 3.9 + i * 0.16 });
  return a;
})();
export function spire(mat) {
  const mk = (geo) => {
    const L = layer();
    L.add(geo, "#ffffff", {});
    return L.build();
  };
  const tall = new InstancedMesh(mk(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), mat, SPIRES.length);
  const tips = new InstancedMesh(mk(new ConeGeometry(0.72, 1, 4).translate(0, 0.5, 0).rotateY(Math.PI / 4)), mat, SPIRES.length);
  const cols = ["#ffb255", "#e8683a", "#ffd37a", "#d94a3a"];
  SPIRES.forEach((s, i) => {
    const c = new Color(cols[i % 4]);
    tall.setColorAt(i, c);
    tips.setColorAt(i, c);
  });
  tall.frustumCulled = tips.frustumCulled = false;
  const root = new Group();
  root.add(tall, tips);
  return {
    root,
    // k: 1 full height .. 0 sunk back into the plaza
    update(t, k) {
      SPIRES.forEach((s, i) => {
        const r = 1 - Math.pow(1 - smooth(s.t0, s.t0 + 1.4, t), 3);
        const up = Math.max(0.0001, r * k);
        const bodyH = s.cone ? 0.0001 : s.h * up;
        const tipH = s.cone ? s.h * up : s.w * 1.1 * up;
        D.position.set(s.x, 0, s.z);
        D.rotation.set(0, i, 0);
        D.scale.set(s.w * up, Math.max(bodyH, 0.0001), s.w * up);
        D.updateMatrix();
        tall.setMatrixAt(i, D.matrix);
        D.position.set(s.x, bodyH, s.z);
        D.scale.set(s.w * up * 1.4, Math.max(tipH, 0.0001), s.w * up * 1.4);
        D.updateMatrix();
        tips.setMatrixAt(i, D.matrix);
      });
      tall.instanceMatrix.needsUpdate = tips.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      tall.geometry.dispose();
      tips.geometry.dispose();
      tall.dispose();
      tips.dispose();
    },
  };
}

// THE GATE OF TRUTH: a huge stone gate, two doors that open on a black void; black tendrils reach out, many white eyes blink,
// and the white silhouette of Truth sits grinning in the dark.
const GW = 3.4;
const GH = 10;
const TEND = 16;
const SEG = 9;
const EYES = 46;
export function gate(mat) {
  const root = new Group();
  const L = layer();
  const STONE = "#c98a58";
  L.add(new BoxGeometry(1.5, GH + 2, 1.6), STONE, {}, -GW * 2 - 0.75, (GH + 2) / 2, 0);
  L.add(new BoxGeometry(1.5, GH + 2, 1.6), STONE, {}, GW * 2 + 0.75, (GH + 2) / 2, 0);
  L.add(new BoxGeometry(GW * 4 + 3.4, 1.6, 1.8), "#a8643c", {}, 0, GH + 1.6, 0);
  L.add(new ConeGeometry(2.6, 1.8, 4).rotateY(Math.PI / 4), GOLD, {}, 0, GH + 2.4 + 0.9, 0);
  L.add(ringShape(0.5, 0.8, 0.12, 24), GOLD, {}, 0, GH + 1.6, 0.95);
  L.add(new BoxGeometry(GW * 4, GH, 0.2), "#04020a", {}, 0, GH / 2, -0.7);
  root.add(mesh(mat, L.build()));
  const doors = [-1, 1].map((s) => {
    const d = layer();
    d.add(new BoxGeometry(GW, GH, 0.6), "#a8683f", {}, 0, GH / 2, 0);
    d.add(ringShape(0.7, 1.0, 0.16, 28), GOLD, {}, 0, GH * 0.58, 0.32);
    d.add(cutShape([[-1.0, 0], [0, 1.7], [1.0, 0]], 0.16, [[[-0.7, 0.15], [0, 1.25], [0.7, 0.15]]]), GOLD, {}, 0, GH * 0.58 - 0.85, 0.32);
    for (let k = 0; k < 6; k++) d.add(new BoxGeometry(GW * 0.7, 0.14, 0.14), GOLD, {}, 0, 0.8 + k * 0.5, 0.34);
    for (let k = 0; k < 4; k++) d.add(new BoxGeometry(GW * 0.7, 0.14, 0.14), GOLD, {}, 0, GH - 1.0 - k * 0.5, 0.34);
    const g = new Group();
    const m = mesh(mat, d.build());
    m.position.x = (-s * GW) / 2;
    g.add(m);
    g.position.set(s * GW * 2, 0, 0.3);
    root.add(g);
    return g;
  });
  const E = layer();
  E.add(cutShape(circlePts(0.2, 14, 0, 0, 1.5, 0.8), 0.03), "#ffffff", { kind: G, noEdge: true });
  E.add(cutShape(circlePts(0.07, 8), 0.03), "#06040c", {}, 0, 0, 0.04);
  const eyes = new InstancedMesh(E.build(), mat, EYES);
  eyes.frustumCulled = false;
  const eyeAt = Array.from({ length: EYES }, (_, i) => ({ x: (hash(i, 1) - 0.5) * GW * 3.6, y: 0.8 + hash(i, 2) * (GH - 1.6), s: 0.7 + hash(i, 3) * 1.6, p: hash(i, 4) * 6 }));
  root.add(eyes);
  const T = layer();
  T.add(new BoxGeometry(1, 1, 1).translate(0, 0, 0.5), "#06030d", {});
  const tend = new InstancedMesh(T.build(), mat, TEND * SEG);
  tend.frustumCulled = false;
  root.add(tend);
  const Tr = layer();
  Tr.add(new SphereGeometry(1.0, 20, 14), "#f6f6ff", { kind: G }, 0, 0, 0, 0, 0, 0, 1, 1.15, 0.6);
  Tr.add(new SphereGeometry(1.1, 16, 12), "#f6f6ff", { kind: G }, 0, -1.9, 0, 0, 0, 0, 1.3, 0.9, 0.5);
  const smile = [];
  for (let i = 0; i <= 12; i++) smile.push([-0.7 + (i / 12) * 1.4, -0.12 - 0.12 * Math.sin((i / 12) * Math.PI)]);
  for (let i = 12; i >= 0; i--) smile.push([-0.7 + (i / 12) * 1.4, -0.22 - 0.5 * Math.sin((i / 12) * Math.PI)]);
  Tr.add(cutShape(smile, 0.05), "#0a0610", {}, 0, -0.1, 0.62);
  const truth = mesh(mat, Tr.build());
  truth.position.set(0, 4.2, -0.4);
  root.add(truth);
  root.visible = false;
  return {
    root,
    // rise 0..1 (the gate stands up out of the ground), open 0..1, reach 0..1 (tendrils), truthK 0..1
    update(t, rise, open, reach, truthK) {
      root.visible = rise > 0.001;
      root.scale.set(1, Math.max(0.001, rise), 1);
      doors[0].rotation.y = -open * 1.5;
      doors[1].rotation.y = open * 1.5;
      truth.scale.setScalar(Math.max(0.0001, truthK) * 1.6 * (1 + 0.03 * Math.sin(t * 2)));
      truth.position.y = 4.4 + 0.8 * truthK;
      eyeAt.forEach((e, i) => {
        const blink = Math.sin(t * 1.4 + e.p) > -0.9 ? 1 : 0.05;
        const k = Math.max(0.0001, e.s * smooth(0.2, 0.9, open) * blink);
        D.position.set(e.x, e.y, -0.55);
        D.rotation.set(0, 0, 0);
        D.scale.set(k, k, k);
        D.updateMatrix();
        eyes.setMatrixAt(i, D.matrix);
      });
      eyes.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < TEND; i++) {
        const bx = (hash(i, 7) - 0.5) * GW * 3.2;
        const by = 1.2 + hash(i, 8) * (GH - 2.4);
        const ang = (hash(i, 9) - 0.5) * 1.4;
        const len = (6 + 7 * hash(i, 10)) * reach;
        let px = bx;
        let py = by;
        let pz = -0.5;
        for (let s = 0; s < SEG; s++) {
          const u = (s + 1) / SEG;
          const nx = bx + Math.sin(ang) * len * u + Math.sin(u * 5 - t * 2.2 + i) * 0.7 * u * reach;
          const ny = by - 0.24 * u * u * len + Math.cos(u * 4 - t * 1.7 + i * 2) * 0.6 * u * reach;
          const nz = -0.5 + Math.cos(ang) * len * u;
          const dl = Math.hypot(nx - px, ny - py, nz - pz);
          D.position.set(px, py, pz);
          D.scale.set(1, 1, 1);
          D.lookAt(nx, ny, nz);
          const th = reach > 0.001 ? Math.max(0.0001, 0.2 * (1 - u * 0.85)) : 0.0001;
          D.scale.set(th, th, Math.max(dl, 0.0001));
          D.updateMatrix();
          tend.setMatrixAt(i * SEG + s, D.matrix);
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      tend.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      root.traverse((o) => o.isMesh && o.geometry.dispose());
      eyes.dispose();
      tend.dispose();
    },
  };
}

// the hollow sphere: three great circles, one for each territory (memory cyan, files gold, the scheduler pink)
export function hollowSphere() {
  const g = new Group();
  const mats = [];
  for (const [c, rx, ry] of [["#34e0ff", 0, 0], ["#ffc83a", Math.PI / 2, 0], ["#ff4fa0", 0, Math.PI / 2]]) {
    const m = new ShaderMaterial({ side: DoubleSide, uniforms: { uC: { value: new Color(c) } }, vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`, fragmentShader: /* glsl */ `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }` });
    mats.push(m);
    const ring = new Mesh(new SphereGeometry(1, 36, 2, 0, Math.PI * 2, Math.PI / 2 - 0.035, 0.07), m);
    ring.rotation.set(rx, ry, 0);
    ring.frustumCulled = false;
    g.add(ring);
  }
  g.visible = false;
  return { root: g, dispose: () => (g.children.forEach((c) => c.geometry.dispose()), mats.forEach((m) => m.dispose())) };
}
