"use client";

// The Resolvent: Aizen on his throne in Las Noches ("Since when were you
// under the impression they were two?"). Black sky, pale sand and a crescent
// moon (a bespoke dome); a tall low-poly seal chair whose backrest is the
// hut's banded ice core (monuments/Smatrix.jsx). The pup walks the sand with
// two afterimages of itself (softmax amber, the Markov path cyan: the same
// mesh, translucent, rimmed); on the move they slam into it, it cracks like
// glass and shatters (Kyoka Suigetsu): it was never there. The real pup is
// already on the throne in Aizen's seated pose, chin on a flipper, tail over
// the armrest, one slow blink, while Aizen (coat with a white rim, one swept
// lock, two lens strokes and a glint) stands behind and the colony hypes
// below: ten costume-pup silhouettes from life/seals-seed.js LOOKS, one draw
// call, bouncing on twos (OOOH, !!, SUGEE). Cost: dome 1, throne 1, crowd 1,
// ghosts 4, shards 1, crack 1, coat 2, lock 1, lenses 1, letters 6.
// Card: lib/world/cutscene/cards/p-resolvent.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { CREAM, FigureAttach, narrowK, PLANE, colorBar, flatMat, inkGeo, inkMats, letterMat, letterTex, merged, pupRig, shaded, starGeo, tint, useCredit, usePupPost, useStageGroup } from "./g3/common";

const THRONE = [1.55, 0, -1.25];
const SEAT = [THRONE[0], 0.78 * 0.9, THRONE[2] + 0.2];
const CROWD = 10;
const SHARDS = 44;
const CELLS = [["saiyan", "#ffd34d"], ["ninja", "#ff7a59"], ["sorcerer", "#b78cff"], ["demonKing", "#ff4d6d"], ["magi", "#5cd6ff"], ["straw", "#ffc857"], ["flame", "#ff8a3d"], ["buns", "#ff9ec7"], ["goggles", "#6df0c8"], ["hardHat", "#ffe14d"]];

