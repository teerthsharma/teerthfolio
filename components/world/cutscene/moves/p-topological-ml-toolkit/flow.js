// THE STORM AND ITS VECTORS. Everything the city throws at the pup (bullets,
// missiles, steel beams, a train car torn off the viaduct, the rival's ray)
// flies a straight line to a reflecting shell round the pup. A bright vector
// arrow rides each one; at the hit the arrow flips end for end, and the thing
// rebounds along the reversed arrow, tumbling. Every position is a closed form
// of the clock, so nothing allocates per frame. Sparks, ring pulses and
// debris are instanced pools driven by the same list of impact events.

import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, Quaternion, RingGeometry, Vector3 } from "three";
import { smooth } from "../../kit";
import { hash, trainGeometry } from "./city";
import { MUZZLE } from "./rival";
import { INK, celMaterial, merge, part } from "./shade";

export const CORE = new Vector3(0, 0.85, 0);
export const SHELL_R = 1.3;
export const RAIL = { x: -24, y: 7.3, z: -17.8, speed: 10 };
export const T_TRAIN = { launch: 3.6, hit: 4.55 };
export const T_RAY = { fire: 5.0, hit: 5.25 };

const UP = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const O = new Object3D();
const V = new Vector3();
const W = new Vector3();
const AX = new Vector3();
const X = new Vector3();
const Qa = new Quaternion();
const Qb = new Quaternion();
const YAW = new Quaternion().setFromAxisAngle(UP, Math.PI / 2); // nose +z turned to run along +x

const KINDS = {
  bullet: { len: 1.3, th: 0.05, spin: 0 },
  missile: { len: 2.8, th: 0.1, spin: 5 },
  beam: { len: 3.8, th: 0.12, spin: 4.2 },
  train: { len: 4.6, th: 0.17, spin: 1.8 },
  ray: { len: 4.2, th: 0.15, spin: 0 },
};

function missileGeometry() {
  const L = [
    part(new CylinderGeometry(0.2, 0.2, 1.9, 8).rotateX(Math.PI / 2), "#f1f5fa", 0),
    part(new ConeGeometry(0.2, 0.7, 8).rotateX(Math.PI / 2).translate(0, 0, 1.3), "#d44a52", 0),
    part(new CylinderGeometry(0.205, 0.205, 0.22, 8).rotateX(Math.PI / 2).translate(0, 0, 0.25), "#3b6fd9", 0),
    part(new ConeGeometry(0.19, 1.0, 8).rotateX(-Math.PI / 2).translate(0, 0, -1.45), "#ffe6a0", 3),
  ];
  for (let k = 0; k < 4; k++) L.push(part(new BoxGeometry(0.62, 0.05, 0.5).translate(0.28, 0, -0.75).rotateZ((k * Math.PI) / 2), "#9fb2c9", 4));
  return merge(L);
}
function beamGeometry() {
  return merge([
    part(new BoxGeometry(0.2, 0.9, 5.2), "#9eb2cb", 4),
    part(new BoxGeometry(0.8, 0.16, 5.2).translate(0, 0.5, 0), "#b9c9dd", 4),
    part(new BoxGeometry(0.8, 0.16, 5.2).translate(0, -0.5, 0), "#b9c9dd", 4),
    part(new BoxGeometry(0.84, 1.2, 0.2).translate(0, 0, 2.5), "#d44a52", 0),
    part(new BoxGeometry(0.84, 1.2, 0.2).translate(0, 0, -2.5), "#d44a52", 0),
  ]);
}
function bulletGeometry() {
  return merge([
    part(new CylinderGeometry(0.07, 0.07, 0.5, 6).rotateX(Math.PI / 2), "#fff0bd", 0),
    part(new ConeGeometry(0.07, 0.3, 6).rotateX(Math.PI / 2).translate(0, 0, 0.4), "#e8b04a", 0),
    part(new ConeGeometry(0.06, 0.8, 6).rotateX(-Math.PI / 2).translate(0, 0, -0.65), "#ffffff", 3),
  ]);
}
function rayGeometry() {
  return merge([part(new CylinderGeometry(0.28, 0.28, 7, 8).rotateX(Math.PI / 2), "#d6f3ff", 3), part(new CylinderGeometry(0.46, 0.46, 6.4, 8, 1, true).rotateX(Math.PI / 2), "#7cc2ff", 3)]);
}

