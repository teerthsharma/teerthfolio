"use client";

// A soft groove in the snow behind the seal: a ring-buffer ribbon of 256
// rows, each 7 vertices wide. Positions are written once, when a row is
// emitted; every frame only rewrites the alpha channel (fade by age, and by
// how close a row is to being overwritten, so the ring never shows a seam).

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Uint16BufferAttribute } from "three";
import { live } from "../../lib/world/store";
import { smoothstep } from "./life/util";

const ROWS = 256;
const WIDTH_VERTS = 7;
const OFFSETS = [-0.62, -0.48, -0.34, 0, 0.34, 0.48, 0.62];
const RIDGE_FADE_ROWS = 20; // slots nearest the write head, faded regardless of age

const WHITE = new Color("#ffffff");
const GROOVE = new Color("#9aa6d6");
const STALE_AGE = 8.2; // s: once every row is older than this, skip the alpha rewrite + upload
// Per lateral-offset vertex: base colour and base alpha (mirrored). Raised
// from the original 0.45/0.3/0.22 — both the groove and the ridge were
// nearly invisible against the warm snow at game distance.
const BASE = OFFSETS.map((o, j) => {
  if (j === 0 || j === 6) return { color: WHITE, alpha: 0 }; // outer ridge edge
  if (j === 1 || j === 5) return { color: WHITE, alpha: 0.6 }; // ridge
  if (j === 2 || j === 4) return { color: GROOVE, alpha: 0.45 }; // groove wall
  return { color: GROOVE, alpha: 0.38 }; // centre
});

// Fixed quads between every pair of consecutive ring slots (closing the
// loop 255 -> 0 too); built once, never touched again.
function buildIndex() {
  const idx = new Uint16Array(ROWS * (WIDTH_VERTS - 1) * 6);
  let p = 0;
  for (let r = 0; r < ROWS; r++) {
    const a = r * WIDTH_VERTS;
    const b = ((r + 1) % ROWS) * WIDTH_VERTS;
    for (let j = 0; j < WIDTH_VERTS - 1; j++) {
      const a0 = a + j;
      const a1 = a + j + 1;
      const b0 = b + j;
      const b1 = b + j + 1;
      idx[p++] = a0;
      idx[p++] = b0;
      idx[p++] = a1;
      idx[p++] = a1;
      idx[p++] = b0;
      idx[p++] = b1;
    }
  }
  return idx;
}
const INDEX = buildIndex();

// Writes one row's positions + colour (RGB) at `slot`. `prevX`/`prevZ` give
// the lateral axis; pass NaN for a fresh segment (no previous point), and
// `heading` is the fallback axis then. Plain numbers, not a { x, z } object,
// so this allocates nothing at ~35 calls/s.
function writeRow(bufs, slot, x, z, prevX, prevZ, heading, speed) {
  const { positions, colors } = bufs;
  let axisX;
  let axisZ;
  if (!Number.isNaN(prevX)) {
    const dx = x - prevX;
    const dz = z - prevZ;
    const len = Math.hypot(dx, dz) || 1e-6;
    axisX = -dz / len;
    axisZ = dx / len;
  } else {
    axisX = Math.cos(heading);
    axisZ = -Math.sin(heading);
  }
  const w = 0.75 + 0.25 * Math.min(1, speed / 6);
  const next = (slot + 1) % ROWS;
  for (let j = 0; j < WIDTH_VERTS; j++) {
    const off = OFFSETS[j] * w;
    const vi = slot * WIDTH_VERTS + j;
    const px = x + axisX * off;
    const py = 0.012;
    const pz = z + axisZ * off;
    positions[vi * 3] = px;
    positions[vi * 3 + 1] = py;
    positions[vi * 3 + 2] = pz;
    const c = BASE[j].color;
    colors[vi * 4] = c.r;
    colors[vi * 4 + 1] = c.g;
    colors[vi * 4 + 2] = c.b;
    // Mirror into the slot this row's quad will connect to next, so that
    // quad has zero width (not a stretch to wherever that slot's stale
    // position was, ROWS frames ago) until it is really written.
    const vn = next * WIDTH_VERTS + j;
    positions[vn * 3] = px;
    positions[vn * 3 + 1] = py;
    positions[vn * 3 + 2] = pz;
  }
}