// ---- Las Noches: a black sky, pale sand, a crescent moon (a dome about the lens) ----
function lasNoches() {
  return new ShaderMaterial({
    side: BackSide,
    transparent: true, // drawn with the stage's own night (transparent, renderOrder -1), after it
    depthWrite: false,
    uniforms: { uMoon: { value: new Vector3(-0.42, 0.16, -1).normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoon;
      varying vec3 vW;
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        float h = v.y;
        vec3 sky = mix(vec3(0.012, 0.012, 0.03), vec3(0.0, 0.0, 0.008), smoothstep(0.0, 0.7, h));
        sky += vec3(0.16, 0.15, 0.22) * exp(-abs(h) * 22.0) * 0.55; // a pale haze on the horizon
        float depth = clamp(-h * 2.6, 0.0, 1.0);
        float dune = sin(atan(v.x, v.z) * 9.0 + depth * 7.0) * 0.5 + 0.5;
        vec3 sand = mix(vec3(0.9, 0.84, 0.72), vec3(0.42, 0.39, 0.37), depth) + vec3(0.05, 0.045, 0.04) * dune * (1.0 - depth);
        float below = 1.0 - smoothstep(-0.012, 0.012, h);
        vec3 col = mix(sky, sand, below);
        // the crescent: a disc minus an offset disc, in tangent space about the moon
        vec3 m = normalize(uMoon);
        vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), m));
        vec3 u = cross(m, r);
        float f = dot(v, m);
        vec2 p = vec2(dot(v, r), dot(v, u)) / max(f, 0.2);
        float outer = 1.0 - smoothstep(0.112, 0.12, length(p));
        float cut = smoothstep(0.1, 0.108, length(p - vec2(0.055, 0.03)));
        float moon = outer * cut * step(0.0, f);
        col = mix(col, vec3(0.93, 0.92, 0.82), moon);
        col += vec3(0.5, 0.5, 0.45) * exp(-length(p) * 7.0) * 0.12 * step(0.0, f);
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}

// ---- the throne, in the pup's space about THRONE: steps, seat, arms, the ice core as the backrest ----
function throne() {
  const bands = [];
  const cols = [];
  for (let i = 0; i < 6; i++) {
    bands.push(new CylinderGeometry(0.46, 0.5, 0.32, 10).translate(0, 0.78 + 0.16 + i * 0.32, -0.42));
    cols.push(i % 2 ? "#7f98b3" : "#dfeaf4");
  }
  return shaded(
    [
      new BoxGeometry(2.0, 0.18, 1.6).translate(0, 0.09, 0),
      new BoxGeometry(1.62, 0.18, 1.28).translate(0, 0.27, 0),
      new BoxGeometry(1.14, 0.42, 0.96).translate(0, 0.57, 0.02),
      new BoxGeometry(0.17, 0.42, 0.9).translate(-0.63, 0.99, 0),
      new BoxGeometry(0.17, 0.42, 0.9).translate(0.63, 0.99, 0),
      ...bands,
      new ConeGeometry(0.34, 0.5, 10).translate(0, 0.78 + 6 * 0.32 + 0.25, -0.42),
    ],
    ["#a9c4d8", "#b9d0e0", "#cfe0ec", "#9ab6cc", "#9ab6cc", ...cols, "#fbfaf7"],
    0.5,
  );
}

// ---- the colony's costume silhouettes: one atlas, drawn in ink with an accent rim ----
function atlas() {
  const cw = 128;
  const ch = 160;
  const c = document.createElement("canvas");
  c.width = cw * 5;
  c.height = ch * 2;
  const x = c.getContext("2d");
  const INK = "#1d1240";
  CELLS.forEach(([name, accent], i) => {
    x.save();
    x.translate((i % 5) * cw + cw / 2, Math.floor(i / 5) * ch + 98);
    x.lineJoin = "round";
    const shape = (fn) => {
      x.beginPath();
      fn();
      x.fillStyle = INK;
      x.fill();
      x.strokeStyle = accent;
      x.lineWidth = 5;
      x.stroke();
    };
    shape(() => x.ellipse(0, 22, 34, 34, 0, 0, Math.PI * 2)); // the body
    shape(() => x.arc(-30, 38, 11, 0, Math.PI * 2)); // flippers up
    shape(() => x.arc(30, 38, 11, 0, Math.PI * 2));
    shape(() => x.arc(0, -22, 33, 0, Math.PI * 2)); // the round head, no ears
    const tri = (pts) => shape(() => pts.forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py))) || x.closePath());
    if (name === "saiyan") [[-26, -46, -32, -84, -12, -52], [-8, -52, -2, -96, 8, -52], [10, -50, 30, -88, 28, -46]].forEach((p) => tri([[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]]));
    if (name === "ninja") {
      shape(() => x.rect(-34, -34, 68, 12));
      tri([[32, -30], [56, -42], [50, -22]]);
    }
    if (name === "sorcerer") {
      shape(() => x.ellipse(0, -46, 52, 10, 0, 0, Math.PI * 2));
      tri([[-24, -48], [0, -110], [24, -48]]);
    }
    if (name === "demonKing") [-1, 1].forEach((s) => tri([[s * 14, -50], [s * 40, -92], [s * 30, -42]]));
    if (name === "magi") {
      shape(() => x.rect(-24, -92, 48, 46));
      shape(() => x.ellipse(0, -46, 38, 8, 0, 0, Math.PI * 2));
    }
    if (name === "straw") {
      shape(() => x.ellipse(0, -48, 56, 12, 0, 0, Math.PI * 2));
      shape(() => x.arc(0, -48, 26, Math.PI, 0));
    }
    if (name === "flame") [[-22, -48, -34, -88, -4, -52], [-4, -50, 6, -104, 22, -50], [18, -50, 40, -84, 34, -42]].forEach((p) => tri([[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]]));
    if (name === "buns") [-1, 1].forEach((s) => shape(() => x.arc(s * 28, -54, 15, 0, Math.PI * 2)));
    if (name === "goggles") {
      shape(() => x.rect(-34, -38, 68, 9));
      [-1, 1].forEach((s) => shape(() => x.arc(s * 14, -44, 11, 0, Math.PI * 2)));
    }
    if (name === "hardHat") {
      shape(() => x.arc(0, -42, 34, Math.PI, 0));
      shape(() => x.rect(-42, -44, 84, 8));
    }
    x.restore();
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
function crowdMaterial(map) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: map } },
    vertexShader: /* glsl */ `
      attribute float aCell;
      varying vec2 vUv;
      void main() {
        vUv = (vec2(mod(aCell, 5.0), floor(aCell / 5.0)) + uv) / vec2(5.0, 2.0);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        if (c.a < 0.05) discard;
        gl_FragColor = c;
      }`,
  });
}

