"use client";

// What makes a lab building a landmark rather than a cottage: a tall tower
// annex with warm windows, a chimney that smokes, a pennant, a sign, a door
// step, two lamps, a bench and crates. All of it is merged into two meshes
// per place (lit + glow) and the smoke is one InstancedMesh of 4 puffs that
// only animates while the seal is within earshot, so the quality ladder's
// cost model (draw calls, shadow casters, per-frame work) barely moves.
// Variation (side, height, cap, finial) is a pure function of the place id.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live } from "../../lib/world/store";
import { C, mat } from "./palette";

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const paint = (g, hex) => {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(a, 3));
  return g;
};
const box = (w, h, d, x, y, z, hex) => paint(new BoxGeometry(w, h, d).translate(x, y + h / 2, z), hex);
const cyl = (r, h, x, y, z, hex, seg = 8) => paint(new CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z), hex);

const PUFFS = 4;
const smokeGeo = new SphereGeometry(0.5, 8, 6);
const smokeMat = mat("#f4f6fb", { roughness: 1, opacity: 0.8 });
const dummy = new Object3D();

export default function LabDecor({ place, radius }) {
  const R = radius;
  const h = hash(place.id);
  const side = place.id === "p-tangle" ? -1 : h & 1 ? 1 : -1; // tangle's annex stands west: its cap sat between the lens and the pup
  const tall = 6.5 + (h % 4); // tower height 6.5-9.5 m
  const A = place.color;
  const body = `#${new Color("#f4ead8").lerp(new Color(A), 0.35).getHexString()}`; // a tinted tower, not a cream clone
  const capCol = `#${new Color(A).multiplyScalar(0.6).getHexString()}`;

  const { lit, glowG, chim } = useMemo(() => {
    const L = [];
    const G = [];
    const tx = side * (R - 1.2);
    const tz = -R + 0.9;
    // tower annex: base, body, accent bands, cap, pennant mast
    L.push(box(2.6, 0.5, 2.6, tx, 0, tz, C.charcoal));
    L.push(box(2.2, tall, 2.2, tx, 0.5, tz, body));
    L.push(box(2.4, 0.3, 2.4, tx, 0.5 + tall * 0.5, tz, A));
    L.push(box(2.5, 0.35, 2.5, tx, 0.5 + tall, tz, A));
    const top = 0.85 + tall;
    if (h % 3 === 0) {
      L.push(paint(new ConeGeometry(1.9, 1.8, 4).rotateY(Math.PI / 4).translate(tx, top + 0.9, tz), capCol)); // pyramid
    } else if (h % 3 === 1) {
      L.push(paint(new SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(tx, top, tz), capCol)); // onion dome
      L.push(cyl(0.06, 0.6, tx, top + 1.5, tz, capCol, 5));
    } else {
      L.push(box(2.5, 0.3, 2.5, tx, top, tz, capCol)); // flat roof with a crenel ring
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        L.push(box(0.4, 0.4, 0.4, tx + Math.cos(a) * 1.05, top + 0.3, tz + Math.sin(a) * 1.05, capCol));
      }
    }
    L.push(cyl(0.05, 2.2, tx, 0.85 + tall + 1.7, tz, C.metal, 5));
    L.push(box(0.9, 0.5, 0.05, tx + 0.45, 0.85 + tall + 3.1, tz, A));
    // windows: warm glass on the front and the open side, two floors
    for (const y of [1.4, 1.4 + tall * 0.42, 1.4 + tall * 0.8].filter((y) => y < tall - 0.6)) {
      G.push(box(0.7, 1, 0.1, tx - 0.5, y, tz + 1.12, A));
      G.push(box(0.7, 1, 0.1, tx + 0.5, y, tz + 1.12, A));
      G.push(box(0.1, 1, 0.7, tx - side * 1.12, y, tz, A));
      L.push(box(0.9, 0.12, 0.14, tx - 0.5, y - 0.12, tz + 1.14, C.charcoal)); // sills
      L.push(box(0.9, 0.12, 0.14, tx + 0.5, y - 0.12, tz + 1.14, C.charcoal));
    }
    // door step and a lit door slab at the front
    L.push(box(2.8, 0.22, 1.1, 0, 0, R - 0.1, C.charcoal));
    L.push(box(2.2, 0.14, 0.8, 0, 0.22, R - 0.2, A));
    // sign: two posts and an accent board with a lit strip
    const sx = -side * 3.6;
    L.push(cyl(0.08, 2.4, sx - 0.9, 0, R + 0.9, C.woodDark));
    L.push(cyl(0.08, 2.4, sx + 0.9, 0, R + 0.9, C.woodDark));
    L.push(box(2.2, 0.9, 0.1, sx, 1.5, R + 0.9, A));
    G.push(box(1.7, 0.12, 0.12, sx, 1.62, R + 0.97, C.lamp));
    // lamp posts flanking the door
    for (const lx of [-2.2, 2.2]) {
      L.push(cyl(0.07, 2.4, lx, 0, R + 0.4, C.charcoal, 6));
      G.push(paint(new SphereGeometry(0.22, 8, 6).translate(lx, 2.55, R + 0.4), C.lamp));
    }
    // bench by the door and a crate stack on the other flank
    const bx = side * 3.9;
    L.push(box(1.6, 0.12, 0.5, bx, 0.45, R - 0.3, C.wood));
    L.push(box(0.12, 0.45, 0.5, bx - 0.65, 0, R - 0.3, C.woodDark));
    L.push(box(0.12, 0.45, 0.5, bx + 0.65, 0, R - 0.3, C.woodDark));
    L.push(box(1.6, 0.5, 0.1, bx, 0.6, R - 0.52, C.wood));
    const cx = -side * 4.1;
    L.push(box(0.9, 0.9, 0.9, cx, 0, R - 1.2, C.wood));
    L.push(box(0.9, 0.9, 0.9, cx + 0.95, 0, R - 1.1, C.woodDark));
    L.push(box(0.75, 0.75, 0.75, cx + 0.4, 0.9, R - 1.2, C.wood));
    // chimney on the tower's shoulder
    L.push(box(0.7, 2.2, 0.7, tx - side * 0.5, 0.5 + tall * 0.5, tz - 0.6, "#8a5a4c"));
    return {
      lit: mergeGeometries(L.map((g) => (g.index ? g.toNonIndexed() : g))),
      glowG: mergeGeometries(G.map((g) => (g.index ? g.toNonIndexed() : g))),
      chim: [tx - side * 0.5, 0.5 + tall * 0.5 + 2.2, tz - 0.6],
    };
  }, [R, side, tall, A, h, body, capCol]);

  const smoke = useRef(null);
  const litMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.8 }), []);
  const glowMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []); // unlit: the glass keeps its place colour

  useFrame(({ clock }) => {
    const m = smoke.current;
    if (!m) return;
    if (Math.hypot(live.seal.x - place.x, live.seal.z - place.z) > 48) return; // ponytail: frozen while far; fine, it is out of frame
    const t = clock.elapsedTime;
    for (let i = 0; i < PUFFS; i++) {
      const u = (t * 0.22 + i / PUFFS) % 1;
      const s = 0.35 + u * 1.0;
      dummy.position.set(chim[0] + Math.sin(t * 0.6 + i) * 0.12 * u + u * 1.1, chim[1] + 0.3 + u * 3.6, chim[2]);
      dummy.scale.setScalar(s * (1 - u * 0.5));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh castShadow receiveShadow geometry={lit} material={litMat} />
      <mesh geometry={glowG} material={glowMat} />
      <instancedMesh ref={smoke} args={[smokeGeo, smokeMat, PUFFS]} frustumCulled={false} instanceMatrix-usage={DynamicDrawUsage} />
    </group>
  );
}
