"use client";

// The Topograph moat: Gandalf on the bridge of Khazad-dum ("You shall not
// pass." / "You shall not list."). THE PUP is the gatekeeper: on a narrow ice
// bridge over a black chasm it winds up (a squash, then a stretch), raises a
// mint-crystal staff and slams it into the ice ("DOGON!"). Two mint walls with
// soft edges stand up from the strike; the Balrog's three coral whips (pods,
// nodes, daemonsets), lashing at the pup, hit them and snap back low, middle,
// high, each with a spark ("PAKIN"); the YES cards its flood bounce off the
// wall and pile on the deck; the ice cracks under the Balrog's side only
// ("GARA GARA") and it falls into the chasm with its wings folded, ice chips
// after it. The pup's half holds. Frodo, tiny at the far end, screams
// "Gandeal!!". Ink silhouettes only for the Balrog (horned mass, ember eyes)
// and Frodo (a hood, a blue blade). Cost: bridge 4 meshes, walls 2, whips 1
// instanced, cards 1 instanced, chips 1 instanced, Balrog 1 ink mesh (+rim),
// staff 1, glow 1, crack 1, sparks 3, ring 1, letters 6. No post pass.
// Card: lib/world/cutscene/cards/pr-topograph-432.js.

import { useMemo, useRef } from "react";
import {
  AdditiveBlending, BoxGeometry, CanvasTexture, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, RingGeometry, SRGBColorSpace, ShaderMaterial, Vector3,
} from "three";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { CREAM, FigureAttach, PLANE, flatMat, flipperAt, inkGeo, inkMats, letterMat, letterTex, limb, merged, shaded, starGeo, tint, useCredit, usePupPost, useStageGroup } from "./g3/common";

const MINT = "#6ff0c4";
const CORAL = "#ff6b57";
const N = 30; // YES cards
const WHIPS = 3;
const SEG = 24;
const CHIPS = 14;
const B = [3.0, 0, -1.7]; // the Balrog's feet
const BS = 0.62; // its scale
const HAND = [2.15, 1.3, -1.0]; // its whip hand
const WALL = [
  { x: 1.2, rot: -0.6 }, // between the pup and the Balrog
  { x: -1.2, rot: 0.6 },
];

const slabGeo = (x0, x1) => {
  const g = new BoxGeometry(x1 - x0, 0.32, 1.7, 3, 1, 2).translate((x0 + x1) / 2, -0.16, 0.1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const under = p.getY(i) < -0.1;
    if (under) {
      p.setZ(i, (p.getZ(i) - 0.1) * 0.62 + 0.1);
      p.setX(i, p.getX(i) + Math.sin(i * 1.7) * 0.1);
      p.setY(i, p.getY(i) - 0.1 - 0.06 * Math.abs(Math.sin(i * 2.9)));
    } else p.setY(i, p.getY(i) + 0.012 * Math.sin(i * 3.1));
  }
  return shaded([g], "#bfe3ee", 0.5);
};

// the Balrog: a horned ink mass, shoulders, wings of flame-edged blades
function balrog() {
  const parts = [
    new IcosahedronGeometry(0.78, 1).scale(1, 1.55, 0.8).translate(0, 1.8, 0),
    limb([-0.33, 0, 0], [-0.4, 1.3, 0], 0.26, 0.3),
    limb([0.33, 0, 0], [0.4, 1.3, 0], 0.26, 0.3),
    new IcosahedronGeometry(0.4, 1).scale(1, 1.1, 1).translate(0, 3.12, 0.08),
    new ConeGeometry(0.11, 0.95, 5).rotateZ(0.5).translate(-0.58, 3.55, 0.05), // the horns
    new ConeGeometry(0.11, 0.95, 5).rotateZ(-0.5).translate(0.58, 3.55, 0.05),
    limb([-0.8, 2.5, 0], [-1.5, 2.0, 0.28], 0.17, 0.12), // the arm that lashes
    limb([0.8, 2.5, 0], [1.2, 1.5, 0.1], 0.17, 0.12),
  ];
  const wing = (s) => {
    const blades = [];
    for (let i = 0; i < 5; i++) {
      const a = (30 + i * 28) * (Math.PI / 180);
      const len = 1.5 + 0.5 * Math.sin(i * 1.3);
      blades.push(limb([s * 0.7, 2.6, -0.3], [s * (0.7 + Math.sin(a) * len), 2.6 + Math.cos(a) * len * 0.9 + 0.3, -0.5], 0.13, 0.015));
    }
    return blades;
  };
  return { body: inkGeo(parts), wingL: inkGeo(wing(-1)), wingR: inkGeo(wing(1)) };
}

