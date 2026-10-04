// THE EPSILON-HOLLOW SPHERE, assembled from the plaza. The geodesic shell is
// the monument's own (buildCollapse, outerDetail 1: 42 joints, 120 struts),
// built here as card: each strut is a flat card strip wearing a CANDY accent
// with a lighter cut edge, each joint a lit jewel. On the slam the chosen
// cobbles stand up as columns, crease into struts and fly to their places
// while the whole sphere rises on the lift shaft; then Father pushes, and
// three crowded joints FOLD onto their neighbours like valley folds (the two
// triangles between each pair crease flat and flash coral) while every
// surviving point stays on the sphere. Inside, a finer sphere turns the
// other way round a glowing bare-metal core (Epsilon), a ring of motes
// orbits, and the payload (five points) gathers, dives through the hollow on
// its thread, glints at the core and comes up whole on the far side.
// Motion is on twos (12 drawings a second). No allocation per frame.

import { BoxGeometry, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Object3D, OctahedronGeometry, Vector3 } from "three";
import { buildCollapse } from "../../../monuments/parts/collapse-sphere";
import { KIND, layer, ringShape } from "./paper";
import { DOCK_AT, hash } from "./world";

export const CANDY = ["#ff5d8f", "#ffb238", "#33e6b3", "#5b8dff"];
const OUTER_R = 2.1;
const INNER_R = 0.72;
export const S = 2.0; // the sphere's scale at plaza size
export const SPHERE_AT = [DOCK_AT[0], 5.9, DOCK_AT[2]];
export const OUTER_WORLD_R = OUTER_R * S;
const PAYLOAD = [[0, 0, 0], [0.28, 0.1, 0.06], [-0.22, 0.18, -0.12], [0.12, -0.24, 0.2], [-0.18, -0.12, -0.22]];
export const T = { stand: 0.3, fly: 0.78, build0: 3.65, build1: 4.05, lift: [3.9, 5.2], fold: [5.1, 5.55], alive: 5.6, gather: 5.8, dive: [6.2, 7.6], land: 8.0 };

const ease = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const A = new Vector3();
const B = new Vector3();
const X = new Vector3();
const Y = new Vector3();
const Z = new Vector3();
const N = new Vector3();
const PA = new Vector3();
const PB = new Vector3();
const M = new Matrix4();
const D = new Object3D();
const col = new Color();