// ---- the afterimages: the pup's own meshes, one pose, merged into one geometry ----
function snapshot(rig) {
  rig.seal.updateWorldMatrix(true, true);
  const inv = rig.seal.matrixWorld.clone().invert();
  const parts = [];
  rig.seal.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes?.position || m.name === "shadow") return;
    let on = true;
    for (let o = m; o && o !== rig.seal.parent; o = o.parent) if (!o.visible) on = false;
    if (!on || m.material?.transparent) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    g.applyMatrix4(inv.clone().multiply(m.matrixWorld));
    parts.push(g);
  });
  if (!parts.length) return null;
  const body = mergeGeometries(parts);
  const rim = mergeVertices(body.clone(), 1e-3);
  rim.computeVertexNormals();
  return { body, rim };
}
function rimMaterial(color) {
  return new ShaderMaterial({
    side: BackSide,
    transparent: true,
    uniforms: { uRim: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.03, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      void main() { gl_FragColor = vec4(uRim, 0.7); }`,
  });
}

// ---- Aizen's own pieces, in the kit figure's space ----
const coat = () => ({
  body: inkGeo([new CylinderGeometry(0.3, 0.56, 1.4, 8, 1, true).translate(0, 0.95, -0.02), new CylinderGeometry(0.34, 0.3, 0.16, 8, 1, true).translate(0, 1.62, 0)]),
  rim: merged([tint(new TorusGeometry(0.57, 0.03, 4, 18).rotateX(Math.PI / 2).translate(0, 0.27, -0.02), CREAM), colorBar(0.026, 1.3, 0.012, [0.0, 0.92, 0.44], CREAM, 0.06)]),
});
const lock = () => inkGeo([new ConeGeometry(0.055, 0.36, 5).rotateX(1.9).rotateZ(-0.25).translate(0.02, 2.06, 0.15)]);
const lenses = () => merged([colorBar(0.085, 0.016, 0.012, [-0.07, 1.935, 0.16], CREAM, -0.08), colorBar(0.085, 0.016, 0.012, [0.07, 1.935, 0.16], CREAM, 0.08)]);

const addMat = (hex, opacity = 1) => new MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false });

export default function Move(cut) {
  const { tl } = cut;
  const scene = useThree((s) => s.scene);
  const root = useRef();
  const r = { dome: useRef(), crowd: useRef(), shards: useRef(), crack: useRef(), coat: useRef(), star: useRef(), lt: [useRef(), useRef(), useRef(), useRef(), useRef()] };
  const ghosts = useRef(null);
  const walk = useRef({ x: 0, y: 0, z: 0, yaw: 0 });
  const [m0, m1] = tl.move;
  const R = m1; // the reveal
  const count = typeof window !== "undefined" && window.innerWidth <= 720 ? 5 : CROWD;

  const g = useMemo(() => {
    let seed = 17;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const crowd = new InstancedMesh(new PlaneGeometry(0.62, 0.78).translate(0, 0.39, 0), crowdMaterial(atlas()), count);
    crowd.frustumCulled = false;
    const cell = new Float32Array(count);
    const order = count === 5 ? [0, 2, 4, 6, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    order.forEach((c, i) => (cell[i] = c));
    crowd.geometry.setAttribute("aCell", new InstancedBufferAttribute(cell, 1));
    const tri = new BufferGeometry();
    tri.setAttribute("position", new BufferAttribute(new Float32Array([0, 0.07, 0, -0.045, -0.04, 0, 0.05, -0.03, 0]), 3));
    const shards = new InstancedMesh(tri, new MeshBasicMaterial({ toneMapped: false, fog: false, side: DoubleSide }), SHARDS);
    shards.frustumCulled = false;
    for (let i = 0; i < SHARDS; i++) shards.setColorAt(i, new Color(i % 3 ? "#c9f1ff" : "#ffe2a8"));
    const shard = Array.from({ length: SHARDS }, () => ({ a: rand() * 6.283, v: 1.2 + 2.6 * rand(), up: 1.5 + 3.2 * rand(), spin: (rand() - 0.5) * 14, s: 0.7 + 1.1 * rand(), rx: (rand() - 0.5) * 1.2 }));
    const letters = [["ZAWA ZAWA", "#c8b6ff", 90], ["OOOH", "#ffd34d", 100], ["!!", "#ff7a59", 110], ["SUGEE", "#5cd6ff", 100], ["…", CREAM, 110]].map(([t, c, s]) => letterTex(t, c, s));
    const crack = merged(
      [0, 0.9, 1.7, 2.5, 3.5, 4.4, 5.3].map((a, i) => {
        const len = 0.45 + 0.35 * ((i * 5) % 3) / 2;
        return tint(new BoxGeometry(len, 0.02, 0.012).translate(len / 2, 0, 0).rotateZ(a), "#ffffff");
      }),
    );
    return {
      crowd,
      shards,
      shard,
      crack,
      crackMat: new MeshBasicMaterial({ color: "#ffffff", vertexColors: true, toneMapped: false, fog: false, transparent: true, depthTest: false }),
      throne: throne(),
      mat: flatMat(),
      dome: new SphereGeometry(1, 40, 20),
      domeMat: lasNoches(),
      coat: coat(),
      lock: lock(),
      lenses: lenses(),
      letters,
      letterMats: letters.map(letterMat),
      star: starGeo(1, 0.16),
      starMat: addMat("#ffffff"),
      ghostMatA: new MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.45, depthWrite: true, toneMapped: false, fog: false }),
      ghostMatB: new MeshBasicMaterial({ color: "#4fd8ff", transparent: true, opacity: 0.45, depthWrite: true, toneMapped: false, fog: false }),
      rimA: rimMaterial("#ffd08a"),
      rimB: rimMaterial("#9be8ff"),
      gA: new Group(),
      gB: new Group(),
      o: new Object3D(),
      bob: Array.from({ length: CROWD }, () => ({ ph: rand() * 6.28, amp: 0.1 + 0.1 * rand() })),
    };
  }, [count]);

  // the pup: the opening sign, then it walks; reveal: seated, chin on a flipper
  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    const fade = signAt(tl, t);
    live.pose.sign = fade * (1 - smooth(1.5, 1.9, t));
    live.pose.crouch = 0.8 * smooth(R - 0.35, R - 0.12, t) * (1 - smooth(R - 0.1, R, t));
    const seated = smooth(R, R + 0.2, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    live.pose.sit = 0.85 * seated;
    live.pose.fist = 0.65 * seated;
  });
  // where the pup stands at T: walking the sand, then on the throne
  const place = (T) => {
    const k = 1 - smooth(tl.collapse[0], tl.collapse[1], T);
    const w = smooth(tl.enter - 0.3, R - 0.2, T);
    const wk = T < R && w > 0 && w < 1 ? 1 : 0;
    const seated = T >= R;
    const p = walk.current;
    const n = narrowK();
    p.x = (seated ? SEAT[0] * n : (-1.9 + 2.5 * w) * n) * k;
    p.y = (seated ? SEAT[1] * n : 0.08 * Math.abs(Math.sin(T * 9)) * wk) * k;
    p.z = (seated ? SEAT[2] * n : 0.25) * k;
    p.yaw = seated ? -0.32 : 0.95 + 0.1 * Math.sin(T * 9) * wk;
    p.roll = seated ? 0.32 : 0.1 * Math.sin(T * 9) * wk;
    p.k = k;
    return p;
  };
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || cut.mode !== "full") return;
    const rig = pupRig(scene);
    const t = state.clock.elapsedTime - a.start;
    if (!rig || t < tl.enter - 0.35 || t > tl.collapse[1]) return;
    if (ghosts.current === null && t >= tl.enter) {
      const gh = snapshot(rig);
      ghosts.current = gh ?? false;
      if (gh) {
        g.gA.add(new Mesh(gh.body, g.ghostMatA), new Mesh(gh.rim, g.rimA));
        g.gB.add(new Mesh(gh.body, g.ghostMatB), new Mesh(gh.rim, g.rimB));
      }
    }
    const T = onTwos(t);
    const p = place(T);
    const s = live.seal;
    rig.seal.position.x = s.x + p.x;
    rig.seal.position.y += p.y;
    rig.seal.position.z = s.z + p.z;
    rig.seal.rotation.y += (p.yaw - rig.seal.rotation.y) * smooth(tl.enter - 0.35, tl.enter - 0.05, T) * p.k;
    rig.seal.rotation.z = p.roll * p.k;
  }, -0.5);
  usePupPost(cut, (t, rig) => {
    const T = onTwos(t);
    // the slow blink on the throne, the tail's lazy flick with it
    const blink = T > R + 0.55 && T < R + 1.15;
    if (blink) {
      rig.head.children[1].visible = false;
      rig.head.children[3].visible = true;
      rig.head.children[4].visible = false;
      rig.tail.rotation.y += 0.5 * Math.sin(((T - R - 0.55) / 0.6) * Math.PI);
    }
    rig.flipL.rotation.z += 0; // the far flipper rests
  });

  useCredit(cut, "resolvent", "Lean 4 verified, 0 sorry", "175 declarations. Softmax attention and Markov path composition share one operator.");

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const o = g.o;
    const hit = T - R;
    const q = place(T);
    const p = { x: q.x / narrowK(), z: q.z / narrowK(), yaw: q.yaw, roll: q.roll }; // in the stage group's own (scaled) space
    // the dome of Las Noches grows with the stage and is shown only once the lens is inside
    const dome = r.dome.current;
    const rad = radiusAt(tl, t) * 0.93;
    dome.visible = live.inStage && rad > 0.1;
    dome.scale.setScalar(Math.max(0.001, rad));
    dome.position.set(0, 0.9, 0);
    // the afterimages: split off on line A, stutter, slam in on the move
    const out = smooth(tl.lineA, tl.lineA + 0.5, T);
    const e = smooth(m0, R - 0.15, T);
    const come = 1 - e * e;
    const step = Math.floor(T * 6);
    const gh = ghosts.current;
    [[g.gA, -1.7, 0], [g.gB, 1.8, 1]].forEach(([m, x0, i]) => {
      m.visible = Boolean(gh) && out > 0.01 && T < R - 0.15;
      m.position.set(p.x + x0 * out * come + 0.06 * (step % 2 ? 1 : -1) * come, 0.04 * ((step + i) % 2), p.z + 0.25 * (i ? 1 : -1) * out * come);
      m.rotation.set(0, p.yaw + (i ? -0.25 : 0.25), p.roll);
      m.scale.setScalar(Math.max(0.001, out * (1 + 0.08 * e)));
    });
    // the crack runs over the walking pup, then the glass goes
    const ck = r.crack.current;
    ck.visible = T >= R - 0.35 && T < R;
    ck.position.set(p.x, 0.55, p.z + 0.6);
    ck.scale.setScalar(0.7 + 0.8 * smooth(R - 0.35, R, T));
    const sh = r.shards.current;
    const walkAt = [-1.9 + 2.5 * smooth(tl.enter - 0.3, R - 0.2, Math.min(T, R - 0.01)), 0.25];
    for (let i = 0; i < SHARDS; i++) {
      const d = g.shard[i];
      const tt = Math.max(0, hit);
      const x = walkAt[0] + Math.cos(d.a) * d.v * Math.min(tt, 0.6) * 0.8;
      const z = walkAt[1] + 0.25 + Math.sin(d.a) * d.v * Math.min(tt, 0.6) * 0.4;
      const y = Math.max(0.03, 0.55 + d.up * tt - 5.5 * tt * tt);
      const landed = y <= 0.031;
      o.position.set(x, y, z);
      o.rotation.set(landed ? -Math.PI / 2 + d.rx : d.spin * tt * 0.5, landed ? d.a : 0, landed ? 0 : d.spin * tt);
      const twinkle = landed ? 0.7 + 0.5 * Math.sin(T * 11 + i * 2.3) : 1;
      o.scale.setScalar(hit >= 0 ? Math.max(0.0001, d.s * twinkle) : 0.0001);
      o.updateMatrix();
      sh.setMatrixAt(i, o.matrix);
    }
    sh.instanceMatrix.needsUpdate = true;
    // the colony: rises and bounces on the reveal, staggered on twos
    const cr = r.crowd.current;
    const rise = smooth(R - 0.05, R + 0.25, T);
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], T);
    for (let i = 0; i < count; i++) {
      const b = g.bob[i];
      const x = -3.3 + (6.9 * i) / (count - 1);
      o.position.set(x, rise * Math.abs(Math.sin(T * 7 + b.ph)) * b.amp * 2.2 * fade, -0.55 - 0.2 * (i % 2));
      o.rotation.set(0, 0, rise * 0.12 * Math.sin(T * 7 + b.ph));
      o.scale.set(fade, Math.max(0.0001, rise * fade), fade);
      if (rise < 0.01) o.scale.setScalar(0.0001);
      o.updateMatrix();
      cr.setMatrixAt(i, o.matrix);
    }
    cr.instanceMatrix.needsUpdate = true;
    // Aizen's coat hem sways on twos; the glasses glint once on the flex
    const coatG = r.coat.current;
    if (coatG) coatG.scale.set(1 + 0.05 * Math.sin(T * 3.1), 1, 1 + 0.05 * Math.cos(T * 3.1));
    const st = r.star.current;
    const sa = T - (R + 0.3);
    st.visible = sa >= 0 && sa < 0.45;
    if (st.visible) {
      st.scale.setScalar(0.16 * Math.sin((sa / 0.45) * Math.PI) + 0.02);
      st.rotation.z = sa * 4;
    }
    // the lettering: ZAWA ZAWA before the cheer, then OOOH, !!, SUGEE over the colony, a small ... on the blink
    const put = (ref, lt, x, y, z, h, a0, a1, rot) => {
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
    put(r.lt[0], g.letters[0], -1.2, 1.15, -0.2, 0.5, m0 + 0.1, R + 0.1, 0.05);
    put(r.lt[1], g.letters[1], -2.0, 1.2, -0.3, 0.6, R + 0.15, R + 1.3, 0.1);
    put(r.lt[2], g.letters[2], -0.2, 1.3, -0.3, 0.7, R + 0.3, R + 1.4, -0.08);
    put(r.lt[3], g.letters[3], 2.6, 1.0, -0.3, 0.55, R + 0.45, R + 1.6, 0.08);
    put(r.lt[4], g.letters[4], SEAT[0] - 1.0, SEAT[1] + 1.25, SEAT[2], 0.4, R + 0.6, R + 1.2, 0);
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <FigureAttach {...cut}>
        <group ref={r.coat}>
          <InkMesh geo={g.coat.body} />
          <mesh geometry={g.coat.rim} material={g.mat} />
        </group>
        <InkMesh geo={g.lock} />
        <mesh geometry={g.lenses} material={g.mat} />
        <mesh ref={r.star} geometry={g.star} material={g.starMat} position={[-0.07, 1.94, 0.18]} visible={false} renderOrder={6} />
      </FigureAttach>
      <group ref={root} visible={false}>
        <mesh ref={r.dome} geometry={g.dome} material={g.domeMat} renderOrder={-0.5} frustumCulled={false} visible={false} />
        <mesh geometry={g.throne} material={g.mat} position={THRONE} scale={0.9} />
        <primitive ref={r.crowd} object={g.crowd} renderOrder={2} />
        <primitive ref={r.shards} object={g.shards} />
        <mesh ref={r.crack} geometry={g.crack} material={g.crackMat} visible={false} renderOrder={8} />
        <primitive object={g.gA} />
        <primitive object={g.gB} />
        {r.lt.map((ref, i) => (
          <mesh key={i} ref={ref} geometry={PLANE} material={g.letterMats[i]} visible={false} renderOrder={9} />
        ))}
      </group>
    </>
  );
}

// the ink pieces added to the figure: the kit's own ink and rim (g3/common.jsx inkMats)
function InkMesh({ geo }) {
  const m = inkMats();
  return (
    <>
      <mesh geometry={geo.outline} material={m.outline} />
      <mesh geometry={geo.ink} material={m.ink} />
    </>
  );
}