export default function Trail() {
  const bufs = useMemo(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(ROWS * WIDTH_VERTS * 3);
    const colors = new Float32Array(ROWS * WIDTH_VERTS * 4);
    // BufferAttribute keeps the array reference; Float32BufferAttribute's
    // ctor calls `new Float32Array(array)`, which COPIES it (three
    // BufferAttribute.js), so every write below would land on a detached
    // array and the ribbon would never draw.
    g.setAttribute("position", new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
    g.setAttribute("color", new BufferAttribute(colors, 4).setUsage(DynamicDrawUsage));
    g.setIndex(new Uint16BufferAttribute(INDEX, 1));
    const rowTime = new Float32Array(ROWS).fill(-1e9);
    return {
      geometry: g,
      positions,
      colors,
      rowTime,
      head: 0,
      lastX: null,
      lastZ: null,
      inWater: false,
      lastWriteT: -Infinity,
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const seal = live.seal;
    const water = seal.water ?? 0;

    if (bufs.lastX === null) {
      bufs.lastX = seal.x;
      bufs.lastZ = seal.z;
      // Every slot starts at world origin (typed arrays zero-fill): without
      // this, the closing quad (slot 255 -> slot 0) draws a wedge from the
      // seal to (0, 0) on every ?spawn= deep link, before a single row is
      // ever written.
      const { positions } = bufs;
      for (let i = 0; i < ROWS * WIDTH_VERTS; i++) {
        positions[i * 3] = seal.x;
        positions[i * 3 + 1] = 0.012;
        positions[i * 3 + 2] = seal.z;
      }
      bufs.geometry.attributes.position.needsUpdate = true;
    }

    let wrote = false;
    if (water > 0) {
      // Swimming: lay one alpha-0 break row at the bank (once, on entry) and
      // nothing more, so the groove never crosses the river.
      if (!bufs.inWater) {
        bufs.inWater = true;
        writeRow(bufs, bufs.head, bufs.lastX, bufs.lastZ, NaN, NaN, seal.heading, 0);
        bufs.rowTime[bufs.head] = -1e9;
        bufs.head = (bufs.head + 1) % ROWS;
        wrote = true;
      }
    } else if (bufs.inWater) {
      // Just climbed out: start a fresh row (prevX = NaN) instead of
      // dragging a segment back to wherever the seal dove in.
      bufs.inWater = false;
      bufs.lastX = null;
    } else {
      const jumpDist = Math.hypot(seal.x - bufs.lastX, seal.z - bufs.lastZ);
      if (jumpDist > 3) {
        // Teleport: write alpha-0 rows at BOTH ends of the gap, so the quad
        // that bridges them is invisible at both edges, not just the old one.
        writeRow(bufs, bufs.head, bufs.lastX, bufs.lastZ, NaN, NaN, seal.heading, 0);
        bufs.rowTime[bufs.head] = -1e9;
        bufs.head = (bufs.head + 1) % ROWS;
        writeRow(bufs, bufs.head, seal.x, seal.z, NaN, NaN, seal.heading, 0);
        bufs.rowTime[bufs.head] = -1e9;
        bufs.head = (bufs.head + 1) % ROWS;
        bufs.lastX = seal.x;
        bufs.lastZ = seal.z;
        wrote = true;
      } else if (jumpDist >= 0.3 && seal.speed > 0.6) {
        writeRow(bufs, bufs.head, seal.x, seal.z, bufs.lastX, bufs.lastZ, seal.heading, seal.speed);
        bufs.rowTime[bufs.head] = t;
        bufs.head = (bufs.head + 1) % ROWS;
        bufs.lastX = seal.x;
        bufs.lastZ = seal.z;
        wrote = true;
      }
    }
    if (wrote) {
      bufs.geometry.attributes.position.needsUpdate = true;
      bufs.lastWriteT = t;
    }

    // Alpha only, every frame: fade by age, and taper the slots the write
    // head is about to reach so the ring seam never pops. The ring holds
    // under ROWS/~35 ≈ 7.3 s of history, less than STALE_AGE: once the most
    // recent row is older than that, every row's alpha already faded to 0
    // through this same loop on an earlier frame — skip the 7,168-float
    // rewrite and its GPU upload until the next row is written.
    if (t - bufs.lastWriteT > STALE_AGE) return;

    const { colors, rowTime, head } = bufs;
    for (let s = 0; s < ROWS; s++) {
      const age = t - rowTime[s];
      const ageFade = 1 - smoothstep(5, 8, age);
      const ringDist = (s - head + ROWS) % ROWS;
      const ringFade = Math.min(1, ringDist / RIDGE_FADE_ROWS);
      const a = ageFade * ringFade;
      for (let j = 0; j < WIDTH_VERTS; j++) {
        colors[(s * WIDTH_VERTS + j) * 4 + 3] = BASE[j].alpha * a;
      }
    }
    bufs.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <mesh geometry={bufs.geometry} renderOrder={1} frustumCulled={false}>
      <meshBasicMaterial
        vertexColors
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-4}
        side={DoubleSide}
      />
    </mesh>
  );
}