// the staff: a stick and a mint octahedron, from the foot up (the grip is 0.35 above it)
const staffGeo = () =>
  merged([
    tint(new CylinderGeometry(0.035, 0.045, 1.7, 6).translate(0, 0.85, 0), CREAM),
    tint(new OctahedronGeometry(0.17, 0).scale(1, 1.5, 1).translate(0, 1.88, 0), "#6ff0c4"),
  ]);

// a thin wall of mint light with soft edges: alpha falls off at the sides and the top
function wallMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uColor: { value: new Color(MINT) }, uCell: { value: 7 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uCell;
      varying vec2 vUv;
      void main() {
        float side = smoothstep(0.0, 0.22, vUv.x) * (1.0 - smoothstep(0.78, 1.0, vUv.x));
        float top = 1.0 - smoothstep(0.55, 1.0, vUv.y);
        vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
        float dots = 1.0 - smoothstep(0.3, 0.42, length(fract(p) - 0.5));
        float a = side * top * (0.42 + 0.4 * dots) + side * (1.0 - smoothstep(0.0, 0.1, vUv.y)) * 0.6;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
}

function glowTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,120,80,0.9)");
  gr.addColorStop(0.5, "rgba(255,90,60,0.35)");
  gr.addColorStop(1, "rgba(255,90,60,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// the YES card: a cream card with a green YES lettered on it
function yesTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 170;
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const draw = () => {
    const x = c.getContext("2d");
    const fam = getComputedStyle(document.body).getPropertyValue("--font-comic").trim() || "sans-serif";
    x.clearRect(0, 0, 256, 170);
    x.fillStyle = "#2a1c14";
    x.fillRect(0, 0, 256, 170);
    x.fillStyle = CREAM;
    x.fillRect(10, 10, 236, 150);
    x.fillStyle = "#2fb457";
    x.font = `800 96px ${fam}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("YES", 128, 90);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 96px ${getComputedStyle(document.body).getPropertyValue("--font-comic").trim() || "sans-serif"}`, "YES").then(draw, () => {});
  return t;
}

const addMat = (hex, opacity = 1) => new MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false });
const xb = (z) => 1.2 + (z + 0.1) / 0.68 - 0.1; // where a card meets the near wall

