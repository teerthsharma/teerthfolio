"use client";

// Small cheap parts shared by the four g5 moves (p-nerve, p-separatrix,
// p-planimeter, p-tangle): a group that follows the pup and shows only inside
// the stage, flat/additive materials, a radial glow, a ribbon builder, the
// figure's entrance frames, the pup's own rig (flipper tip, head, eye) so a
// prop can ride the real bones, hand lettering, an instanced crowd of costume
// pups on the screen's bottom edge, a camera micro-shake and the cream credit
// card. 3D only except the card (DOM, like the bubbles); the comic layer is
// ui/Bubbles.jsx.

import { sceneT } from "../../../../../lib/world/cutscene/clock";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { figureAt, figureScale } from "../../../../../lib/world/cutscene/timeline";
import { live } from "../../../../../lib/world/store";
import { PIVOT, buildSealD } from "../../../seal/variants/D-parts";

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ramp = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// 0..1 out to the end of the scene: the move lets go as the stage collapses
export const outK = (tl, t) => 1 - ramp(tl.collapse[1], tl.duration, t);
export const twos = (t) => Math.floor(t * 12) / 12;
export const rand = (seed) => {
  let s = (Math.imul(seed + 1, 2654435761) >>> 1) % 2147483646 + 1; // a hashed start: small seeds give alike first draws otherwise
  const next = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  next();
  next();
  return next;
};
// A drawn pop on twos: 0 before, then 0.45, 1.25, 0.95, 1.05, 1 (a lettered word landing).
const POP = [0.45, 1.25, 0.95, 1.05];
export const popAt = (a) => (a < 0 ? 0 : POP[Math.floor(a * 12)] ?? 1);

// A group at the pup's feet, shown only while the stage is up in a full scene.
// `off` runs every frame the stage is not up (hide anything hung on the pup).
export function useStageGroup(cut, fn, off) {
  const ref = useRef();
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const on = cut.mode === "full" && live.arrival.id && live.inStage;
    g.visible = Boolean(on);
    if (!on) {
      off?.();
      return;
    }
    g.position.set(live.seal.x, 0, live.seal.z);
    fn?.(sceneT(live.arrival.id, state.clock.elapsedTime - live.arrival.start), state, dt, g);
  }, -1.1);
  return ref;
}

export const flat = (color, o = {}) => new MeshBasicMaterial({ color, toneMapped: false, fog: false, side: DoubleSide, ...o });
export const additive = (color, o = {}) => flat(color, { blending: AdditiveBlending, transparent: true, depthWrite: false, ...o });
export const fade = (m, a) => {
  m.opacity = a;
  m.visible = a > 0.004;
};

// A soft radial light (additive), the place's colour in sRGB like Stage's.
export function glowMat(color, power = 2) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color).convertLinearToSRGB() }, uA: { value: 1 }, uP: { value: power } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 uColor;uniform float uA,uP;varying vec2 vUv;void main(){float r=length(vUv*2.-1.);float k=pow(1.-smoothstep(0.,1.,r),uP);gl_FragColor=vec4(pow(uColor,vec3(2.2))*k*uA,1.);}",
  });
}

// A flat ribbon along a polyline in the XY plane (z=0), `w` wide. One mesh.
export function ribbon(points, w, closed = false) {
  const pos = [];
  const n = points.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % n];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * (w / 2);
    const ny = (dx / l) * (w / 2);
    pos.push(ax + nx, ay + ny, 0, ax - nx, ay - ny, 0, bx + nx, by + ny, 0, bx + nx, by + ny, 0, ax - nx, ay - ny, 0, bx - nx, by - ny, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}

// The speaker's entrance and exit frames (Speaker.jsx's ENTER), so a cape or a
// glint steps in on the same twos: returns [sx, sy] or null while it is away.
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];
export function figureFrame(t, tl, mode) {
  const inF = Math.floor((t - tl.enter) * 12);
  const outF = Math.floor((t - tl.collapse[0]) * 12);
  const frame = mode === "still" ? 9 : outF >= 0 ? 2 - outF : inF;
  return frame < 0 ? null : ENTER[frame] ?? [1, 1];
}

