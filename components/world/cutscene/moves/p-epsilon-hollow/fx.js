// THE ALCHEMY'S EFFECTS and the pup's cut-out look. The pup keeps its real
// round, earless 3D body but is drawn as a cut-out figure: a 3-band toon
// ramp and a thin cream card-edge outline (an inverted hull), plus a short
// red card coat that flares behind it. Lightning is 48 pooled cut-foil
// zig-zags that flick on twos; sparks, ash and paper confetti are one
// pooled, state-free particle mesh; the Gate is a folded-card pair of slab
// doors that pops up and folds flat; the covers are the book closing.
// Nothing allocates per frame.

import { BackSide, BoxGeometry, CanvasTexture, Color, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, ShaderMaterial, SRGBColorSpace } from "three";
import { BRASS, INK, KIND, brad, circlePts, cutShape, layer, prep, ringShape, slab } from "./paper";
import { hash } from "./world";

const D = new Object3D();
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- the pup, cut out of card
export function pupPaper(root) {
  const list = [];
  const twins = new Map();
  const toon = (m) =>
    new ShaderMaterial({
      uniforms: { uBase: { value: (m.color ?? new Color(1, 1, 1)).clone() }, uOp: { value: m.opacity ?? 1 } },
      vertexColors: Boolean(m.vertexColors),
      transparent: m.transparent,
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vCol;
        void main() {
          vCol = vec3(1.0);
          #ifdef USE_COLOR
            vCol = color.rgb;
          #endif
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase; uniform float uOp;
        varying vec3 vN; varying vec3 vCol;
        void main() {
          vec3 n = normalize(vN);
          float d = dot(n, normalize(vec3(-0.5, 0.78, 0.42))) * 0.5 + 0.5;
          float band = 0.7 + 0.18 * step(0.4, d) + 0.14 * step(0.72, d);
          vec3 c = pow(uBase * vCol, vec3(1.0 / 2.2)) * band;
          gl_FragColor = vec4(c, uOp);
        }`,
    });
  const hullMat = new ShaderMaterial({
    side: BackSide,
    vertexShader: /* glsl */ `
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.034, 1.0); }`,
    fragmentShader: /* glsl */ `
      void main() { gl_FragColor = vec4(0.95, 0.9, 0.78, 1.0); }`,
  });
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.isMeshBasicMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) twins.set(m, (p = toon(m)));
    const hull = o.geometry.attributes.normal && o.geometry.attributes.position.count > 60 ? new Mesh(o.geometry, hullMat) : null;
    if (hull) {
      hull.visible = false;
      hull.frustumCulled = false;
      o.add(hull);
    }
    list.push([o, m, p, hull]);
  });
  let on = false;
  return {
    // stand-in meshes that draw each twin program once (prewarm): one per twin and one for the outline hull
    stand() {
      const out = [];
      const seen = new Set();
      for (const [o, , p, h] of list) {
        if (seen.has(p)) continue;
        seen.add(p);
        out.push(new Mesh(o.geometry, p));
        if (h && !seen.has(hullMat)) (seen.add(hullMat), out.push(new Mesh(o.geometry, hullMat)));
      }
      for (const x of out) x.frustumCulled = false;
      return out;
    },
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p, h] of list) {
        o.material = v ? p : m;
        if (h) h.visible = v;
      }
    },
    dispose() {
      this.set(false);
      for (const [, , , h] of list) h?.removeFromParent();
      for (const p of twins.values()) p.dispose();
      hullMat.dispose();
    },
  };
}

// a short red card coat that flares behind the pup (on its body group); no hood, nothing near the head
export function coat(rear, mat) {
  const body = rear.children.find((o) => o.isMesh);
  if (!body) return null;
  body.geometry.computeBoundingBox();
  const bb = body.geometry.boundingBox;
  const sx = bb.max.x - bb.min.x;
  const sy = bb.max.y - bb.min.y;
  const sz = bb.max.z - bb.min.z;
  const cx = (bb.max.x + bb.min.x) / 2;
  const cy = (bb.max.y + bb.min.y) / 2;
  const cz = (bb.max.z + bb.min.z) / 2;
  const L = layer();
  const w0 = sx * 0.7;
  const w1 = sx * 1.7;
  const len = sy * 1.5;
  // a cape of red card standing behind the shoulders, narrow at the collar and flared down to a cut-away hem
  const poly = [[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, -len * 0.92], [w1 * 0.3, -len], [0, -len * 0.86], [-w1 * 0.3, -len], [-w1 / 2, -len * 0.92]];
  L.add(cutShape(poly, 0.035), "#a3201f", { faces: "z" }, cx, cy + sy * 0.38, cz - sz * 0.2);
  L.add(cutShape([[-w0 / 2, 0], [w0 / 2, 0], [w1 * 0.22, -len * 0.55], [-w1 * 0.22, -len * 0.55]], 0.02), "#7a1514", { faces: "z" }, cx, cy + sy * 0.38, cz - sz * 0.2 - 0.04);
  for (const s of [-1, 1]) L.add(brad(0.04), BRASS, { emit: 0.3 }, cx + s * w0 * 0.4, cy + sy * 0.38 - 0.03, cz - sz * 0.2 + 0.05);
  const geo = L.build();
  const g = new Group();
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  g.add(m);
  g.userData.hem = { sz, len };
  rear.add(g);
  return { group: g, mesh: m, dispose: () => (g.removeFromParent(), geo.dispose()) };
}

// ---------------------------------------------------------------- lightning: 48 pooled cut-foil zig-zags
export const BOLTS = 48;
export function bolts(mat) {
  const N = 10;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i++) {
    const z = i / N;
    const x = i === 0 || i === N ? 0 : (i % 2 ? 1 : -1) * 0.07 * (0.6 + 0.4 * hash(i, 3));
    const w = 0.03 * (1 - z * 0.55);
    left.push([x - w, z]);
    right.push([x + w, z]);
  }
  const L = layer();
  L.add(cutShape([...left, ...right.reverse()], 0.03).rotateX(-Math.PI / 2).translate(0, 0.02, 0), "#c9e7ff", { kind: KIND.glow, noEdge: true });
  const geo = L.build();
  const mesh = new InstancedMesh(geo, mat, BOLTS);
  mesh.frustumCulled = false;
  const hide = (i) => {
    D.position.set(0, -50, 0);
    D.scale.setScalar(0.0001);
    D.updateMatrix();
    mesh.setMatrixAt(i, D.matrix);
  };
  for (let i = 0; i < BOLTS; i++) hide(i);
  const c = new Color();
  for (let i = 0; i < BOLTS; i++) mesh.setColorAt(i, c.set(i % 3 ? "#d6ecff" : "#ffffff"));
  mesh.instanceColor.needsUpdate = true;
  return {
    mesh,
    // front: how far the crawl has reached (m); `on` the drawing index; y the height to ride at
    update(t, front, y, on) {
      for (let i = 0; i < BOLTS; i++) {
        const f = hash(i, on % 7) * 0.999;
        const len = 2.4 + 5 * hash(i, 11);
        const r0 = front - len * (0.15 + 0.85 * hash(i, 13)) - 8 * hash(i, 17) * (front > 6 ? 1 : 0);
        const live = front > 0 && r0 > -len && f > 0.3 && t < 5.6;
        if (!live) {
          hide(i);
          continue;
        }
        const a = (i / BOLTS) * Math.PI * 2 + (hash(i, 19 + (on % 3)) - 0.5) * 0.35;
        const r = Math.max(0.4, r0);
        D.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        D.rotation.set(0, a + Math.PI, 0);
        D.scale.set(1 + 0.5 * f, 1, len * (0.7 + 0.5 * f));
        D.updateMatrix();
        mesh.setMatrixAt(i, D.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mesh.dispose();
    },
  };
}

// ---------------------------------------------------------------- sparks, ash, chips and confetti: one pooled, state-free mesh
// each slot belongs to an emitter and is a pure function of the clock
export function particles(mat, emitters) {
  const slots = [];
  for (const e of emitters)
    for (let k = 0; k < e.n; k++) {
      const h = (j) => hash(slots.length * 7 + k, j + e.seed);
      const a = h(1) * Math.PI * 2;
      const up = e.up ?? 0.5;
      const sp = e.speed * (0.4 + 0.8 * h(2));
      slots.push({
        t0: e.t0 + (e.spread ?? 0) * h(3),
        at: e.at,
        v: [Math.cos(a) * sp * (e.flat ?? 1), (up + h(4) * (e.upVar ?? 0.8)) * sp * (e.vy ?? 1), Math.sin(a) * sp * (e.flat ?? 1)],
        life: e.life * (0.6 + 0.6 * h(5)),
        g: e.g ?? 9,
        size: e.size * (0.5 + h(6)),
        color: e.colors[Math.floor(h(7) * e.colors.length)],
        spin: 4 + 8 * h(8),
        r: e.r ?? 0,
        ra: h(9) * Math.PI * 2,
      });
    }
  const L = layer();
  L.add(new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5), "#ffffff", { kind: KIND.glow, noEdge: true });
  const geo = L.build();
  const mesh = new InstancedMesh(geo, mat, slots.length);
  mesh.frustumCulled = false;
  const c = new Color();
  slots.forEach((s, i) => mesh.setColorAt(i, c.set(s.color)));
  mesh.instanceColor.needsUpdate = true;
  return {
    mesh,
    count: slots.length,
    update(t) {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const d = t - s.t0;
        if (d < 0 || d > s.life) {
          D.position.set(0, -50, 0);
          D.scale.setScalar(0.0001);
        } else {
          const k = d / s.life;
          D.position.set(s.at[0] + Math.cos(s.ra) * s.r + s.v[0] * d, Math.max(0.05, s.at[1] + s.v[1] * d - 0.5 * s.g * d * d), s.at[2] + Math.sin(s.ra) * s.r + s.v[2] * d);
          D.rotation.set(d * s.spin, d * s.spin * 0.7, d * s.spin * 0.4);
          D.scale.setScalar(s.size * (1 - k * k));
        }
        D.updateMatrix();
        mesh.setMatrixAt(i, D.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mesh.dispose();
    },
  };
}

// ---------------------------------------------------------------- the Gate: two carved slab doors, an original relief, pale gold light
export function gate(mat) {
  const root = new Group(); // pivots at its foot; lies flat when folded
  const W = 5.6;
  const H = 15;
  const fr = layer();
  const pillars = (x) => fr.add(slab(1.3, H + 2.4, 1.1), "#3a3156", { faces: "y", ink: INK.brick }, x, 0, 0);
  pillars(-W - 0.65);
  pillars(W + 0.65);
  fr.add(cutShape([[-W - 1.3, 0], [W + 1.3, 0], [W + 1.3, 2.4], [W * 0.5, 3.6], [0, 4.4], [-W * 0.5, 3.6], [-W - 1.3, 2.4]], 1.1), "#463a68", { ink: INK.hatch }, 0, H, -0.55);
  fr.add(cutShape(circlePts(1.5, 28), 0.14), "#e3b04a", { kind: KIND.foil }, 0, H + 2.3, 0.62);
  fr.add(ringShape(2.0, 2.3, 0.14, 28), "#e3b04a", { kind: KIND.foil }, 0, H + 2.3, 0.62);
  for (const x of [-1, 1]) for (const y of [1, 5, 9, 13]) fr.add(brad(0.2), BRASS, { emit: 0.4 }, x * (W + 0.65), y, 0.58);
  const frameMesh = new Mesh(fr.build(), mat);
  frameMesh.frustumCulled = false;
  root.add(frameMesh);
  const light = new Mesh(new PlaneGeometry(1, 1), mat);
  const lg = layer();
  lg.add(cutShape([[-W * 0.42, 0], [W * 0.42, 0], [W * 0.42, H], [-W * 0.42, H]], 0.1), "#f0d283", { kind: KIND.glow, noEdge: true }, 0, 0, -0.5);
  light.geometry.dispose();
  light.geometry = lg.build();
  light.frustumCulled = false;
  root.add(light);
  const door = (s) => {
    const dl = layer();
    dl.add(slab(W, H, 0.55), "#524470", { faces: "y", ink: INK.hatch }, 0, 0, 0);
    dl.add(cutShape([[-W / 2 + 0.4, 1], [W / 2 - 0.4, 1], [W / 2 - 0.4, H - 1], [-W / 2 + 0.4, H - 1]], 0.12, [[[-W / 2 + 0.7, 1.3], [-W / 2 + 0.7, H - 1.3], [W / 2 - 0.7, H - 1.3], [W / 2 - 0.7, 1.3]]]), "#e3b04a", { kind: KIND.foil }, 0, 0, 0.55);
    // the relief: concentric rings, a turned square and a ladder of ticks (original, no figures)
    dl.add(ringShape(1.5, 1.8, 0.16, 30), "#c9a24c", { kind: KIND.foil }, 0, H * 0.58, 0.55);
    dl.add(ringShape(0.7, 0.95, 0.16, 24), "#c9a24c", { kind: KIND.foil }, 0, H * 0.58, 0.55);
    dl.add(cutShape([[-1.15, 0], [0, 1.15], [1.15, 0], [0, -1.15]], 0.16, [[[-0.9, 0], [0, -0.9], [0.9, 0], [0, 0.9]]]), "#c9a24c", { kind: KIND.foil }, 0, H * 0.58, 0.55);
    for (let k = 0; k < 6; k++) dl.add(cutShape([[-1.3, 0], [1.3, 0], [1.3, 0.22], [-1.3, 0.22]], 0.12), "#c9a24c", { kind: KIND.foil }, 0, H * 0.18 + k * 0.7, 0.55);
    for (let k = 0; k < 4; k++) dl.add(cutShape([[-0.8, 0], [0.8, 0], [0, 1.1]], 0.12), "#c9a24c", { kind: KIND.foil }, 0, H * 0.78 + k * 0.5, 0.55);
    const g = new Group();
    const m = new Mesh(dl.build(), mat);
    m.frustumCulled = false;
    m.position.x = -s * W / 2;
    g.add(m);
    g.position.x = s * W; // the hinge: the outer edge
    return g;
  };
  const dL = door(-1);
  const dR = door(1);
  root.add(dL, dR);
  root.visible = false;
  return {
    root,
    set(t) {
      // 3.0 s pop up (0.08) -> doors part (to 3.26) -> shut (to 3.42) -> fold flat (to 3.5)
      const t0 = 3.0;
      const up = smooth(t0, t0 + 0.09, t) * (1 - smooth(t0 + 0.42, t0 + 0.5, t));
      root.visible = t >= t0 && t < t0 + 0.52;
      root.rotation.x = -(Math.PI / 2) * (1 - up);
      const open = smooth(t0 + 0.08, t0 + 0.24, t) * (1 - smooth(t0 + 0.26, t0 + 0.4, t));
      // the doors hinge on their outer edges; the left one swings away on +y
      dL.rotation.y = open * 1.15;
      dR.rotation.y = -open * 1.15;
    },
    dispose() {
      for (const m of [frameMesh, light, ...dL.children, ...dR.children]) m.geometry.dispose();
    },
  };
}

// ---------------------------------------------------------------- the covers: the book closes on the Promised Day
export function covers(mat) {
  const W = 15;
  const H = 12;
  const mk = (s) => {
    const L = layer();
    L.add(cutShape([[0, -H / 2], [W, -H / 2], [W, H / 2], [0, H / 2]], 0.5), "#4a1520", { ink: INK.hatch });
    L.add(cutShape([[0.5, -H / 2 + 0.5], [W - 0.5, -H / 2 + 0.5], [W - 0.5, H / 2 - 0.5], [0.5, H / 2 - 0.5]], 0.1, [[[0.8, -H / 2 + 0.8], [0.8, H / 2 - 0.8], [W - 0.8, H / 2 - 0.8], [W - 0.8, -H / 2 + 0.8]]]), "#e3b04a", { kind: KIND.foil }, 0, 0, 0.5);
    for (const [x, y] of [[0.4, -H / 2 + 0.4], [W - 0.4, -H / 2 + 0.4], [0.4, H / 2 - 0.4], [W - 0.4, H / 2 - 0.4]]) L.add(cutShape([[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]], 0.14), BRASS, { kind: KIND.foil }, x, y, 0.5);
    for (let k = 0; k < 4; k++) L.add(cutShape([[-0.2, -H / 2], [0.2, -H / 2], [0.2, H / 2], [-0.2, H / 2]], 0.16), "#2a0c14", { noEdge: true }, 1.4 + k * 1.1, 0, 0.5); // the spine's raised bands
    const g = new Group();
    const m = new Mesh(L.build(), mat);
    m.frustumCulled = false;
    m.scale.x = s;
    g.add(m);
    return { g, m };
  };
  const a = mk(1);
  const b = mk(-1);
  const root = new Group();
  root.add(a.g, b.g);
  a.g.position.x = -W + 0.05; // each leaf is hinged at its outer edge, hanging inward when closed
  b.g.position.x = W - 0.05;
  // the title, in gold foil, centred on the closed covers
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, 1024, 512);
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#e9b94d";
    g.strokeStyle = "#7a5a1a";
    g.lineWidth = 6;
    g.font = `800 96px ${fam}`;
    g.strokeText("THE PROMISED DAY", 512, 190);
    g.fillText("THE PROMISED DAY", 512, 190);
    g.font = `700 54px ${fam}`;
    g.fillText("· fin ·", 512, 330);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 90px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  const titleMat = new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: DoubleSide, depthWrite: false });
  const title = new Mesh(new PlaneGeometry(14, 7), titleMat);
  title.position.set(0, 0.5, 0.6);
  title.frustumCulled = false;
  title.visible = false;
  root.add(title);
  root.visible = false;
  return {
    root,
    title,
    // k: 0 open (edge-on, out of sight) .. 1 closed
    set(k) {
      root.visible = k > 0.001;
      const ang = (1 - k) * (Math.PI / 2);
      a.g.rotation.y = ang; // free edge swings toward the lens... away: -z
      b.g.rotation.y = -ang;
      title.visible = k > 0.98;
    },
    dispose() {
      a.m.geometry.dispose();
      b.m.geometry.dispose();
      title.geometry.dispose();
      titleMat.dispose();
      tex.dispose();
    },
  };
}
export { prep };