export default function Move(cut) {
  const { tl } = cut;
  const root = useRef();
  const r = {
    bridgeL: useRef(), s1: useRef(), s2: useRef(), s3: useRef(), crack: useRef(),
    wallA: useRef(), wallB: useRef(), whips: useRef(), cards: useRef(), chips: useRef(),
    bal: useRef(), wL: useRef(), wR: useRef(), glow: useRef(), staff: useRef(), ring: useRef(),
    sp: [useRef(), useRef(), useRef()], lt: [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef()],
  };
  const grip = useRef([-0.5, 0.6, 0.7]);
  const [m0, m1] = tl.move;
  const S = m1 - 0.1; // the staff comes down

  const g = useMemo(() => {
    let seed = 13;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cards = Array.from({ length: N }, (_, i) => {
      const z = -0.15 + 0.95 * rand();
      return { ts: S + 0.1 + 0.55 * rand(), x0: 5.4 + 1.5 * rand(), y0: 0.5 + 1.5 * rand(), z, xb: xb(z), rest: 0.1 + 0.04 * (i % 7), dx: 0.15 + 0.5 * rand(), vy: 1.5 + 2.5 * rand(), spin: (rand() - 0.5) * 9 };
    });
    const bal = balrog();
    const lettering = [["GOOOOO", CORAL, 120], ["DOGON!", MINT, 120], ["PAKIN", CORAL, 100], ["GARA GARA", "#d6f3ff", 100], ["Gandeal!!", MINT, 90], ["BAKI", MINT, 100]].map(([t, c, s]) => letterTex(t, c, s));
    const whips = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.7, 0.7, 1.4), new MeshBasicMaterial({ color: CORAL, toneMapped: false, fog: false }), WHIPS * SEG);
    whips.frustumCulled = false;
    const cardsMesh = new InstancedMesh(new PlaneGeometry(0.5, 0.33), new MeshBasicMaterial({ map: yesTex(), side: DoubleSide, toneMapped: false, fog: false }), N);
    cardsMesh.frustumCulled = false;
    const chips = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ color: "#d7f1fb", toneMapped: false, fog: false }), CHIPS);
    chips.frustumCulled = false;
    return {
      cards,
      bal,
      lettering,
      slabs: [slabGeo(-4.4, 0.5), slabGeo(0.5, 2.5), slabGeo(2.5, 4.3), slabGeo(4.3, 6.4)],
      ice: flatMat(),
      chasm: new PlaneGeometry(40, 6.5).rotateX(-Math.PI / 2),
      chasmMat: new MeshBasicMaterial({ color: "#03101a", toneMapped: false, fog: false }),
      crack: merged([[1.5, 0.02, -0.05, 1.5], [0.7, -0.3, 0.35, 0.5], [0.7, 0.3, -0.4, -0.4], [0.5, -0.2, -0.1, 0.9]].map(([len, x, z, a]) => tint(new BoxGeometry(len, 0.02, 0.05).rotateY(a).translate(x, 0.006, z), "#0b2a3d"))),
      wall: new PlaneGeometry(1.6, 2.2).translate(0, 1.1, 0),
      wallMat: wallMaterial(),
      whips,
      cardsMesh,
      chips,
      staff: staffGeo(),
      glowMat: new MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false, opacity: 0.6 }),
      lt: lettering,
      ltMat: lettering.map(letterMat),
      ring: new RingGeometry(0.8, 1, 36).rotateX(-Math.PI / 2),
      ringMat: addMat("#ffffff", 1),
      star: starGeo(1, 0.16),
      starMat: addMat("#ffd9cc", 1),
      hood: inkGeo([new ConeGeometry(0.3, 0.9, 7, 1, true).translate(0, 0.5, -0.02), new ConeGeometry(0.2, 0.34, 7).translate(0, 1.36, 0)]),
      blade: new BoxGeometry(0.035, 0.5, 0.02).translate(-0.34, 0.8, 0.12),
      blue: addMat("#7fc4ff", 0.95),
      emberMat: new MeshBasicMaterial({ color: "#ff8a5c", toneMapped: false, fog: false }),
      o: new Object3D(),
      v: new Vector3(),
    };
  }, [S]);

  // the pup: winds up (squash), stretches with the staff up, then holds
  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    live.pose.crouch = 0.9 * smooth(m0 - 0.1, m0 + 0.2, t) * (1 - smooth(m0 + 0.25, m0 + 0.4, t));
  });
  usePupPost(cut, (t, rig) => {
    const T = onTwos(t);
    const up = smooth(m0 + 0.25, m0 + 0.55, T);
    const slam = smooth(S - 0.04, S + 0.06, T);
    const e = rig.flipR.rotation;
    const to = { x: 0, y: -0.6 + -0.3 * slam, z: 1.05 - 0.95 * slam };
    const w = Math.max(up, slam);
    rig.flipR.rotation.set(e.x + (to.x - e.x) * w, e.y + (to.y - e.y) * w, e.z + (to.z - e.z) * w, "YZX");
    rig.flipR.position.z += 0.3 * w;
    const stretch = up * (1 - slam) * 0.1 - 0.06 * slam * Math.exp(-(T - S) * 8) * 0;
    rig.seal.scale.set(1 - stretch * 0.5, 1 + stretch, 1 - stretch * 0.5);
    rig.tail.rotation.x += (T > S ? 0.5 * Math.exp(-(T - S) * 7) * Math.cos((T - S) * 24) : 0.4 * up);
    if (root.current) {
      const p = flipperAt(rig.flipR, root.current, [0.62, 0.06, 0]);
      grip.current = [p.x, p.y, p.z];
    }
  });

  useCredit(cut, "dsx-ai-factory/topograph #432", "145 lines gated", "Pods, nodes and daemonsets: no longer granted cluster wide.");

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const o = g.o;
    const hit = T - S; // seconds since the blow
    // the bridge grows out from the pup, the chasm glows under the Balrog
    const grow = Math.max(0.001, smooth(tl.enter - 0.25, tl.enter + 0.2, T));
    r.bridgeL.current.scale.set(grow, 1, 1);
    const fall = (i) => {
      const tau = T - (S + 0.5 + 0.22 * i);
      return tau > 0 ? tau : 0;
    };
    [[r.s1, 0, 0], [r.s2, 1, 1], [r.s3, 2, 2]].forEach(([ref, , i]) => {
      const m = ref.current;
      const tau = i === 0 ? 0 : fall(i);
      m.position.set(0, -2.6 * tau * tau - (i === 0 ? 0.0 : 0), 0);
      m.rotation.set(0, 0, 0.25 * tau * (i % 2 ? 1 : -1));
      m.scale.set(grow, 1, 1);
      m.visible = tau < 2.2;
    });
    // the cracks, only on the Balrog's side
    const ck = r.crack.current;
    const cr = smooth(S + 0.25, S + 0.5, T);
    ck.visible = cr > 0.01 && fall(1) < 0.6;
    ck.position.set(2.5, 0.006, 0.1);
    ck.scale.set(1, 1, Math.max(0.001, cr));
    // the staff, held at the grip, foot 0.35 below it
    const [gx, gy, gz] = grip.current;
    const st = r.staff.current;
    st.position.set(gx, gy - 0.35, gz + 0.04);
    st.rotation.z = -0.06;
    st.visible = T > m0 - 0.2;
    // the walls stand up from the strike
    WALL.forEach((w, i) => {
      const m = i ? r.wallB.current : r.wallA.current;
      const k = smooth(S, S + 0.22, T);
      m.visible = k > 0.01;
      m.position.set(w.x, 0, -0.1);
      m.rotation.y = w.rot;
      m.scale.set(1, Math.max(0.001, k), 1);
    });
    // the Balrog rises behind the bridge, lashes, then falls with its side of the ice
    const rise = smooth(tl.enter + 0.5, tl.enter + 0.95, T);
    const down = fall(1) > 0 ? fall(1) + 0.1 : 0;
    const by = -2.6 * (1 - rise) - 2.4 * down * down;
    const bal = r.bal.current;
    bal.position.set(B[0], by, B[2]);
    bal.scale.setScalar(BS);
    bal.rotation.z = 0.2 * down;
    bal.visible = rise > 0.01 && by > -9;
    const fold = 1 - 0.85 * smooth(S + 0.3, S + 0.8, T);
    const flap = 1 + 0.07 * Math.sin(T * 14) * (hit < 0.4 ? 1 : 0);
    r.wL.current.scale.set(fold * flap, 1, 1);
    r.wR.current.scale.set(fold * flap, 1, 1);
    r.glow.current.visible = bal.visible;
    r.glow.current.position.set(B[0] - 0.3, 1.6 + by * 0.4, -2.3);
    r.glow.current.scale.setScalar(6.5);
    g.glowMat.opacity = 0.65 * rise * (1 - smooth(S + 0.6, S + 1.3, T) * 0.7);
    // three whips: lash across to the pup, then each snaps back off the wall
    const wh = r.whips.current;
    const lash = smooth(tl.enter + 0.75, tl.enter + 1.3, T);
    for (let w = 0; w < WHIPS; w++) {
      const yt = [0.45, 1.0, 1.55][w];
      const ts = S + 0.05 + 0.13 * w;
      const rec = smooth(ts, ts + 0.22, T);
      const reach = (1 - rec) * lash; // 1: out across, 0: coiled at the hand
      const tipX = HAND[0] - (HAND[0] - 0.1) * reach - 0.0;
      for (let s = 0; s < SEG; s++) {
        const u = s / (SEG - 1);
        const amp = 0.18 * (1 - reach * 0.6) + (rec > 0 && rec < 1 ? 0.35 * Math.sin(rec * Math.PI) : 0);
        const x = HAND[0] + (tipX - HAND[0]) * u;
        const y = HAND[1] + (yt - HAND[1]) * u * u + amp * Math.sin(u * 9 - T * 12 + w) * u;
        const z = HAND[2] + (0.15 - HAND[2]) * u * u * (0.4 + 0.6 * reach);
        o.position.set(x, y, z);
        o.rotation.set(0, 0, Math.atan2(yt - HAND[1], tipX - HAND[0]) * 0.5);
        o.scale.setScalar(Math.max(0.0001, (0.07 + 0.05 * (1 - u)) * (lash > 0.02 ? 1 : 0)));
        o.updateMatrix();
        wh.setMatrixAt(w * SEG + s, o.matrix);
      }
      // the spark where it met the wall
      const sp = r.sp[w].current;
      const age = T - ts;
      sp.visible = age >= 0 && age < 0.25;
      if (sp.visible) {
        sp.position.set(xb(0.3) - 0.35, yt, 0.35);
        sp.scale.setScalar(0.28 * (1 + 2 * age));
        sp.rotation.z = age * 6;
      }
    }
    wh.instanceMatrix.needsUpdate = true;
    // the YES flood: in from the Balrog's side, off the wall, onto the deck
    const cm = r.cards.current;
    for (let i = 0; i < N; i++) {
      const c = g.cards[i];
      const tb = c.ts + (c.x0 - c.xb) / 8;
      let x;
      let y;
      let rx = 0;
      let rz = 0;
      let s = 1;
      if (T < c.ts) s = 0.0001;
      if (T < tb) {
        x = c.x0 - 8 * Math.max(0, T - c.ts);
        y = c.y0;
        rz = 0.1 * Math.sin(i);
      } else {
        const tau = T - tb;
        const k = 1 - Math.exp(-3.2 * tau);
        x = c.xb + Math.min(c.dx + 0.2, 2.45 - c.xb) * k * 0.9;
        y = Math.max(c.rest, c.y0 + c.vy * tau - 4.9 * tau * tau);
        rx = (-Math.PI / 2) * smooth(0.25, 0.95, tau);
        rz = c.spin * Math.min(tau, 0.6) * (1 - smooth(0.5, 0.95, tau));
      }
      o.position.set(x, y, c.z);
      o.rotation.set(rx, 0, rz);
      o.scale.setScalar(Math.max(0.0001, s * 0.95));
      o.updateMatrix();
      cm.setMatrixAt(i, o.matrix);
    }
    cm.instanceMatrix.needsUpdate = true;
    // ice chips fall from the crack into the chasm
    const cp = r.chips.current;
    for (let i = 0; i < CHIPS; i++) {
      const tau = ((T - (S + 0.4 + 0.12 * i)) % 1.9 + 1.9) % 1.9;
      const on = T > S + 0.4 + 0.12 * i;
      o.position.set(2.4 + 0.9 * Math.sin(i * 2.3) + 0.2 * tau, -0.15 - 2.8 * tau * tau, 0.3 * Math.cos(i * 1.7));
      o.rotation.set(tau * 5, i, tau * 3);
      o.scale.setScalar(on ? 0.06 + 0.03 * (i % 3) : 0.0001);
      o.updateMatrix();
      cp.setMatrixAt(i, o.matrix);
    }
    cp.instanceMatrix.needsUpdate = true;
    // the snow-puff ring at the strike
    const rg = r.ring.current;
    rg.visible = hit >= 0 && hit < 0.5;
    if (rg.visible) {
      rg.position.set(gx, 0.03, gz);
      rg.scale.setScalar(0.25 + 0.9 * Math.min(1, hit / 0.45));
      g.ringMat.opacity = 1 - hit / 0.5;
    }
    // the lettering, each on its beat: GOOOOO, DOGON!, PAKIN x3, GARA GARA, Gandeal!!
    const put = (ref, lt, x, y, z, h, a0, a1, rot = 0.08) => {
      const m = ref.current;
      const age = T - a0;
      m.visible = age >= 0 && T < a1;
      if (m.visible) {
        const pop = 1 + 0.35 * Math.exp(-age * 12);
        m.position.set(x, y, z);
        m.scale.set(h * lt.aspect * pop, h * pop, 1);
        m.rotation.z = rot;
      }
    };
    put(r.lt[0], g.lettering[0], 2.6, 3.0, -2.6, 1.3, tl.enter + 0.55, tl.enter + 1.45);
    put(r.lt[1], g.lettering[1], gx - 1.5, 2.35, 0.5, 0.95, S, S + 1.0);
    for (let w = 0; w < 3; w++) put(r.lt[2 + w], g.lettering[2], 1.25 + 0.08 * w, 0.8 + 0.6 * w, 0.6, 0.3, S + 0.05 + 0.13 * w, S + 0.5 + 0.13 * w, -0.1 + 0.1 * w);
    put(r.lt[5], g.lettering[3], 2.2, 0.75, 0.9, 0.42, S + 0.3, S + 1.4);
    put(r.lt[6], g.lettering[4], -1.7, 1.55, -0.8, 0.34, S + 0.35, S + 1.7);
  });

  const ink = inkMats();
  const [b0, b1, b2, b3] = g.slabs;
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <FigureAttach {...cut}>
        <mesh geometry={g.hood.outline} material={ink.outline} />
        <mesh geometry={g.hood.ink} material={ink.ink} />
        <mesh geometry={g.blade} material={g.blue} />
      </FigureAttach>
      <group ref={root} visible={false}>
        <mesh geometry={g.chasm} material={g.chasmMat} position={[0, -0.55, -0.7]} />
        <mesh ref={r.bridgeL} geometry={b0} material={g.ice} />
        <mesh ref={r.s1} geometry={b1} material={g.ice} />
        <mesh ref={r.s2} geometry={b2} material={g.ice} />
        <mesh ref={r.s3} geometry={b3} material={g.ice} />
        <mesh ref={r.crack} geometry={g.crack} material={g.ice} visible={false} />
        <mesh ref={r.glow} geometry={PLANE} material={g.glowMat} visible={false} />
        <group ref={r.bal} visible={false}>
          <mesh geometry={g.bal.body.outline} material={ink.outline} />
          <mesh geometry={g.bal.body.ink} material={ink.ink} />
          <group ref={r.wL} position={[-0.7, 2.6, -0.3]}>
            <group position={[0.7, -2.6, 0.3]}>
              <mesh geometry={g.bal.wingL.outline} material={ink.outline} />
              <mesh geometry={g.bal.wingL.ink} material={ink.ink} />
            </group>
          </group>
          <group ref={r.wR} position={[0.7, 2.6, -0.3]}>
            <group position={[-0.7, -2.6, 0.3]}>
              <mesh geometry={g.bal.wingR.outline} material={ink.outline} />
              <mesh geometry={g.bal.wingR.ink} material={ink.ink} />
            </group>
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, 3.15, 0.45]} material={g.emberMat}>
              <icosahedronGeometry args={[0.05, 0]} />
            </mesh>
          ))}
        </group>
        <primitive ref={r.whips} object={g.whips} />
        <mesh ref={r.wallA} geometry={g.wall} material={g.wallMat} visible={false} />
        <mesh ref={r.wallB} geometry={g.wall} material={g.wallMat} visible={false} />
        <primitive ref={r.cards} object={g.cardsMesh} />
        <primitive ref={r.chips} object={g.chips} />
        <mesh ref={r.staff} geometry={g.staff} material={g.ice} visible={false} />
        <mesh ref={r.ring} geometry={g.ring} material={g.ringMat} visible={false} />
        {r.sp.map((ref, i) => (
          <mesh key={i} ref={ref} geometry={g.star} material={g.starMat} visible={false} renderOrder={6} />
        ))}
        {r.lt.map((ref, i) => (
          <mesh key={i} ref={ref} geometry={PLANE} material={g.ltMat[[0, 1, 2, 2, 2, 3, 4][i]]} visible={false} renderOrder={9} />
        ))}
      </group>
    </>
  );
}