// ---------------------------------------------------------------------------
// THE PUP'S OWN RIG: its right flipper (the near one), its head and the far
// eye, found in the seal's scene graph once (seal/variants/D.jsx's layout), so
// a prop rides the real bones instead of a guessed point.
let EYE = null;
function eyeLocal() {
  if (!EYE) {
    const parts = buildSealD();
    const a = parts.lenses.attributes.position;
    const sum = new Vector3();
    const v = new Vector3();
    let n = 0;
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i);
      if (v.x > 0) {
        sum.add(v);
        n++;
      }
    }
    EYE = sum.divideScalar(n || 1).add(new Vector3(...parts.eyePivot));
    for (const g of Object.values(parts)) g.dispose?.();
  }
  return EYE;
}
const at2 = (v, a) => Math.abs(v.x - a[0]) < 1e-3 && Math.abs(v.z - a[2]) < 1e-3;
export function sealRig(scene) {
  const seal = scene.getObjectByName("seal");
  if (!seal) return null;
  if (seal.userData.g5) return seal.userData.g5;
  let rear = null;
  seal.traverse((o) => {
    if (!rear && o.isGroup && at2(o.position, PIVOT.rear)) rear = o;
  });
  const mir = rear?.children.find((c) => c.scale.x < 0);
  const neck = rear?.children.find((c) => c.isGroup && Math.abs(c.position.y - (PIVOT.neck[1] - PIVOT.rear[1])) < 1e-3 && c.children.length);
  const head = neck?.children[0];
  const flip = mir?.children[0];
  const mesh = flip?.children.find((o) => o.isMesh);
  if (!head || !mesh) return null;
  const p = mesh.geometry.attributes.position;
  const tip = new Vector3();
  const v = new Vector3();
  let best = -1;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.lengthSq() > best) {
      best = v.lengthSq();
      tip.copy(v);
    }
  }
  seal.userData.g5 = { seal, rear, head, flip, tip, eye: eyeLocal() };
  return seal.userData.g5;
}
const TIP = new Vector3();
// The near flipper's tip, in world space (last frame's pose: matrices update at render).
export function flipperTip(rig, out = TIP) {
  return rig.flip.localToWorld(out.copy(rig.tip));
}
// Hang objects on the pup's bones while the move is mounted: [[bone, object3D]].
export function useAttach(parts) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const rig = sealRig(scene);
    if (!rig) return undefined;
    const placed = parts.map(([bone, o]) => {
      rig[bone].add(o);
      return o;
    });
    return () => placed.forEach((o) => o.removeFromParent());
  }, [scene, parts]);
}

// A point on the kit's speaker figure (its own space: feet at the origin, facing +z, before its
// scale), in the stage's space (relative to the pup): the figure stands at figureAt(card), turned -0.42.
const YAW = -0.42;
export function figPoint(card, p, out) {
  const sc = figureScale(card);
  const [ax, ay, az] = figureAt(card);
  const x = p[0] * sc;
  const z = p[2] * sc;
  return out.set(ax + x * Math.cos(YAW) + z * Math.sin(YAW), ay + p[1] * sc, az - x * Math.sin(YAW) + z * Math.cos(YAW));
}

// ---------------------------------------------------------------------------
// SCREEN SPACE: a point at screen (nx, ny in -1..1) a distance d in front of
// the lens, in the stage group's space (relative to the pup); returns the world height of the screen there.
const R = new Vector3();
const U = new Vector3();
const F = new Vector3();
export function hudAt(camera, nx, ny, d, out) {
  const th = Math.tan((camera.fov * Math.PI) / 360) * d;
  F.set(0, 0, -1).applyQuaternion(camera.quaternion);
  R.set(1, 0, 0).applyQuaternion(camera.quaternion);
  U.set(0, 1, 0).applyQuaternion(camera.quaternion);
  out.copy(camera.position).addScaledVector(F, d).addScaledVector(R, nx * th * camera.aspect).addScaledVector(U, ny * th);
  out.x -= live.seal.x; // the stage group stands at the pup: this is its own space
  out.z -= live.seal.z;
  return th * 2;
}

