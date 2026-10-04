// Caustic: Madara. The ink figure stands left, a finger levelled (two dots for
// eyes). Twenty small answer cards float on the right, one coral and nineteen
// cream. The pup shakes the frame (the cards judder with its fist), the
// nineteen are sucked into the coral one on twos, and a green ring drops to
// land on it and misses, settling beside it: the one card is nobody's true
// answer. One instanced mesh for all twenty cards.
// Card: lib/world/cutscene/cards/p-caustic.js.

import { useMemo, useRef } from "react";
import { Color, DoubleSide, MeshBasicMaterial, Object3D, TorusGeometry, ShapeGeometry, Shape, InstancedMesh } from "three";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Rig } from "./g4/parts";

const N = 20;
const CORAL = "#ff6b57";
const CREAM = "#f3ecd9";
const GREEN = "#3ddc84";
const CENTRE = [1.7, 1.1, -2.4]; // where the coral card ends up, in the pup's frame

// A rounded card, 0.62 x 0.86.
function cardShape() {
  const w = 0.31;
  const h = 0.43;
  const r = 0.07;
  const s = new Shape();
  s.moveTo(-w + r, -h).lineTo(w - r, -h).quadraticCurveTo(w, -h, w, -h + r).lineTo(w, h - r).quadraticCurveTo(w, h, w - r, h).lineTo(-w + r, h).quadraticCurveTo(-w, h, -w, h - r).lineTo(-w, -h + r).quadraticCurveTo(-w, -h, -w + r, -h);
  return new ShapeGeometry(s);
}

// Nineteen homes for the cream cards on a loose cloud, the coral one at the centre.
const HOME = (() => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: N }, (_, i) => {
    if (i === 0) return { x: 0, y: 0, z: 0, r: 0.08, s: 0.85, d: 0 };
    const a = (i / (N - 1)) * Math.PI * 2 * 2.3 + rand() * 0.5;
    const rad = 1.0 + 1.9 * Math.sqrt(rand());
    return { x: Math.cos(a) * rad * 0.95, y: Math.sin(a) * rad * 0.5, z: (rand() - 0.5) * 1.6, r: (rand() - 0.5) * 0.9, s: 0.5 + 0.25 * rand(), d: i / N };
  });
})();

export default function Move(cut) {
  const { tl, mode } = cut;
  const geom = useMemo(cardShape, []);
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#ffffff", side: DoubleSide, toneMapped: false, fog: false }), []);
  const cards = useMemo(() => {
    const m = new InstancedMesh(geom, mat, N);
    for (let i = 0; i < N; i++) m.setColorAt(i, new Color(i === 0 ? CORAL : CREAM));
    m.frustumCulled = false;
    return m;
  }, [geom, mat]);
  const ringGeo = useMemo(() => new TorusGeometry(0.75, 0.07, 6, 40), []);
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: GREEN, toneMapped: false, fog: false }), []);
  const ring = useRef();
  const o = useMemo(() => new Object3D(), []);

  useCutFrame((t) => {
    if (mode !== "full") return;
    const sign = smooth(tl.sign[0], tl.sign[1], t) * (1 - smooth(tl.collapse[1], tl.duration, t));
    const shake = smooth(tl.move[0] - 0.5, tl.move[0], t) * (1 - smooth(tl.move[1], tl.move[1] + 0.4, t));
    live.pose.sign = sign * (1 - smooth(tl.sign[1], tl.sign[1] + 0.4, t));
    live.pose.raise = shake;
    live.pose.fist = smooth(tl.move[0], tl.move[1], t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));

    const born = smooth(tl.enter, tl.enter + 0.6, t);
    const suck = smooth(tl.move[0], tl.move[1] + 0.5, t);
    const out = 1 - smooth(tl.collapse[0] - 0.3, tl.collapse[0], t);
    const bob = t * 1.3;
    const j = shake * 0.12;
    for (let i = 0; i < N; i++) {
      const h = HOME[i];
      const k = i === 0 ? 0 : smooth(h.d * 0.55, 0.45 + h.d * 0.55, suck); // the cards go one after another
      const x = h.x * (1 - k) + (i === 0 ? 0 : 0);
      const y = h.y * (1 - k) + Math.sin(bob + i) * 0.08 * (1 - k);
      const z = h.z * (1 - k);
      o.position.set(CENTRE[0] + x + Math.sin(t * 53 + i) * j, CENTRE[1] + y + Math.cos(t * 47 + i) * j, CENTRE[2] + z);
      o.rotation.set(0, 0.15 * Math.sin(bob * 0.7 + i), h.r * (1 - k));
      const grow = i === 0 ? 1 + 0.25 * smooth(0.6, 1, suck) : 1 - k * 0.9;
      o.scale.setScalar(Math.max(0.001, onTwos(born) * out * h.s * grow * (k > 0.9 && i ? 0 : 1)));
      o.updateMatrix();
      cards.setMatrixAt(i, o.matrix);
    }
    cards.instanceMatrix.needsUpdate = true;

    // the green ring comes down on the coral card, tilts, and lands beside it
    const r = ring.current;
    const fall = smooth(tl.lineB + 0.3, tl.lineB + 1.2, t);
    const miss = smooth(tl.lineB + 1.2, tl.lineB + 1.7, t);
    r.visible = t > tl.lineB + 0.25 && out > 0;
    r.position.set(CENTRE[0] + 0.1 + 1.35 * miss + Math.sin(t * 6) * 0.1 * (1 - fall), CENTRE[1] + 4.2 * (1 - onTwos(fall)) - 0.85 * miss, CENTRE[2] + 0.5);
    r.rotation.set(1.1 - 0.6 * fall + 0.7 * miss, 0.2, 0.9 * miss);
    r.scale.setScalar(0.85 * out);
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <primitive object={cards} />
        <mesh ref={ring} geometry={ringGeo} material={ringMat} visible={false} />
      </Rig>
    </>
  );
}
