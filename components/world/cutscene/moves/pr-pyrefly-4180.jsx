"use client";

// Pyrefly: JoJo, and the "To Be Continued" arrow that does not continue. An
// arrow of 208 beads (130 in the shaft, a 78-bead head, one at the tip) grows
// across the frame and stops dead at the pup. The pup strikes the JoJo pose
// (hip twisted, one flipper across its face, the other up) while GOGOGO
// glyphs rise off both flanks; then, still in the pose, it slaps one flipper
// down on the last bead ("PAN!"): a ring closes round it (should_panic), the
// arrow jitters three drawings, cracks in two ("BAKI") and falls out of the
// frame with one ripple ring, and the last bead stays pinned. The land
// speaks (the arrow), so the whole rig is turned toward the place (g3/common.jsx).
// Light tier: no shader, no new area. Cost: the instanced beads, the glyphs,
// one ring, one ripple, three letters: seven draw calls.
// Card: lib/world/cutscene/cards/pr-pyrefly-4180.js.

import { useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, RingGeometry, SRGBColorSpace, TorusGeometry } from "three";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { CREAM, PLANE, flipperAt, letterMat, letterTex, useCredit, usePupPost, useStageGroup } from "./g3/common";

const SHAFT = 130;
const HEAD = 12; // columns of the head, 12 + 11 + ... + 1 = 78 beads
const N = 208;
const SPLIT = 100; // where the arrow cracks
const GLYPHS = 10;
const ANGLE = -0.1; // the arrow's slant
const CORAL = "#ff6b57";
const BLUE = "#4aa2ff";

// bead i in the arrow's own frame: the tip at the origin, the arrow along -x
function layout() {
  const pts = [];
  for (let i = 0; i < SHAFT; i++) pts.push([-0.98 - (SHAFT - 1 - i) * 0.03, 0]);
  for (let c = 0; c < HEAD; c++) {
    const n = HEAD - c;
    for (let j = 0; j < n; j++) pts.push([-0.9 + c * 0.075, (j - (n - 1) / 2) * 0.075]);
  }
  return pts; // the last is the tip
}

// a white glyph with an ink outline, tinted by instance colour
function glyphTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const draw = () => {
    const x = c.getContext("2d");
    x.clearRect(0, 0, 128, 128);
    x.font = "800 104px 'Yu Gothic', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineJoin = "round";
    x.lineWidth = 12;
    x.strokeStyle = "#1c1b19";
    x.strokeText("ゴ", 64, 68);
    x.fillStyle = "#ffffff";
    x.fillText("ゴ", 64, 68);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready?.then(draw, () => {});
  return t;
}

