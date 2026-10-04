// The Topological ML Toolkit: The Matrix (treatments/g4.md). A night sawmill
// yard in the place's magenta (a dome and a ground shader, a log deck, a stop
// rail, the lit shed). A small robed child sits on a log and bends a cream
// spoon ("There is no spoon."); three agents in cream shades stand at the back.
// The pup wears round shades and long dark coat tails. The agents fire: ~120
// bullets run in and FREEZE in a wall with a ripple ring round each, two
// violet tori and two mint clusters hanging in it. The pup raises one flipper
// ("No."), leans back, and answers: a persistence barcode draws itself from one
// baseline, the saw blade sweeps across (a bright band), every short bullet
// and short bar greys out and drops into the log deck; the long ones glow.
// Cost: ~40 draw calls added (dome, ground, logs, rail, shed x3, blade x2,
// band, bullets, ripples, 2 tori, bars, spoon, 3 agents x3, shades, coat,
// child x3). Bullets, ripples, bars and logs are each ONE instanced mesh.
// Card: lib/world/cutscene/cards/p-topological-ml-toolkit.js.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BackSide, Box3, BoxGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, Path, RingGeometry, Shape, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { HALFTONE } from "../Stage";
import { ball, flap, hullOf, inkPair, join, limb, makeWord, swayMaterial, tintInk } from "./g4/ink";
import { Rig, glow, pulse, useInk } from "./g4/parts";

const BARS = 16;
const BULLETS = 120;
const BAR_AT = [-3.3, 0.85, -2.4]; // the barcode's baseline, in the pup's frame
const BAR_W = 2.1;
const ROW = 0.105;
const GREY = new Color("#6f6a85");
const CREAM = new Color("#f3ecd9");
const VIOLET = new Color("#a37bff");
const MINT = new Color("#6ff2c0");
const AGENTS = [[-2.8, 0, -4.8], [-0.7, 0, -5.6], [1.4, 0, -5.0]];
// The pup's head group: the root's body group, down to the group that holds the head and its face parts.
const headOf = (seal) => {
  const h = seal.children.find((c) => !c.isMesh)?.children[0]?.children[0]?.children[4]?.children[0];
  return h?.children[1]?.children[0]?.isMesh ? h : null;
};
const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// A spoon standing on its handle: a flattened bowl on a thin stem.
function spoonGeometry() {
  const bowl = new IcosahedronGeometry(1, 2).scale(0.3, 0.44, 0.07).translate(0, 0.55, 0);
  const stem = new CylinderGeometry(0.035, 0.05, 1.7, 6, 8).translate(0, -0.45, 0);
  return mergeGeometries([bowl.toNonIndexed(), stem.toNonIndexed()]);
}

// Flat cream with a lighter edge, and a bend about the stem that folds the handle away.
function spoonMaterial(p) {
  return new ShaderMaterial({
    uniforms: { uBend: { value: 0 }, uBase: { value: new Color("#e9f0f6") }, uRim: { value: new Color(p.rim) } },
    vertexShader: /* glsl */ `
      uniform float uBend;
      varying vec3 vN;
      void main() {
        vec3 q = position;
        float d = max(0.0, 0.05 - q.y);
        q.z += uBend * d * d * 1.4;
        q.x += uBend * d * d * 0.55;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uRim;
      varying vec3 vN;
      void main() {
        float f = pow(1.0 - abs(normalize(vN).z), 1.8);
        gl_FragColor = vec4(pow(mix(uBase * (0.85 + 0.15 * vN.y), uRim, f), vec3(2.2)), 1.0);
      }`,
  });
}