// [kind, hit time s, approach s, azimuth deg off -z (+ right), elevation, distance m]
function schedule() {
  const L = [];
  for (let i = 0; i < 24; i++) L.push(["bullet", 2.35 + Math.floor(i / 6) * 0.42 + (i % 6) * 0.06, 0.55, (i % 2 ? 1 : -1) * (48 + 40 * hash(i, 1)), 0.05 + 0.3 * hash(i, 2), 26 + 6 * hash(i, 3)]);
  [3.0, 3.38, 3.78, 4.1, 4.42, 4.78].forEach((t, i) => L.push(["missile", t, 0.9, (i % 2 ? 1 : -1) * (55 + 30 * hash(i, 4)), 0.15 + 0.35 * hash(i, 5), 34 + 6 * hash(i, 6)]));
  [3.55, 4.0, 4.38, 4.82].forEach((t, i) => L.push(["beam", t, 1.0, (i % 2 ? -1 : 1) * (50 + 35 * hash(i, 7)), 0.2 + 0.3 * hash(i, 8), 34 + 5 * hash(i, 9)]));
  return L;
}

const SPARKS = 7;
const DEBRIS = 5;
const SPARK_TINT = ["#ffffff", "#8fd8ff", "#ffd24d", "#ffffff"];

export function createFlow(U, arrows) {
  const shots = [];
  const add = (kind, hit, dur, S, H) => {
    const d = new Vector3().subVectors(H, S);
    const dist = d.length();
    d.normalize();
    const i = shots.length;
    shots.push({
      kind,
      hit,
      dur,
      S,
      H,
      d,
      dist,
      k: KINDS[kind],
      ax: new Vector3(hash(i, 11) - 0.5, hash(i, 12) - 0.5, hash(i, 13) - 0.5).normalize(),
      spin: (0.7 + 0.6 * hash(i, 15)) * KINDS[kind].spin,
      vr: (dist / dur) * (0.9 + 0.4 * hash(i, 14)),
      q0: new Quaternion().setFromUnitVectors(Z, d),
      slot: 0,
      until: 0,
    });
  };
  for (const [kind, hit, dur, az, el, dist] of schedule()) {
    const a = (az * Math.PI) / 180;
    const u = new Vector3(Math.sin(a), el, -Math.cos(a) * 0.55 + 0.1).normalize();
    add(kind, hit, dur, CORE.clone().addScaledVector(u, dist), CORE.clone().addScaledVector(u, SHELL_R));
  }
  {
    const S = new Vector3(RAIL.x + RAIL.speed * T_TRAIN.launch, RAIL.y, RAIL.z);
    const u = new Vector3().subVectors(S, CORE).normalize();
    add("train", T_TRAIN.hit, T_TRAIN.hit - T_TRAIN.launch, S, CORE.clone().addScaledVector(u, SHELL_R + 0.6));
  }
  {
    const S = new Vector3(...MUZZLE);
    const u = new Vector3().subVectors(S, CORE).normalize();
    add("ray", T_RAY.hit, T_RAY.hit - T_RAY.fire, S, CORE.clone().addScaledVector(u, SHELL_R));
  }
  const ray = shots[shots.length - 1];
  const rivalHit = ray.hit + ray.dist / ray.vr;
  const slots = {};
  for (const s of shots) {
    s.slot = slots[s.kind] = (slots[s.kind] ?? -1) + 1;
    s.until = s.kind === "ray" ? rivalHit : s.hit + 1.8;
  }
  // impact events: sparks, rings, shake
  const events = shots.map((s) => ({ t: s.hit, at: s.H, u: s.d.clone().negate(), size: { bullet: 0.5, missile: 1, beam: 1.1, train: 1.7, ray: 1.4 }[s.kind], shake: { bullet: 0, missile: 0.085, beam: 0.1, train: 0.2, ray: 0.13 }[s.kind] }));
  events.push({ t: rivalHit, at: ray.S, u: new Vector3(0.6, 0.3, 0.6).normalize(), size: 1.7, shake: 0.16 });
  const bigs = shots.filter((s) => s.kind === "beam" || s.kind === "train" || s.kind === "missile");

  // ---- the meshes
  const geos = { bullet: bulletGeometry(), missile: missileGeometry(), beam: beamGeometry(), train: trainGeometry(), ray: rayGeometry() };
  const mat = celMaterial(U, { side: DoubleSide });
  const n = (kind) => shots.filter((s) => s.kind === kind).length;
  const inst = (g, c) => {
    const m = new InstancedMesh(g, mat, c);
    m.frustumCulled = false;
    return m;
  };
  const mesh = { bullet: inst(geos.bullet, n("bullet")), missile: inst(geos.missile, n("missile")), beam: inst(geos.beam, n("beam")), train: inst(geos.train, 4), ray: inst(geos.ray, 1) };
  const debrisG = merge([part(new IcosahedronGeometry(0.28, 0).toNonIndexed(), "#cfdcec", 0), part(new BoxGeometry(0.5, 0.12, 0.3).translate(0.1, 0, 0), "#9eb2cb", 4)]);
  const debris = inst(debrisG, bigs.length * DEBRIS);

  const sparkMat = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false });
  const sparkG = new OctahedronGeometry(1, 0).scale(0.35, 1, 0.35);
  const sparks = new InstancedMesh(sparkG, sparkMat, events.length * SPARKS);
  sparks.frustumCulled = false;
  const tint = SPARK_TINT.map((h) => new Color(h));
  const sd = new Float32Array(events.length * SPARKS * 4); // direction and speed
  for (let i = 0; i < events.length * SPARKS; i++) {
    const e = events[Math.floor(i / SPARKS)];
    V.set(hash(i, 21) - 0.5, hash(i, 22) - 0.2, hash(i, 23) - 0.5).normalize().multiplyScalar(0.9).addScaledVector(e.u, 1.1).normalize();
    sd.set([V.x, V.y, V.z, (4 + 7 * hash(i, 24)) * Math.sqrt(e.size)], i * 4);
    sparks.setColorAt(i, tint[i % tint.length]);
  }
  const ringMat = (c) => new MeshBasicMaterial({ color: c, toneMapped: false, fog: false, side: DoubleSide });
  const ringW = new InstancedMesh(new RingGeometry(0.84, 1.0, 28), ringMat("#f6fbff"), events.length);
  const ringI = new InstancedMesh(new RingGeometry(1.0, 1.17, 28), ringMat(INK), events.length);
  for (const r of [ringW, ringI]) {
    r.frustumCulled = false;
    r.renderOrder = 6;
  }
  const dd = new Float32Array(bigs.length * DEBRIS * 4);
  for (let i = 0; i < bigs.length * DEBRIS; i++) {
    const s = bigs[Math.floor(i / DEBRIS)];
    V.set(hash(i, 31) - 0.5, hash(i, 32) * 0.6, hash(i, 33) - 0.5).multiplyScalar(2).addScaledVector(s.d, -s.vr * 0.55);
    dd.set([V.x, V.y, V.z, 0.5 + hash(i, 34)], i * 4);
  }

  const hideAt = (m, i) => {
    O.position.set(0, -90, 0);
    O.scale.setScalar(0.0001);
    O.quaternion.identity();
    O.updateMatrix();
    m.setMatrixAt(i, O.matrix);
  };
  const setAt = (m, i, p, q, s = 1) => {
    O.position.copy(p);
    O.quaternion.copy(q);
    O.scale.setScalar(s);
    O.updateMatrix();
    m.setMatrixAt(i, O.matrix);
  };

  // where a shot is at time t (into W) and how it faces (into Qa); false when it is not in the air
  const where = (s, t) => {
    if (t < s.hit - s.dur || t > s.until) return false;
    if (t < s.hit) {
      W.lerpVectors(s.S, s.H, (t - (s.hit - s.dur)) / s.dur);
      Qa.copy(s.q0);
    } else {
      const age = t - s.hit;
      W.copy(s.H).addScaledVector(s.d, -s.vr * age);
      Qa.setFromAxisAngle(s.ax, s.spin * age).multiply(s.q0);
    }
    return true;
  };
  const trainX = (k, t) => RAIL.x + RAIL.speed * t - 6.9 * k;

  return {
    shots,
    events,
    rivalHit,
    meshes: [...Object.values(mesh), debris, sparks, ringI, ringW],
    // the arrows' indexes are 0..shots.length - 1 in the pool
    shakeAt(t) {
      let shake = 0;
      for (const e of events) if (e.shake && t >= e.t && t < e.t + 0.17) shake = Math.max(shake, e.shake);
      return shake;
    },
    update(t, cam, camQ, camFwd) {
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        const m = mesh[s.kind];
        const live = where(s, t);
        if (!live) {
          hideAt(m, s.slot);
          arrows.hide(i);
          continue;
        }
        if (s.kind === "train") {
          // the car leaves the rail where the lead car is, turning from running along the line to flying at the pup
          const k = smooth(T_TRAIN.launch, T_TRAIN.launch + 0.3, t);
          Qb.copy(YAW).slerp(Qa, k);
          setAt(m, 0, W, Qb);
        } else if (s.kind === "ray") {
          O.position.copy(W);
          O.quaternion.copy(Qa);
          O.scale.set(1, 1, 1 + 0.2 * Math.sin(t * 90));
          O.updateMatrix();
          m.setMatrixAt(0, O.matrix);
        } else setAt(m, s.slot, W, Qa);
        // the arrow: pops in before the hit, flips end for end at it, then rides the rebound
        const appear = s.hit - Math.min(0.8, s.dur * 0.85);
        const pop = smooth(appear, appear + 0.12, t) * (1 - smooth(s.hit + 0.6, s.hit + 0.95, t));
        if (pop <= 0.001 || t > s.hit + 1.0) {
          arrows.hide(i);
          continue;
        }
        const phi = Math.PI * smooth(s.hit, s.hit + 0.15, t);
        // flip about the component of the lens's direction that is square to the shot, so it ends exactly reversed
        AX.copy(camFwd).addScaledVector(s.d, -camFwd.dot(s.d));
        if (AX.lengthSq() < 1e-4) AX.copy(UP);
        AX.normalize();
        V.copy(s.d).multiplyScalar(Math.cos(phi)).addScaledVector(X.crossVectors(AX, s.d), Math.sin(phi));
        V.normalize();
        const far = Math.min(2.4, Math.max(1, W.distanceTo(cam) / 11));
        const flash = 1 + 0.45 * Math.max(0, 1 - Math.abs(t - s.hit - 0.07) / 0.1);
        arrows.set(i, W.x, W.y, W.z, V.x, V.y, V.z, s.k.len * far * pop * flash, s.k.th * far * (0.5 + 0.5 * pop) * flash);
      }
      // the rest of the consist, running on the rail (the lead car is the shot until it leaves)
      for (let k = t < T_TRAIN.launch ? 0 : 1; k < 4; k++) {
        W.set(trainX(k, t), RAIL.y, RAIL.z);
        setAt(mesh.train, k, W, YAW);
      }
      // sparks and rings
      for (let ei = 0; ei < events.length; ei++) {
        const e = events[ei];
        const age = t - e.t;
        const on = age >= 0 && age < 0.3;
        if (on) {
          const k = age / 0.3;
          const sc = e.size * (0.35 + 1.7 * (1 - (1 - k) * (1 - k)));
          O.position.copy(e.at);
          O.quaternion.copy(camQ);
          O.scale.setScalar(sc * (1 - 0.25 * k));
          O.updateMatrix();
          ringW.setMatrixAt(ei, O.matrix);
          O.scale.setScalar(sc * (1 - 0.25 * k));
          ringI.setMatrixAt(ei, O.matrix);
        } else {
          hideAt(ringW, ei);
          hideAt(ringI, ei);
        }
        for (let j = 0; j < SPARKS; j++) {
          const i = ei * SPARKS + j;
          if (age < 0 || age > 0.5) {
            hideAt(sparks, i);
            continue;
          }
          const o = i * 4;
          V.set(sd[o], sd[o + 1], sd[o + 2]);
          W.copy(e.at).addScaledVector(V, sd[o + 3] * age);
          W.y = Math.max(0.02, W.y - 6 * age * age);
          Qb.setFromUnitVectors(UP, V);
          setAt(sparks, i, W, Qb, 0.16 * Math.sqrt(e.size) * (1 - age / 0.5));
        }
      }
      // debris from the big hits: tumbling away on the rebound
      for (let b = 0; b < bigs.length; b++) {
        const s = bigs[b];
        const age = t - s.hit;
        for (let j = 0; j < DEBRIS; j++) {
          const i = b * DEBRIS + j;
          if (age < 0 || age > 1.6) {
            hideAt(debris, i);
            continue;
          }
          const o = i * 4;
          W.copy(s.H).addScaledVector(V.set(dd[o], dd[o + 1], dd[o + 2]), age);
          W.y = Math.max(0.1, W.y - 4.9 * age * age);
          Qb.setFromAxisAngle(s.ax, age * 6 * dd[o + 3]);
          setAt(debris, i, W, Qb, (s.kind === "train" ? 1.7 : 1) * dd[o + 3] * (1 - smooth(1.1, 1.6, age)));
        }
      }
      mesh.ray.visible = t >= T_RAY.fire - 0.01;
      for (const m of [...Object.values(mesh), debris, sparks, ringW, ringI]) m.instanceMatrix.needsUpdate = true;
      if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
      arrows.commit();
    },
    dispose() {
      for (const g of [...Object.values(geos), debrisG, sparkG, ringW.geometry, ringI.geometry]) g.dispose();
      for (const m of [mat, sparkMat, ringW.material, ringI.material]) m.dispose();
      for (const m of [...Object.values(mesh), debris, sparks, ringW, ringI]) m.dispose();
    },
  };
}