export function buildSphere(mat, tiles) {
  const scene = buildCollapse({ outerDetail: 1, innerDetail: 1, outerR: OUTER_R, innerR: INNER_R, accentHex: CANDY });
  const pairs = scene.outer.pairs;
  const E = pairs.length / 2;
  const V = scene.points.count;
  const P0 = scene.points.positions; // joint positions at the outer radius
  const group = new Group();
  const geos = [];
  const keep = (g) => (geos.push(g), g);

  // ---- the struts: flat card strips, one instance each
  const strutG = (() => {
    const L = layer();
    L.add(new BoxGeometry(1, 1, 1), "#ffffff", { faces: "z", ink: 1 });
    return keep(L.build());
  })();
  const struts = new InstancedMesh(strutG, mat, E);
  struts.frustumCulled = false;
  for (let i = 0; i < E; i++) struts.setColorAt(i, col.set(CANDY[pairs[i * 2] % CANDY.length]));
  struts.instanceColor.needsUpdate = true;
  group.add(struts);

  // ---- the joints: jewels
  const jewelG = (() => {
    const L = layer();
    L.add(new OctahedronGeometry(0.2, 0), "#ffffff", { kind: KIND.lamp, noEdge: true });
    return keep(L.build());
  })();
  const joints = new InstancedMesh(jewelG, mat, V);
  joints.frustumCulled = false;
  for (let i = 0; i < V; i++) joints.setColorAt(i, col.set(CANDY[i % CANDY.length]));
  joints.instanceColor.needsUpdate = true;
  group.add(joints);

  // ---- which strut comes from which cobble, and when
  const src = Array.from({ length: E }, (_, j) => {
    const ti = Math.min(tiles.length - 1, Math.floor(((j + 0.5) * tiles.length) / E));
    const t0 = T.build0 + (T.build1 - T.build0) * hash(j, 41);
    return { tile: ti, x: tiles[ti].x, z: tiles[ti].z, t0 };
  });
  const chosen = new Int32Array(tiles.length).fill(-1);
  src.forEach((s, j) => (chosen[s.tile] = j));

  // ---- adjacency (for the folds)
  const nb = Array.from({ length: V }, () => new Set());
  for (let i = 0; i < E; i++) {
    nb[pairs[i * 2]].add(pairs[i * 2 + 1]);
    nb[pairs[i * 2 + 1]].add(pairs[i * 2]);
  }
  // three crowded joints (a front-facing, spread apart) each folding onto a neighbour b
  const yawAt = (t) => 0.5 + 0.11 * (t - 3.6);
  const yf = yawAt(5.3);
  const front = [];
  for (let v = 0; v < V; v++) {
    const x = P0[v * 3] / OUTER_R;
    const y = P0[v * 3 + 1] / OUTER_R;
    const z = P0[v * 3 + 2] / OUTER_R;
    const xr = x * Math.cos(yf) + z * Math.sin(yf);
    const zr = -x * Math.sin(yf) + z * Math.cos(yf);
    if (zr > 0.35 && y > -0.4 && y < 0.85) front.push({ v, xr, y, zr });
  }
  const picks = [];
  for (const target of [-0.62, 0.55, 0.0]) {
    let best = null;
    for (const f of front) if (!picks.some((p) => p.a === f.v) && (!best || Math.abs(f.xr - target) < Math.abs(best.xr - target))) best = f;
    if (best) {
      const a = best.v;
      let b = -1;
      let bd = -9;
      for (const n of nb[a]) {
        const d = (P0[a * 3] * P0[n * 3] + P0[a * 3 + 1] * P0[n * 3 + 1] + P0[a * 3 + 2] * P0[n * 3 + 2]) / OUTER_R ** 2;
        if (d > bd && !picks.some((p) => p.a === n || p.b === n)) (bd = d), (b = n);
      }
      const tri = [...nb[a]].filter((c) => nb[b].has(c));
      picks.push({ a, b, tri, t: [5.1 + picks.length * 0.17, 5.3 + picks.length * 0.17] });
    }
  }
  // the coral fold triangles: two per fold, six in all, a dynamic card
  const foldG = new BufferGeometry();
  const fpos = new Float32Array(picks.length * 2 * 9);
  foldG.setAttribute("position", new BufferAttribute(fpos, 3).setUsage(DynamicDrawUsage));
  const fc = new Float32Array(picks.length * 2 * 9);
  const fm = new Float32Array(picks.length * 2 * 12);
  const fn = new Float32Array(picks.length * 2 * 9);
  const coral = col.set("#ff6f61").clone();
  for (let i = 0; i < picks.length * 6; i++) {
    fc[i * 3] = coral.r;
    fc[i * 3 + 1] = coral.g;
    fc[i * 3 + 2] = coral.b;
    fm[i * 4] = KIND.glow;
    fn[i * 3 + 2] = 1;
  }
  foldG.setAttribute("color", new BufferAttribute(fc, 3));
  foldG.setAttribute("aMeta", new BufferAttribute(fm, 4));
  foldG.setAttribute("normal", new BufferAttribute(fn, 3));
  keep(foldG);
  const foldMesh = new Mesh(foldG, mat);
  foldMesh.frustumCulled = false;
  group.add(foldMesh);

  // ---- the hollow: the finer inner sphere, the Epsilon core, the mote ring, the thread and the payload (in the sphere's own frame)
  const inner = new Group();
  const innerPairs = scene.inner.pairs;
  const IE = innerPairs.length / 2;
  const innerG = (() => {
    const L = layer();
    L.add(new BoxGeometry(1, 1, 1), "#ffffff", { faces: "z", ink: 0 });
    return keep(L.build());
  })();
  const innerStruts = new InstancedMesh(innerG, mat, IE);
  innerStruts.frustumCulled = false;
  const ip = scene.inner.positions;
  for (let i = 0; i < IE; i++) {
    A.set(ip[i * 6], ip[i * 6 + 1], ip[i * 6 + 2]);
    B.set(ip[i * 6 + 3], ip[i * 6 + 4], ip[i * 6 + 5]);
    stripMatrix(A, B, N.copy(A).add(B).normalize(), 0.075, 0.025, M);
    innerStruts.setMatrixAt(i, M);
    innerStruts.setColorAt(i, col.set(i % 2 ? "#3b4468" : "#2c3354"));
  }
  innerStruts.instanceColor.needsUpdate = true;
  inner.add(innerStruts);
  const coreG = (() => {
    const L = layer();
    L.add(new IcosahedronGeometry(0.27, 1), "#ffe6a8", { kind: KIND.glow, noEdge: true });
    L.add(ringShape(0.36, 0.42, 0.03, 24), "#ffd36a", { kind: KIND.glow, noEdge: true }, 0, 0, 0, 0, Math.PI / 2);
    L.add(ringShape(0.36, 0.42, 0.03, 24), "#ffd36a", { kind: KIND.glow, noEdge: true }, 0, 0, 0, Math.PI / 2, 0);
    return keep(L.build());
  })();
  const core = new Mesh(coreG, mat);
  core.frustumCulled = false;
  inner.add(core);
  group.add(inner);
  const moteG = (() => {
    const L = layer();
    L.add(new OctahedronGeometry(0.13, 0), "#ffffff", { kind: KIND.lamp, noEdge: true });
    return keep(L.build());
  })();
  const motes = new InstancedMesh(moteG, mat, 18);
  motes.frustumCulled = false;
  for (let i = 0; i < 18; i++) {
    const band = i % 2;
    const a = (i / 18) * Math.PI * 2;
    const r = OUTER_R * (band ? 1.22 : 1.1);
    D.position.set(Math.cos(a) * r, band ? -0.07 : 0.08, Math.sin(a) * r);
    D.rotation.set(0, 0, 0);
    D.scale.setScalar(1);
    D.updateMatrix();
    motes.setMatrixAt(i, D.matrix);
    motes.setColorAt(i, col.set(CANDY[(i + band) % CANDY.length]));
  }
  motes.instanceColor.needsUpdate = true;
  const moteRing = new Group();
  moteRing.add(motes);
  group.add(moteRing);
  const payloadG = (() => {
    const L = layer();
    L.add(new IcosahedronGeometry(0.3, 0), "#ffffff", { kind: KIND.lamp, noEdge: true });
    return keep(L.build());
  })();
  const payload = new InstancedMesh(payloadG, mat, PAYLOAD.length);
  payload.frustumCulled = false;
  for (let i = 0; i < PAYLOAD.length; i++) payload.setColorAt(i, col.set("#ff8f3a"));
  payload.instanceColor.needsUpdate = true;
  const shell = new Group(); // the shell's own frame: the payload and its thread ride the joints' yaw
  group.add(shell);
  shell.add(payload);
  const threadG = (() => {
    const L = layer();
    L.add(new BoxGeometry(0.06, 1, 0.02), "#ffe9b0", { kind: KIND.glow, noEdge: true });
    return keep(L.build());
  })();
  const thread = new Mesh(threadG, mat);
  thread.frustumCulled = false;
  shell.add(thread);

  const travel = scene.travel;
  const start = new Vector3(...travel.start);
  const end = new Vector3(...travel.end);

  // the live joint positions (sphere-local, the folds applied), and a stepped clock so the motion lands on twos
  const pos = new Float32Array(V * 3);
  const state = { yaw: 0, gy: 0, lastFrame: -1, foldK: picks.map(() => 0) };
  const world = (v, out) => {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    const c = Math.cos(state.yaw);
    const s = Math.sin(state.yaw);
    return out.set(SPHERE_AT[0] + (x * c + z * s) * S, state.gy + y * S, SPHERE_AT[2] + (-x * s + z * c) * S);
  };

  function update(t) {
    const frame = Math.floor(t * 12);
    if (frame === state.lastFrame) return false;
    state.lastFrame = frame;
    const tt = frame / 12;
    const alive = tt >= T.build0;
    if (!alive) return true;
    state.yaw = yawAt(tt);
    state.gy = SPHERE_AT[1] - (1 - ease((tt - T.lift[0]) / (T.lift[1] - T.lift[0]))) * 3.0;
    // the folds: slide joint a along the sphere onto b
    for (let f = 0; f < picks.length; f++) state.foldK[f] = ease((tt - picks[f].t[0]) / (picks[f].t[1] - picks[f].t[0]));
    pos.set(P0);
    for (let f = 0; f < picks.length; f++) {
      const { a, b } = picks[f];
      const k = state.foldK[f];
      if (k <= 0) continue;
      PA.set(P0[a * 3], P0[a * 3 + 1], P0[a * 3 + 2]);
      PB.set(P0[b * 3], P0[b * 3 + 1], P0[b * 3 + 2]);
      PA.lerp(PB, k).normalize().multiplyScalar(OUTER_R);
      pos[a * 3] = PA.x;
      pos[a * 3 + 1] = PA.y;
      pos[a * 3 + 2] = PA.z;
    }
    // the struts
    for (let i = 0; i < E; i++) {
      const s = src[i];
      const a = pairs[i * 2];
      const b = pairs[i * 2 + 1];
      const e = ease((tt - (s.t0 + T.stand)) / T.fly);
      if (tt < s.t0 + 0.1) {
        M.makeScale(0, 0, 0);
        struts.setMatrixAt(i, M);
        continue;
      }
      world(a, PA);
      world(b, PB);
      const stand = ease((tt - s.t0) / T.stand);
      // the column: base on its cobble, a card standing 0.9 -> 5 m
      const colLen = 0.7 + 2.0 * stand;
      A.set(s.x, 0.18, s.z);
      B.set(s.x, 0.18 + colLen, s.z);
      const arc = Math.sin(Math.PI * e) * 2.4;
      A.lerp(PA, e).y += arc;
      B.lerp(PB, e).y += arc;
      const len = A.distanceTo(B);
      if (len < 0.03 || (e >= 1 && PA.distanceToSquared(PB) < 1e-4)) {
        M.makeScale(0, 0, 0);
        struts.setMatrixAt(i, M);
        continue;
      }
      // the card's face turns from the lens (a standing column) to the sphere's outward normal
      N.set(0, 0, 1).lerp(Z.copy(PA).add(PB).multiplyScalar(0.5).sub(Y.set(SPHERE_AT[0], state.gy, SPHERE_AT[2])).normalize(), e);
      stripMatrix(A, B, N, 0.42 * (1 - e) + 0.19 * e, 0.045 + 0.1 * (1 - e), M);
      struts.setMatrixAt(i, M);
    }
    struts.instanceMatrix.needsUpdate = true;
    // the joints appear as their struts arrive
    for (let v = 0; v < V; v++) {
      const k = Math.min(1, Math.max(0, (tt - (T.build1 + 0.55)) / 0.5 + 0.25 * hash(v, 5)));
      let s = ease(k) * (1 + 0.5 * bump(tt, T.build1 + 0.9 + hash(v, 6) * 0.3, 0.2));
      for (let f = 0; f < picks.length; f++) if (picks[f].a === v) s *= 1 - state.foldK[f];
      world(v, A);
      D.position.copy(A);
      D.rotation.set(0, state.yaw + v, 0);
      D.scale.setScalar(Math.max(s, 0.0001));
      D.updateMatrix();
      joints.setMatrixAt(v, D.matrix);
    }
    joints.instanceMatrix.needsUpdate = true;
    // the coral fold triangles: the two faces between a and b crease flat and flash, then fade into the jewels
    for (let f = 0; f < picks.length; f++) {
      const { a, b, tri } = picks[f];
      const k = state.foldK[f];
      const show = tt >= picks[f].t[0] && tt < picks[f].t[1] + 0.35;
      for (let q = 0; q < 2; q++) {
        const o = (f * 2 + q) * 9;
        const c = tri[q] ?? tri[0];
        if (!show) {
          fpos.fill(0, o, o + 9);
          continue;
        }
        // the corner a rides toward b, the triangle creasing to a sliver; lifted 4 cm off the shell so it reads
        const lift = 1.07;
        world(a, A).sub(Y.set(SPHERE_AT[0], state.gy, SPHERE_AT[2])).multiplyScalar(lift).add(Y);
        world(b, B).sub(Y.set(SPHERE_AT[0], state.gy, SPHERE_AT[2])).multiplyScalar(lift).add(Y);
        const Cc = PA.set(P0[c * 3], P0[c * 3 + 1], P0[c * 3 + 2]);
        const x = Cc.x;
        const y = Cc.y;
        const z = Cc.z;
        const cs = Math.cos(state.yaw);
        const sn = Math.sin(state.yaw);
        Cc.set(SPHERE_AT[0] + (x * cs + z * sn) * S * lift, state.gy + y * S * lift, SPHERE_AT[2] + (-x * sn + z * cs) * S * lift);
        fpos.set([A.x, A.y, A.z, B.x, B.y, B.z, Cc.x, Cc.y, Cc.z], o);
      }
      void k;
    }
    foldG.attributes.position.needsUpdate = true;
    // the hollow comes alive: the inner sphere turns the other way, the core pulses, the motes orbit
    const live = ease((tt - T.alive) / 0.4);
    shell.position.set(SPHERE_AT[0], state.gy, SPHERE_AT[2]);
    shell.rotation.y = state.yaw;
    shell.scale.setScalar(S);
    inner.position.copy(shell.position);
    moteRing.position.copy(shell.position);
    inner.visible = live > 0.01;
    inner.rotation.y = -(tt - T.alive) * 0.9;
    inner.scale.setScalar(S * live);
    core.scale.setScalar(1 + 0.18 * Math.sin(tt * 7) + 0.9 * bump(tt, 6.9, 0.18));
    moteRing.visible = live > 0.01;
    moteRing.rotation.y = (tt - T.alive) * 1.1;
    moteRing.scale.setScalar(S * live);
    // the sphere's own spin (the outer card shell turns on its own drawings: the joints already carry the yaw)
    // the payload: gathers on the surface, dives through the hollow on its thread, comes up whole on the far side
    const dv = (tt - T.dive[0]) / (T.dive[1] - T.dive[0]);
    const showP = tt >= T.gather && tt < T.land + 1.2;
    payload.visible = showP;
    thread.visible = tt >= T.gather + 0.2 && tt < T.dive[1] + 0.35;
    if (showP) {
      const k = ease(dv);
      const spread = tt < T.dive[0] ? 1 - ease((tt - T.gather) / 0.4) : tt > T.dive[1] ? ease((tt - T.dive[1]) / 0.4) : 0;
      const grow = ease((tt - T.gather) / 0.25) * (1 - ease((tt - (T.land + 0.8)) / 0.4));
      const pop = bump(dv, 0.5, 0.07);
      for (let i = 0; i < PAYLOAD.length; i++) {
        const o = PAYLOAD[i];
        D.position.set(start.x + (end.x - start.x) * k + o[0] * spread * 1.4, start.y + (end.y - start.y) * k + o[1] * spread * 1.4, start.z + (end.z - start.z) * k + o[2] * spread * 1.4);
        D.rotation.set(tt * 2 + i, tt * 3, 0);
        D.scale.setScalar(Math.max(0.0001, grow * (1 + pop * 1.8)));
        D.updateMatrix();
        payload.setMatrixAt(i, D.matrix);
      }
      payload.instanceMatrix.needsUpdate = true;
    }
    if (thread.visible) {
      Y.copy(end).sub(start);
      const len = Y.length();
      X.copy(start).add(end).multiplyScalar(0.5);
      thread.position.copy(X);
      thread.scale.set(0.7 + 0.5 * bump(dv, 0.5, 0.5), len, 1);
      thread.quaternion.setFromUnitVectors(Z.set(0, 1, 0), Y.normalize());
    }
    return true;
  }
  // the group's own yaw is zero: the joints carry it; the inner parts turn in their frames, which are not rotated by the shell yaw

  return {
    group,
    chosen,
    src,
    picks,
    update,
    state,
    core,
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of [struts, joints, innerStruts, motes, payload]) m.dispose();
    },
    count: { struts: E, joints: V, folds: picks.length },
  };
}

// a flat card strip from A to B: its length along Y, its face toward N, `w` wide, `th` thick (unit box instance)
function stripMatrix(a, b, n, w, th, out) {
  Y.subVectors(b, a);
  const len = Y.length() || 0.0001;
  Y.multiplyScalar(1 / len);
  X.crossVectors(Y, n);
  if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
  X.normalize();
  Z.crossVectors(X, Y);
  out.makeBasis(X.multiplyScalar(w), Y.multiplyScalar(len), Z.multiplyScalar(th));
  out.setPosition((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
  return out;
}