export default function Move(cut) {
  const { tl } = cut;
  const root = useRef();
  const beads = useRef();
  const glyphs = useRef();
  const hoop = useRef();
  const ripple = useRef();
  const lt = [useRef(), useRef(), useRef()];
  const plant = useRef([0.24, 0.3, 1.1]); // where the flipper meets the last bead, in the pup's space
  const [, m1] = tl.move;
  const S = m1 - 0.05; // the slap
  const FALL = S + 0.3; // the arrow cracks off

  const g = useMemo(() => {
    const dots = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ toneMapped: false, fog: false }), N);
    dots.frustumCulled = false;
    dots.setColorAt(0, new Color(CREAM));
    const gl = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: glyphTex(), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, side: DoubleSide }), GLYPHS);
    gl.frustumCulled = false;
    for (let i = 0; i < GLYPHS; i++) gl.setColorAt(i, new Color(i % 2 ? BLUE : CORAL));
    const texts = [letterTex("PAN!", BLUE, 120), letterTex("BAKI", CORAL, 120), letterTex("…", CREAM, 120)];
    return {
      pts: layout(),
      dots,
      gl,
      o: new Object3D(),
      cream: new Color(CREAM),
      cold: new Color("#7f8fb8"),
      tmp: new Color(),
      hoop: new TorusGeometry(1, 0.035, 5, 40),
      hoopMat: new MeshBasicMaterial({ color: "#b48cff", toneMapped: false, fog: false, transparent: true }),
      ripple: new RingGeometry(0.85, 1, 44).rotateX(-Math.PI / 2),
      rippleMat: new MeshBasicMaterial({ color: "#8fdcff", transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
      texts,
      textMats: texts.map(letterMat),
    };
  }, []);

  // the opening sign, then the JoJo pose held; the near flipper leaves it for the slap
  useCutFrame((t) => {
    if (cut.mode !== "full") return;
    const hold = smooth(2.7, 3.2, t);
    const fade = signAt(tl, t);
    const slap = smooth(S - 0.05, S + 0.05, t);
    live.pose.sign = fade * (1 - hold);
    live.pose.fist = fade * hold * (1 - slap);
    live.pose.sit = 0.35 * smooth(2.7, 3.3, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
  });
  usePupPost(cut, (t, rig) => {
    const T = onTwos(t);
    const pose = smooth(2.7, 3.3, T) * (1 - smooth(tl.collapse[0], tl.collapse[1], T));
    const slap = smooth(S - 0.05, S + 0.05, T);
    // the pose: hip twisted, the far flipper up and out, the tail kicked
    rig.rear.rotation.z += 0.42 * pose;
        rig.tail.rotation.x += 0.45 * pose;
    const e = rig.flipL.rotation;
    rig.flipL.rotation.set(e.x + (0 - e.x) * pose, e.y + (-0.3 - e.y) * pose, e.z + (0.85 - e.z) * pose, "YZX");
    // the slap: the near flipper comes down onto the last bead
    const f = rig.flipR.rotation;
    rig.flipR.rotation.set(f.x + (0 - f.x) * slap, f.y + (-0.95 - f.y) * slap, f.z + (0.6 - f.z) * slap, "YZX");
    rig.flipR.position.z += 0.2 * slap;
    // two drawings of shake on the blow
    const hit = T - S;
    if (hit >= 0 && hit < 0.17) rig.seal.position.x += 0.04 * (Math.floor(hit * 12) % 2 ? 1 : -1);
    if (root.current && slap > 0.99) {
      const p = flipperAt(rig.flipR, root.current, [0.66, 0.06, 0]);
      plant.current = [p.x, p.y, p.z];
    }
  });

  useCredit(cut, "facebook/pyrefly #4180", "208 SCCs pinned", "The failure is pinned at the end with should_panic.");

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const o = g.o;
    const hit = T - S;
    const [px, py, pz] = plant.current;
    const dots = beads.current;
    const ca = Math.cos(ANGLE);
    const sa = Math.sin(ANGLE);
    const jam = hit >= 0 && T < FALL ? 0.014 * (Math.floor(hit * 12) % 2 ? 1 : -1) : 0;
    const tau = Math.max(0, T - FALL);
    for (let i = 0; i < N; i++) {
      const [lx, ly] = g.pts[i];
      const born = 2.0 + 0.9 * (i / (N - 1));
      const tip = i === N - 1;
      let sc = smooth(born, born + 0.14, T) * (tip ? 0.11 : i >= SHAFT ? 0.06 : 0.045);
      // arrow frame -> the pup's space
      let x = px + lx * ca - ly * sa;
      let y = py + lx * sa + ly * ca;
      if (jam && !tip) {
        x += jam * Math.sin(i);
        y += jam * Math.cos(i * 1.3);
      }
      if (tau > 0 && !tip) {
        // each half falls about the crack: A tips left, B tips right
        const left = i < SPLIT;
        const cx = px + g.pts[SPLIT][0] * ca;
        const cy = py + g.pts[SPLIT][0] * sa;
        const th = (left ? 1 : -1) * 1.1 * tau * tau;
        const dx = x - cx;
        const dy = y - cy;
        x = cx + dx * Math.cos(th) - dy * Math.sin(th) + (left ? -0.4 : 0.5) * tau;
        y = cy + dx * Math.sin(th) + dy * Math.cos(th) - 3.4 * tau * tau;
      }
      if (hit >= 0) dots.setColorAt(i, tip ? g.cream : g.tmp.copy(g.cream).lerp(g.cold, smooth(0, 0.5, hit)));
      else dots.setColorAt(i, g.cream);
      if (tip) sc *= 1.7;
      o.position.set(x, y, pz);
      o.rotation.set(0, i * 0.7, i * 0.4);
      o.scale.setScalar(Math.max(0.0001, sc));
      o.updateMatrix();
      dots.setMatrixAt(i, o.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    // the ring that closes round the last bead: should_panic
    const h = hoop.current;
    const close = smooth(S, S + 0.25, T);
    h.visible = hit >= 0 && T < tl.collapse[0];
    h.position.set(px, py, pz);
    h.scale.setScalar(Math.max(0.001, 1.0 - 0.62 * close));
    // the GOGOGO glyphs rise off both flanks on twos
    const gl = glyphs.current;
    const up = smooth(2.9, 3.4, T) * (1 - smooth(tl.collapse[0], tl.collapse[1], T));
    for (let i = 0; i < GLYPHS; i++) {
      const side = i % 2 ? 1 : -1;
      const k = (T * 0.55 + i / GLYPHS) % 1;
      o.position.set(side * (1.55 + 0.45 * ((i >> 1) % 3)) + 0.1, 0.1 + 2.3 * k, -0.4 - 0.2 * (i % 3));
      o.rotation.set(0, 0, side * 0.15);
      o.scale.setScalar(Math.max(0.0001, up * (0.32 + 0.12 * ((i >> 1) % 3)) * Math.sin(Math.PI * k) ** 0.5));
      o.updateMatrix();
      gl.setMatrixAt(i, o.matrix);
    }
    gl.instanceMatrix.needsUpdate = true;
    // one ripple where the halves land
    const rp = ripple.current;
    const rage = T - (FALL + 0.75);
    rp.visible = rage >= 0 && rage < 0.9;
    if (rp.visible) {
      rp.position.set(px - 1.8, 0.03, pz);
      rp.scale.setScalar(0.3 + 2.4 * (rage / 0.9));
      g.rippleMat.opacity = 1 - rage / 0.9;
    }
    // the lettering: PAN! on the slap, BAKI as it cracks, a small ... as it falls
    const put = (ref, l, x, y, z, hh, a0, a1, rot) => {
      const m = ref.current;
      const age = T - a0;
      m.visible = age >= 0 && T < a1;
      if (m.visible) {
        const pop = 1 + 0.35 * Math.exp(-age * 12);
        m.position.set(x, y, z);
        m.scale.set(hh * l.aspect * pop, hh * pop, 1);
        m.rotation.z = rot;
      }
    };
    put(lt[0], g.texts[0], px - 0.9, py + 1.7, pz - 0.6, 0.6, S, S + 1.0, 0.08);
    put(lt[1], g.texts[1], px + 1.8, py + 1.2, pz + 0.1, 0.6, FALL, FALL + 0.9, -0.1);
    put(lt[2], g.texts[2], px + 1.4, py + 0.2, pz, 0.5, FALL + 0.5, FALL + 1.4, 0);
  });

  return (
    <>
      <Stage {...cut} />
      <group ref={root} visible={false}>
        <primitive ref={beads} object={g.dots} />
        <primitive ref={glyphs} object={g.gl} />
        <mesh ref={hoop} geometry={g.hoop} material={g.hoopMat} visible={false} />
        <mesh ref={ripple} geometry={g.ripple} material={g.rippleMat} visible={false} />
        {lt.map((ref, i) => (
          <mesh key={i} ref={ref} geometry={PLANE} material={g.textMats[i]} visible={false} renderOrder={9} />
        ))}
      </group>
    </>
  );
}