// The night yard: a dome of deep night with a magenta horizon band and a pale moon,
// and a ground that is dark deck planks with a halftone pool of the place's colour round the pup.
function domeMaterial(p) {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uLow: { value: new Color().fromArray(p.night) }, uHigh: { value: new Color().fromArray(p.nightHigh) }, uBand: { value: new Color(p.accent) } },
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vD;
      void main() {
        vD = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow;
      uniform vec3 uHigh;
      uniform vec3 uBand;
      varying vec3 vD;
      ${HALFTONE}
      void main() {
        vec3 d = normalize(vD);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uLow, uHigh, smoothstep(0.0, 0.8, h));
        float band = exp(-abs(h - 0.04) * 9.0);
        vec3 glowC = uBand * band * 0.4;
        float moon = smoothstep(0.985, 0.992, dot(d, normalize(vec3(-0.5, 0.42, -0.75))));
        float halo = exp(-(1.0 - dot(d, normalize(vec3(-0.5, 0.42, -0.75)))) * 22.0);
        col += glowC * (0.5 + 0.5 * (uCell > 0.0 ? halftone(band) : band)) + vec3(0.9, 0.82, 1.0) * moon + uBand * halo * 0.35;
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}
function groundMaterial(p) {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uBase: { value: new Color().fromArray(p.night) }, uPool: { value: new Color(p.accent) }, uCenter: { value: new Vector3() } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uPool;
      uniform vec3 uCenter;
      varying vec3 vW;
      ${HALFTONE}
      void main() {
        vec2 q = vW.xz - uCenter.xz;
        float r = length(q);
        float plank = smoothstep(0.02, 0.0, abs(fract(q.y * 0.9) - 0.5) - 0.47);
        float pool = exp(-r * 0.32);
        vec3 col = uBase * (0.7 + 0.5 * plank) + uPool * (uCell > 0.0 ? halftone(pool * 0.55) : pool * 0.2) * 0.35 + uPool * pool * 0.05;
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}

// An agent: a suit, a tie, a cream pair of shades added by the move.
function agentGeometry() {
  return join([
    limb([-0.11, 0, 0.02], [-0.13, 0.95, 0], 0.08, 0.1),
    limb([0.11, 0, 0.02], [0.13, 0.95, 0], 0.08, 0.1),
    limb([0, 0.85, 0], [0, 1.65, 0], 0.2, 0.26, 6, 1.3, 0.8),
    limb([-0.33, 1.62, 0], [0.33, 1.62, 0], 0.08, 0.08),
    limb([0.33, 1.6, 0], [0.4, 1.0, 0.1], 0.085, 0.07),
    limb([-0.33, 1.6, 0], [-0.4, 1.0, 0.1], 0.085, 0.07),
    limb([0, 1.64, 0], [0, 1.82, 0.01], 0.07, 0.06),
    ball([0, 1.93, 0.02], 0.155, 0.94, 1.12, 1),
    limb([0, 1.5, 0.2], [0, 1.0, 0.24], 0.03, 0.05), // the tie, hung straight
  ]);
}
// The barcode, the saw blade: a toothed disc with a hub hole.
function bladeGeometry() {
  const sh = new Shape();
  const N = 20;
  for (let i = 0; i < N * 2; i++) {
    const a = (i * Math.PI) / N;
    const r = i % 2 ? 1.02 : 1.3;
    if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else sh.moveTo(r, 0);
  }
  const hole = new Path();
  hole.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  return new ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
}

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { p } = useInk(card);
  const F0 = tl.move[0] - 0.2; // the agents fire
  const F1 = tl.move[0] + 0.7; // and everything freezes
  const C0 = tl.lineB + 0.25; // the cut begins
  const geo = useMemo(
    () => ({
      spoon: spoonGeometry(),
      agent: agentGeometry(),
      blade: bladeGeometry(),
      burst: new RingGeometry(0.85, 1, 24),
      ripple: new RingGeometry(0.7, 1, 14),
      torus: new TorusGeometry(1, 0.035, 5, 40),
      dome: new SphereGeometry(13, 32, 16),
      ground: new CircleGeometry(13, 40).rotateX(-Math.PI / 2),
      log: new CylinderGeometry(0.26, 0.26, 2.6, 8).rotateZ(Math.PI / 2),
      rail: new BoxGeometry(6, 0.14, 0.14),
      shed: new BoxGeometry(3.4, 2.2, 2.4),
      roof: new CylinderGeometry(2.2, 2.2, 3.7, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5),
      win: new BoxGeometry(0.9, 0.7, 0.05),
      stack: new CylinderGeometry(0.16, 0.2, 2.8, 6),
      shades: new BoxGeometry(0.36, 0.06, 0.04),
      round: new CircleGeometry(0.24, 18),
      bridge: new BoxGeometry(0.2, 0.05, 0.02),
      band: new BoxGeometry(0.34, 5.6, 0.04),
      bar: new BoxGeometry(1, 1, 1).translate(0.5, 0, 0),
      bullet: new CylinderGeometry(0.014, 0.014, 1, 5).rotateX(Math.PI / 2),
      coat: flap(0.26, 0.45),
      sitlog: new CylinderGeometry(0.24, 0.24, 1.5, 8).rotateZ(Math.PI / 2),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      spoon: spoonMaterial(p),
      dome: domeMaterial(p),
      ground: groundMaterial(p),
      burst: glow("#ffffff"),
      ripple: glow("#d8c8ff"),
      violet: glow("#a37bff"),
      bullet: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      bar: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      band: glow(p.accent),
      cream: new MeshBasicMaterial({ color: "#fbfaf7", toneMapped: false, fog: false }),
      wood: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      woodLit: new MeshBasicMaterial({ color: "#5a2e55", toneMapped: false, fog: false }),
      shed: new MeshBasicMaterial({ color: "#1c1030", toneMapped: false, fog: false }),
      window: new MeshBasicMaterial({ color: new Color(p.accent).multiplyScalar(0.55), toneMapped: false, fog: false }),
      steel: new MeshBasicMaterial({ color: "#d9d3ea", side: DoubleSide, toneMapped: false, fog: false }),
      black: new MeshBasicMaterial({ color: "#0d0a14", side: DoubleSide, toneMapped: false, fog: false }),
      coat: swayMaterial("#150e24"),
    }),
    [p],
  );
  const shots = useMemo(() => {
    const r = seeded(11);
    const list = [];
    const near = (x, y, z, c, d) => Math.hypot(x - c[0], y - c[1], z - c[2]) < d;
    const clusters = [[1.8, 1.9, -1.4], [-1.2, 1.6, -2.4]];
    while (list.length < BULLETS) {
      const i = list.length;
      const cl = i < 12 ? clusters[i % 2] : null; // two mint clusters of six: the long-lived pieces
      const x = cl ? cl[0] + (r() - 0.5) * 0.6 : -2.4 + 6.2 * r();
      const y = cl ? cl[1] + (r() - 0.5) * 0.5 : 0.6 + 2.7 * r();
      const z = cl ? cl[2] + (r() - 0.5) * 0.4 : -3.6 + 4.0 * r();
      if (!cl && ((Math.abs(x) < 1.3 && y < 2.4 && z > -1.8) || (z > -0.4 && Math.abs(x) < 2.0))) continue; // never over the pup
      if (!cl && (near(x, y, z, [0.9, 2.3, -1.9], 0.7) || near(x, y, z, [2.6, 1.4, -0.9], 0.55))) continue; // the rings' holes stay clear
      const a = AGENTS[i % 3];
      list.push({ x, y, z, from: [a[0] + (r() - 0.5) * 0.4, 1.5, a[2] + 0.4], keep: Boolean(cl), len: 0.4 + 0.45 * r(), late: r() * 0.35, yaw: r() * 3.1, td: C0 + ((x + 2.4) / 6.2) * 0.8 + r() * 0.15 });
    }
    return list;
  }, [C0]);
  const bullets = useMemo(() => {
    const m = new InstancedMesh(geo.bullet, mats.bullet, BULLETS);
    m.frustumCulled = false;
    shots.forEach((s, i) => m.setColorAt(i, s.keep ? MINT : CREAM));
    return m;
  }, [geo, mats, shots]);
  const ripples = useMemo(() => {
    const m = new InstancedMesh(geo.ripple, mats.ripple, BULLETS);
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const spans = useMemo(() => {
    // a true barcode: every bar starts at the baseline (the loops a little later), sorted long to short
    const len = [0.95, 0.86, 0.74, 0.22, 0.34, 0.12, 0.28, 0.09, 0.2, 0.15, 0.3, 0.07, 0.17, 0.11, 0.25, 0.06];
    return len.map((d, i) => ({ b: i === 1 ? 0.12 : i === 2 ? 0.06 : 0, d: i === 1 ? 0.12 + 0.74 : i === 2 ? 0.06 + 0.66 : d, hue: i === 1 || i === 0 ? VIOLET : i === 2 ? MINT : CREAM, short: d < 0.4 }));
  }, []);
  const bars = useMemo(() => {
    const m = new InstancedMesh(geo.bar, mats.bar, BARS);
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const logs = useMemo(() => {
    const m = new InstancedMesh(geo.log, mats.wood, 10);
    const o = new Object3D();
    let i = 0;
    for (let row = 0; row < 4; row++) for (let k = 0; k < 4 - row; k++) {
      o.position.set(4.2 + (k - (3 - row) / 2) * 0.58, 0.27 + row * 0.5, -3.6);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i++, new Color(row % 2 ? "#8a4a7e" : "#6d3a66"));
    }
    m.count = i;
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const word = useMemo(() => ({ no: makeWord("No.", "#fbfaf7", 0.42), tink: makeWord("TINK TINK TINK", p.accent, 0.4) }), [p]);
  const sealRef = useRef(null);
  const spoon = useRef();
  const burst = useRef();
  const blade = useRef();
  const band = useRef();
  const rings = useRef();
  const agents = [useRef(), useRef(), useRef()];
  const shadeRefs = [useRef(), useRef(), useRef()];
  const tailRef = useRef();
  const shadeRef = useRef();
  const o = useMemo(() => new Object3D(), []);
  const c = useMemo(() => new Color(), []);
  const v = useMemo(() => new Vector3(), []);
  const hulls = useMemo(() => hullOf(geo.agent), [geo]);

  // the lean: the pup's root tipped back about its own right axis, only inside the scene
  useFrame((state) => {
    const s = (sealRef.current ??= state.scene.getObjectByName("seal"));
    if (!s) return;
    const a = live.arrival;
    const on = a.id && mode === "full";
    if (on) {
      const t = state.clock.elapsedTime - a.start;
      s.rotation.order = "YXZ";
      s.rotation.x = -0.42 * smooth(tl.move[0] - 0.1, tl.move[0] + 0.4, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    } else if (s.rotation.order !== "XYZ") {
      s.rotation.x = 0;
      s.rotation.order = "XYZ";
    }
    // the shades and the coat tails ride the pup's root while the scene runs
    const tr = tailRef.current;
    if (tr && tr.parent !== s) s.add(tr);
    const show = Boolean(on && live.inStage);
    if (tr) tr.visible = show;
    // the shades ride the pup's head group, over its eyes
    const sh = shadeRef.current;
    if (sh) {
      if (!sh.userData.head) {
        const head = headOf(s);
        if (head) {
          s.updateWorldMatrix(true, true);
          const eye = head.children[1].children[0];
          const box = new Box3().setFromObject(eye);
          const a = head.worldToLocal(box.min.clone());
          const b = head.worldToLocal(box.max.clone());
          const w = Math.abs(b.x - a.x);
          sh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(a.z, b.z) + 0.02);
          sh.scale.setScalar(w * 0.62);
          head.add(sh);
          sh.userData.head = head;
        }
      }
      sh.visible = show;
    }
  }, 0.1);
  useEffect(
    () => () => {
      const s = sealRef.current;
      if (s) {
        s.rotation.x = 0;
        s.rotation.order = "XYZ";
        for (const r of [tailRef.current, shadeRef.current]) r?.parent?.remove(r);
        if (shadeRef.current) shadeRef.current.userData.head = null;
      }
    },
    [],
  );

  useCutFrame((t, state) => {
    if (mode !== "full") return;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    const cell = (card.stage?.halftone ?? 6) * state.gl.getPixelRatio();
    tintInk(card, cell * 0.6);
    mats.dome.uniforms.uCell.value = mats.ground.uniforms.uCell.value = cell;
    mats.ground.uniforms.uCenter.value.set(live.seal.x, 0, live.seal.z);
    mats.coat.uniforms.uT.value = t;
    mats.coat.uniforms.uWind.value = 0.4 + 0.9 * smooth(F1 - 0.4, F1, t) * (1 - smooth(C0 + 1.2, C0 + 1.8, t));

    // the pup: the flipper up at the freeze ("No."), held
    live.pose.raise = smooth(F1 - 0.35, F1 - 0.05, t) * fade;

    // the spoon: bends through line A and folds away in a burst, in the child's hand
    const sp = spoon.current;
    const popAt = F0 - 0.05;
    sp.visible = t > tl.enter + 0.1 && t < popAt;
    sp.position.set(1.72, 1.32 + 0.03 * Math.sin(onTwos(t) * 1.4), -0.9);
    sp.scale.setScalar(0.62);
    sp.rotation.set(0, onTwos(t) * 0.7, 0.18);
    mats.spoon.uniforms.uBend.value = smooth(tl.lineA + 0.5, popAt, t) * 2.2;
    const b = Math.max(0, t - popAt);
    const bs = burst.current;
    bs.position.set(1.72, 1.5, -0.9);
    bs.lookAt(state.camera.position);
    bs.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, b / 0.45)) * 1.0));
    mats.burst.opacity = b > 0 ? 0.9 * Math.max(0, 1 - b / 0.45) * fade : 0;

    // the agents fire: the wall of bullets runs in and freezes, a ripple ring round each; the cut greys the short ones and drops them
    shots.forEach((s, i) => {
      const u = Math.min(1, Math.max(0, (t - F0 - s.late * (F1 - F0)) / ((F1 - F0) * (1 - s.late))));
      const k = 1 - (1 - u) ** 3;
      const px = s.from[0] + (s.x - s.from[0]) * k;
      let py = s.from[1] + (s.y - s.from[1]) * k;
      const pz = s.from[2] + (s.z - s.from[2]) * k;
      const dropped = !s.keep && t > s.td;
      const fall = Math.max(0, t - s.td);
      let len = s.len * (1.8 - 0.8 * k);
      const on = u > 0 && fade > 0;
      if (dropped) {
        const y0 = py;
        py = Math.max(0.1, y0 - 4.4 * fall * fall);
        if (py <= 0.1) py += Math.abs(Math.sin((fall - Math.sqrt(Math.max(0, y0 - 0.1) / 4.4)) * 8)) * 0.08 * Math.exp(-fall); // one small bounce in the deck
        len = Math.max(0.3, len - fall * 2);
        o.position.set(px, py, pz);
        o.rotation.set(0, s.yaw, 0);
      } else {
        o.position.set(px, py, pz);
        v.set(s.x - s.from[0], s.y - s.from[1], s.z - s.from[2]);
        o.lookAt(o.position.x + v.x, o.position.y + v.y, o.position.z + v.z);
      }
      o.scale.set(on ? 1 : 0.0001, on ? 1 : 0.0001, on ? len : 0.0001);
      o.updateMatrix();
      bullets.setMatrixAt(i, o.matrix);
      bullets.setColorAt(i, s.keep ? MINT : c.copy(CREAM).lerp(GREY, dropped ? Math.min(1, fall * 5) : 0));
      // the ripple: only while it hangs frozen, wobbling on twos
      const hang = u >= 1 && !dropped && fade > 0;
      o.position.set(px, py, pz);
      o.quaternion.copy(state.camera.quaternion);
      o.scale.setScalar(hang ? 0.085 + 0.03 * Math.sin(onTwos(t) * 9 + i) : 0.0001);
      o.updateMatrix();
      ripples.setMatrixAt(i, o.matrix);
    });
    bullets.instanceMatrix.needsUpdate = ripples.instanceMatrix.needsUpdate = true;
    bullets.instanceColor.needsUpdate = true;
    mats.ripple.opacity = 0.4 * smooth(F1 - 0.3, F1, t);

    // the two loops that last: violet tori in the wall, glowing after the cut
    const ring = rings.current;
    const glowK = 0.7 + 0.3 * smooth(C0 + 0.5, C0 + 1.2, t);
    ring.children[0].position.set(0.9, 2.3, -1.9);
    ring.children[1].position.set(2.6, 1.4, -0.9);
    ring.children[0].scale.setScalar(0.5);
    ring.children[1].scale.setScalar(0.4);
    for (const rc of ring.children) rc.quaternion.copy(state.camera.quaternion);
    mats.violet.opacity = 0.9 * smooth(F1 - 0.4, F1, t) * glowK * fade;

    // the saw blade: sweeps across the frame and a bright band with it
    const sw = smooth(C0, C0 + 0.9, t);
    const bl = blade.current;
    bl.visible = sw > 0 && sw < 1;
    bl.position.set(-5.2 + 10.4 * sw, 1.7, -2.3);
    bl.rotation.z = -t * 22;
    bl.scale.setScalar(0.55);
    const bd = band.current;
    bd.position.set(-5.2 + 10.4 * sw, 1.9, -2.3);
    mats.band.opacity = 0.8 * (sw > 0 && sw < 1 ? 1 : 0) * fade;
    bd.scale.set(1, 1, 1);

    // the barcode: draws bar by bar from one baseline; short bars grey out and drop as the cut passes
    const draw0 = tl.lineB - 0.1;
    spans.forEach((s, i) => {
      const grow = onTwos(smooth(draw0 + i * 0.05, draw0 + i * 0.05 + 0.4, t));
      const gone = s.short ? smooth(C0 + 0.1 + i * 0.04, C0 + 0.4 + i * 0.04, t) : 0;
      const dx = BAR_W * s.b;
      o.position.set(BAR_AT[0] + dx, BAR_AT[1] + (BARS - 1 - i) * ROW - 0.5 * gone, BAR_AT[2]);
      o.rotation.set(0, 0, 0);
      const on = grow > 0 && fade > 0;
      o.scale.set(on ? Math.max(0.0001, BAR_W * (s.d - s.b) * grow * (1 - 0.3 * gone)) : 0.0001, on ? 0.07 : 0.0001, on ? 0.05 : 0.0001);
      o.updateMatrix();
      bars.setMatrixAt(i, o.matrix);
      bars.setColorAt(i, c.copy(s.hue).lerp(GREY, s.short ? Math.min(1, gone * 1.6) : 0));
    });
    bars.instanceMatrix.needsUpdate = true;
    bars.instanceColor.needsUpdate = true;

    // the agents step in on twos and their shades slip; the word "No."
    const inF = Math.floor((t - tl.enter) * 12);
    const outF = Math.floor((t - tl.collapse[0]) * 12);
    const frame = outF >= 0 ? 2 - outF : inF;
    const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];
    const [sx, sy] = ENTER[frame] ?? [1, 1];
    agents.forEach((ag, i) => {
      const g = ag.current;
      g.visible = frame >= 0;
      g.scale.set(1.2 * sx, 1.2 * sy, 1.2 * sx);
      g.rotation.set(0, i === 0 ? 0.3 : i === 2 ? -0.3 : 0, 0.012 * Math.sin(onTwos(t) * 2 + i));
      const slip = onTwos(smooth(C0 + 0.9 + i * 0.12, C0 + 1.3 + i * 0.12, t));
      shadeRefs[i].current.position.set(0, 1.93 + 0.0 - 0.06 * slip, 0.16);
    });
    const no = word.no;
    no.position.set(-1.05, 1.3, 0.5);
    no.quaternion.copy(state.camera.quaternion);
    no.material.opacity = pulse(t, F1 - 0.1, F1 + 1.1, 0.12) * fade;
    const tk = word.tink;
    tk.position.set(0.6, 0.55, 0.8);
    tk.quaternion.copy(state.camera.quaternion);
    tk.material.opacity = pulse(t, C0 + 0.35, C0 + 1.2, 0.1) * fade;
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <mesh geometry={geo.dome} material={mats.dome} renderOrder={-2} frustumCulled={false} />
        <mesh geometry={geo.ground} material={mats.ground} position={[0, -0.01, 0]} />
        <primitive object={logs} />
        <mesh geometry={geo.sitlog} material={mats.woodLit} position={[2.1, 0.22, -1.1]} />
        <mesh geometry={geo.rail} material={mats.woodLit} position={[-1.2, 0.5, -6.2]} />
        <mesh geometry={geo.shed} material={mats.shed} position={[1.4, 1.1, -9.6]} />
        <mesh geometry={geo.roof} material={mats.shed} position={[1.4, 2.5, -9.6]} />
        <mesh geometry={geo.win} material={mats.window} position={[0.8, 1.2, -8.37]} />
        <mesh geometry={geo.stack} material={mats.shed} position={[3.4, 2.6, -9.6]} />
        <mesh ref={spoon} geometry={geo.spoon} material={mats.spoon} visible={false} />
        <mesh ref={burst} geometry={geo.burst} material={mats.burst} />
        <primitive object={bullets} />
        <primitive object={ripples} />
        <group ref={rings}>
          <mesh geometry={geo.torus} material={mats.violet} />
          <mesh geometry={geo.torus} material={mats.violet} />
        </group>
        <primitive object={bars} />
        <group ref={blade} visible={false}>
          <mesh geometry={geo.blade} material={mats.steel} position={[0, 0, 0]} />
        </group>
        <mesh ref={band} geometry={geo.band} material={mats.band} />
        {AGENTS.map((a, i) => (
          <group key={i} ref={agents[i]} position={a} visible={false}>
            <mesh geometry={hulls} material={inkPair().rim} />
            <mesh geometry={geo.agent} material={inkPair().body} />
            <mesh ref={shadeRefs[i]} geometry={geo.shades} material={mats.cream} position={[0, 1.93, 0.16]} />
          </group>
        ))}
        {word.no ? <primitive object={word.no} /> : null}
        {word.tink ? <primitive object={word.tink} /> : null}
      </Rig>
      <group ref={shadeRef} visible={false}>
        {[-1, 1].map((k) => (
          <mesh key={k} geometry={geo.round} material={mats.black} position={[k * 0.28, 0, 0]} />
        ))}
        <mesh geometry={geo.bridge} material={mats.black} />
      </group>
      <group ref={tailRef} visible={false}>
        {[-0.22, 0, 0.22].map((x) => (
          <mesh key={x} geometry={geo.coat} material={mats.coat} position={[x, 0.5, -0.45]} rotation={[0.8, 0, x * 0.4]} />
        ))}
      </group>
    </>
  );
}