// HAND LETTERING as a camera-facing plane: the comic face, an ink plate, a
// cyan plate a hair off register, a cream outline and the place's colour.
const comicFamily = () => getComputedStyle(document.body).getPropertyValue("--font-comic").trim() || "'Comic Sans MS', sans-serif";
const QUAD = new PlaneGeometry(1, 1);
export function letterMesh(text, fill, size = 120) {
  const c = document.createElement("canvas");
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(QUAD, new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  mesh.renderOrder = 20;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.userData.aspect = 2;
  const draw = () => {
    const font = `800 ${size}px ${comicFamily()}`;
    const ctx = c.getContext("2d");
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width + size * 0.7);
    const h = Math.ceil(size * 1.5);
    c.width = w;
    c.height = h;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const x = w / 2;
    const y = h / 2;
    ctx.fillStyle = "#1c1b19";
    ctx.fillText(text, x + size * 0.05, y + size * 0.06);
    ctx.fillStyle = "#2ec5ff";
    ctx.fillText(text, x - size * 0.045, y + size * 0.03);
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = "#fbfaf7";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    mesh.userData.aspect = w / h;
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 ${size}px ${comicFamily()}`, text).then(draw, () => {});
  return mesh;
}
// Place a lettered mesh at screen (nx, ny), `hFrac` of the screen tall, tilted `rot`, popped by `pop`.
const P3 = new Vector3();
export function placeLetter(state, mesh, nx, ny, hFrac, rot = 0, pop = 1, d = 4) {
  mesh.visible = pop > 0.001;
  if (!mesh.visible) return;
  const worldH = hudAt(state.camera, nx, ny, d, P3);
  mesh.position.copy(P3);
  mesh.quaternion.copy(state.camera.quaternion);
  mesh.rotateZ(rot);
  const h = hFrac * worldH * pop;
  mesh.scale.set(h * mesh.userData.aspect, h, 1);
}
export const disposeLetter = (m) => {
  m.material.map.dispose();
  m.material.dispose();
};

// ---------------------------------------------------------------------------
// THE CROWD: the island's costume pups as small ink cutouts on the screen's
// bottom edge. Instanced: bodies (ink), a rim hull and two flippers in each
// one's accent colour, plus a tuft. No ears, ever. Five draws for any n.
export const ACCENTS = ["#ffd23f", "#4fb4ff", "#e0162b", "#ff8a1a", "#e94bff", "#22c55e", "#8a5cff", "#ff4d6a"];
const HULL = new Vector3(1.16, 1.12, 1.12);
export function makeCrowd(n, ink, accents = ACCENTS) {
  const strip = (g) => {
    const t = g.index ? g.toNonIndexed() : g;
    t.deleteAttribute("uv");
    t.deleteAttribute("normal");
    return t;
  };
  const body = mergeGeometries([
    strip(new SphereGeometry(1, 10, 7).scale(0.4, 0.3, 0.62).translate(0, 0.3, -0.05)),
    strip(new SphereGeometry(0.3, 10, 8).translate(0, 0.62, 0.34)),
    strip(new ConeGeometry(0.1, 0.34, 5).rotateX(-Math.PI / 2).translate(0, 0.2, -0.78)),
  ]);
  const flipper = new CapsuleGeometry(0.075, 0.3, 2, 6).translate(0, -0.2, 0); // hangs from its shoulder at the origin
  const tuft = new ConeGeometry(0.07, 0.24, 5).translate(0, 0.12, 0);
  const mk = (geo, mat, withColor) => {
    const m = new InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    m.renderOrder = 5;
    if (withColor) for (let i = 0; i < n; i++) m.setColorAt(i, new Color(accents[i % accents.length]));
    return m;
  };
  const white = (side) => new MeshBasicMaterial({ color: "#ffffff", side, toneMapped: false, fog: false });
  const c = {
    n,
    body: mk(body, flat(ink), false),
    rim: mk(body, white(BackSide), true),
    flipL: mk(flipper, white(DoubleSide), true),
    flipR: mk(flipper, white(DoubleSide), true),
    tuft: mk(tuft, white(DoubleSide), true),
    dummy: new Object3D(),
    m: new Matrix4(),
    m2: new Matrix4(),
    q: new Quaternion(),
    p: new Vector3(),
    s: new Vector3(),
    g: [],
  };
  c.g = [c.rim, c.body, c.flipL, c.flipR, c.tuft];
  return c;
}
export const disposeCrowd = (c) => c.g.forEach((m) => m.dispose());
// One frame of the crowd. spots[i] = [nx, ny] the feet; hFrac the pup's height (of the screen);
// pose(i, out) fills out { hop 0..1, l, r (each flipper 0 hanging .. 1 up), roll, pitch, yaw } for pup i.
// on=false hides it.
const FLIP = [0.34, 0.3, 0.2];
const POSE = { hop: 0, l: 0, r: 0, roll: 0, pitch: 0, yaw: 0, scale: 1 };
const E = new Euler();
export function crowdFrame(c, state, on, spots, hFrac, pose, d = 4.2) {
  for (const m of c.g) m.visible = on;
  if (!on) return;
  const { camera } = state;
  const O = c.dummy;
  for (let i = 0; i < c.n; i++) {
    POSE.hop = POSE.l = POSE.r = POSE.roll = POSE.pitch = POSE.yaw = 0;
    POSE.scale = 1;
    pose(i, POSE);
    const worldH = hudAt(camera, spots[i][0], spots[i][1], d, c.p);
    const sc = ((typeof hFrac === "function" ? hFrac(i) : hFrac) * worldH * POSE.scale) / 0.95;
    c.p.y += POSE.hop * 0.16 * sc;
    const face = Math.atan2(camera.position.x - c.p.x, camera.position.z - c.p.z) + POSE.yaw;
    c.q.setFromEuler(E.set(POSE.pitch, face, POSE.roll, "YXZ"));
    c.s.setScalar(sc * (1 + 0.05 * POSE.hop));
    c.m.compose(c.p, c.q, c.s);
    c.body.setMatrixAt(i, c.m);
    c.m2.copy(c.m).scale(HULL);
    c.rim.setMatrixAt(i, c.m2);
    // the flippers: swing out and up about the shoulder (z), 0 hanging, ~2.6 nearly straight up
    for (const [mesh, sd, r] of [[c.flipL, 1, POSE.l], [c.flipR, -1, POSE.r]]) {
      O.position.set(sd * FLIP[0], FLIP[1], FLIP[2]);
      O.rotation.set(0, 0, sd * (0.5 + r * 2.1 + (r > 0.5 ? 0.2 * Math.sin(state.clock.elapsedTime * 14 + i) : 0)));
      O.scale.setScalar(1);
      O.updateMatrix();
      mesh.setMatrixAt(i, O.matrix.premultiply(c.m));
    }
    O.position.set(0, 0.88, 0.34);
    O.rotation.set(0.15, 0, 0);
    O.scale.set(1, 0.6 + (0.9 * ((i * 37) % 5)) / 5, 1);
    O.updateMatrix();
    c.tuft.setMatrixAt(i, O.matrix.premultiply(c.m));
  }
  for (const m of c.g) m.instanceMatrix.needsUpdate = true;
}

// A THROWN PIECE: one bounce, then flat on the floor. toss(r, y0) makes its throw; tossAt(s, a, out)
// reads where it is `a` seconds after the throw (on twos), out { x, y, z, settle 0..1, tumble 0..1 }.
const G = 7;
export function toss(r, y0, speed = 1) {
  const vy = (1.4 + r() * 1.8) * speed;
  const t1 = (vy + Math.sqrt(vy * vy + 2 * G * (y0 - 0.04))) / G;
  const vy2 = 0.32 * Math.abs(vy - G * t1);
  return { vx: (r() - 0.5) * 2.6 * speed, vz: (r() - 0.2) * 1.6 * speed, vy, y0, t1, t2: (2 * vy2) / G, vy2, spin: (r() - 0.5) * 16, z0: r() * 6.28 };
}
export function tossAt(s, a, out) {
  const aa = Math.floor(a * 12) / 12;
  let travel;
  if (aa <= s.t1) {
    out.y = s.y0 + s.vy * aa - 0.5 * G * aa * aa;
    travel = aa;
  } else if (aa <= s.t1 + s.t2) {
    const b = aa - s.t1;
    out.y = 0.04 + s.vy2 * b - 0.5 * G * b * b;
    travel = s.t1 + b * 0.4;
  } else {
    out.y = 0.04;
    travel = s.t1 + s.t2 * 0.4;
  }
  out.x = s.vx * travel * 0.5;
  out.z = s.vz * travel * 0.5;
  out.settle = ramp(s.t1, s.t1 + s.t2 + 0.001, aa);
  out.aa = aa;
  return out;
}

// THE SECOND VOICE OF LINE A. The kit's card has two bubble slots; a dock with three voices
// swaps the card's `a` for `second` when the move beat (line A still up) begins, on the card
// the move was mounted with, and puts it back when the move unmounts.
export function useLineSwitch(card, tl, second) {
  useEffect(() => {
    const first = Object.getOwnPropertyDescriptor(card, "a");
    Object.defineProperty(card, "a", { configurable: true, enumerable: true, get: () => (window.__g5T >= tl.move[0] - 0.12 ? second : first.value) });
    return () => {
      Object.defineProperty(card, "a", first);
      window.__g5T = -1;
    };
  }, [card, tl, second]);
  useFrame((state) => {
    window.__g5T = live.arrival.id ? sceneT(live.arrival.id, state.clock.elapsedTime - live.arrival.start) : -1;
  }, -2);
}

// ---------------------------------------------------------------------------
// CAMERA MICRO-SHAKE: two drawings (twos) of a small jolt at each time in
// `hits` (seconds into the scene). Runs after the camera rig set the frame.
export function useShake(cut, hits, amp = 0.05) {
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || cut.mode !== "full") return;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    for (const h of hits) {
      const f = Math.floor((t - h) * 12);
      if (f >= 0 && f < 2) {
        const s = f ? -1 : 1;
        state.camera.position.x += s * amp;
        state.camera.position.y -= s * amp * 0.6;
        return;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// THE CREDIT CARD: the real work the scene honours, a cream card in the lower
// half held for 1.2 s after the flex (the flex bubble steps aside for it), then
// the stage snaps back. DOM, so it is crisp; a skip clears live.arrival and
// takes it away in the same frame. Reduced motion shows none (static bubbles).
const CREAM = "#fbfaf7";
export function useCredit({ mode, tl }, repo, lang, spec) {
  const el = useRef(null);
  useEffect(() => {
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed",
      left: "50%",
      bottom: "12.5vh",
      zIndex: "30",
      display: "none",
      gap: "3px",
      padding: "9px 16px 11px",
      background: CREAM,
      color: "#1c1b19",
      border: "1.5px solid #1c1b19",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(12,8,30,.3), 3px 3px 0 #1c1b19",
      pointerEvents: "none",
      width: "max-content",
      maxWidth: "min(88vw, 34em)",
      textAlign: "left",
    });
    const line = (txt, css) => {
      const s = document.createElement("div");
      s.textContent = txt;
      Object.assign(s.style, css);
      d.appendChild(s);
    };
    line(repo, { font: "600 12px var(--mono)", opacity: ".72", letterSpacing: ".01em" });
    line(lang, { font: "600 12px var(--mono)", opacity: ".72" });
    line(spec, { font: "700 15px var(--font)", lineHeight: "1.3" });
    d.setAttribute("aria-hidden", "true");
    document.body.appendChild(d);
    el.current = d;
    return () => {
      d.remove();
      el.current = null;
    };
  }, [repo, lang, spec]);
  useFrame((state) => {
    const d = el.current;
    if (!d) return;
    const a = live.arrival;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const t0 = tl.collapse[0] - 1.2;
    const on = Boolean(a.id) && mode === "full" && t >= t0 && t < tl.collapse[1] + 0.25;
    d.style.display = on ? "grid" : "none";
    if (on) {
      const f = Math.floor((t - t0) * 12);
      const k = [0.2, 0.6, 0.9, 1][Math.min(3, Math.max(0, f))]; // on twos: a slide up in three drawings
      d.style.transform = `translate(-50%, ${((1 - k) * 28).toFixed(0)}px) rotate(-0.6deg)`;
      d.style.opacity = t > tl.collapse[1] ? String(Math.max(0, 1 - (t - tl.collapse[1]) / 0.25)) : "1";
      const b = document.querySelector('.comic .bubble[data-slot="b"]');
      if (b) b.style.visibility = "hidden"; // the flex had its 2.4 s; the card takes its place
    }
  });
}
