"use client";

// Tangle: JoJo approaching. The tall silhouette stands hip cocked, one arm
// raised, and asks "Oh? You're approaching me?" Hand-lettered menacing
// glyphs rise round the pair on twos while the pup strikes three poses in
// turn (each snaps in on the drawing), then bobs a step a syllable of line B
// as it closes the distance. On the last step two ink rings fly in from
// either side and LINK: they tug, cannot be pulled apart, and hold.
// Shape, colour and pose only. Card: lib/world/cutscene/cards/p-tangle.js.
// Cost: 10 instanced glyphs (1 draw), 2 rings x (ink + rim): 5 draws, ~2.2k triangles.

import { useEffect, useMemo, useRef } from "react";
import { BackSide, CanvasTexture, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, TorusGeometry } from "three";
import { Speaker, Stage, useCutFrame } from "../kit";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { live } from "../../../../lib/world/store";
import { flat, outK, ramp, rand, twos, useStageGroup } from "./g5/fx";

const POSES = [
  { at: 3.3, raise: 1, crouch: 0.5, spin: 0.05 },
  { at: 3.9, point: 1, crouch: 0.3, spin: 0.08 },
  { at: 4.5, fist: 1, sit: 0.25, spin: 0.02 },
];
const STEPS = [5.25, 0.14]; // line B: the first step, a step every 0.14 s (a syllable)
const LINK = [6.3, 6.85];
const R = 0.52;
const PAIR = [0.3, 1.5, -0.9];
const GLYPHS = 10;

// a hand-lettered menacing glyph: three brush strokes and two ticks, ink-outlined, drawn white to be tinted
function glyphTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.lineCap = "round";
  x.lineJoin = "round";
  const strokes = () => {
    x.beginPath();
    x.moveTo(16, 34);
    x.quadraticCurveTo(54, 26, 96, 36);
    x.quadraticCurveTo(98, 70, 94, 98);
    x.stroke();
    x.beginPath();
    x.moveTo(24, 102);
    x.quadraticCurveTo(60, 96, 98, 100);
    x.stroke();
    for (const [a, b, c2, d] of [[100, 8, 108, 24], [114, 6, 122, 22]]) {
      x.beginPath();
      x.moveTo(a, b);
      x.lineTo(c2, d);
      x.stroke();
    }
  };
  x.strokeStyle = "#0a0614";
  x.lineWidth = 22;
  strokes();
  x.strokeStyle = "#ffffff";
  x.lineWidth = 12;
  strokes();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function Tangle(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({});
  const k = useMemo(() => {
    const map = glyphTexture();
    const glyphs = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map, color: p.accent, transparent: true, toneMapped: false, fog: false, side: DoubleSide, depthWrite: false }), GLYPHS);
    glyphs.frustumCulled = false;
    const tube = new TorusGeometry(R, 0.05, 8, 40);
    const rimTube = new TorusGeometry(R, 0.078, 8, 40);
    return {
      map,
      glyphs,
      tube,
      rimTube,
      ink: flat(p.ink),
      rimA: flat(p.rim, { side: BackSide }),
      rimB: flat(p.accent, { side: BackSide }),
      dummy: new Object3D(),
    };
  }, [p]);
  useEffect(() => () => k.map.dispose(), [k]);
  const lanes = useMemo(() => {
    const r = rand(5);
    return Array.from({ length: GLYPHS }, (_, i) => ({ x: (i % 2 ? 3.4 : -3.0) + (r() - 0.5) * 1.2, z: -3.7 - r() * 0.9, ph: r(), s: 0.7 + r() * 0.4, rz: (r() - 0.5) * 0.5, wob: r() * 6 }));
  }, []);

  // the pup strikes a pose, snaps to the next on the drawing, then steps a syllable at a time
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    let pose = null;
    for (const s of POSES) if (t >= s.at) pose = s;
    if (pose && t < STEPS[0] + 1.7) {
      const f = Math.floor((t - pose.at) * 12);
      const hit = f < 2 ? 1.12 : 1; // the snap into each pose overshoots
      for (const n of ["raise", "point", "fist", "crouch", "sit", "spin"]) if (pose[n]) live.pose[n] = Math.min(1, pose[n] * hit) * o;
    }
    if (t >= STEPS[0] && t < LINK[1]) {
      const syl = Math.floor((t - STEPS[0]) / STEPS[1]);
      live.pose.crouch = (syl % 2 ? 0.45 : 0.05) * o;
      live.pose.fist = 0.85 * o;
    }
    if (t >= LINK[1]) live.pose.fist = 0.85 * o;
  });

  const root = useStageGroup(cut, (t, state) => {
    const r = refs.current;
    const w = state.camera.aspect < 1 ? 0.75 : 1; // a portrait screen: the columns stand closer in
    const tt = twos(t);
    const o = outK(tl, t);
    const D = k.dummy;
    // --- the glyphs rise on twos, in two columns either side of the pair
    const on = ramp(tl.lineA, tl.lineA + 0.4, t) * o;
    k.glyphs.visible = on > 0;
    lanes.forEach((g, i) => {
      const u = (tt * 0.32 + g.ph) % 1;
      D.position.set(g.x * w + Math.sin(tt * 3 + g.wob) * 0.05, 0.3 + u * 3.6, g.z);
      D.rotation.set(0, 0, g.rz + Math.sin(tt * 4 + g.wob) * 0.05);
      D.scale.setScalar(g.s * on * Math.sin(u * Math.PI) ** 0.5 + 0.0001);
      D.updateMatrix();
      k.glyphs.setMatrixAt(i, D.matrix);
    });
    k.glyphs.instanceMatrix.needsUpdate = true;
    // --- the rings: in from either side, linked through each other, tug, hold
    const fly = ramp(LINK[0], LINK[1], t);
    const snap = fly < 1 ? fly : 1 + Math.exp(-(t - LINK[1]) * 9) * Math.sin((t - LINK[1]) * 40) * 0.05;
    const tug = t > LINK[1] + 0.1 && t < LINK[1] + 0.5 ? Math.sin((t - LINK[1] - 0.1) * 22) * 0.11 * (1 - (t - LINK[1] - 0.1) / 0.4) : 0;
    r.pair.visible = fly > 0;
    r.pair.position.set(PAIR[0], PAIR[1], PAIR[2]);
    r.pair.rotation.set(0, 0.6, 0.8);
    r.pair.scale.setScalar(Math.max(o * 0.88, 0.0001));
    // pair frame: ring A in the xy plane about (0,-R/2,0); ring B in the yz plane about (0,+R/2,0)
    const away = 1 - snap;
    r.a.position.set(-3.2 * away - tug, -R / 2 - tug * 0.5, 0);
    r.b.position.set(3.2 * away + tug, R / 2 + tug * 0.5, 0);
    r.a.rotation.set(0, 0, tt * 0.0);
    r.b.rotation.set(0, Math.PI / 2, 0);
  });

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} lean={0.06} />
      <group ref={root} visible={false}>
        <primitive object={k.glyphs} />
        <group ref={set("pair")} visible={false}>
          <group ref={set("a")}>
            <mesh geometry={k.tube} material={k.ink} />
            <mesh geometry={k.rimTube} material={k.rimA} />
          </group>
          <group ref={set("b")}>
            <mesh geometry={k.tube} material={k.ink} />
            <mesh geometry={k.rimTube} material={k.rimB} />
          </group>
        </group>
      </group>
    </>
  );
}
