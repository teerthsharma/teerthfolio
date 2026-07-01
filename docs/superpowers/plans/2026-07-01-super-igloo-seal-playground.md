# Super Igloo + Controllable Seal Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the current polar observatory world into a faithful igloo.inc-style ice igloo at the center of a snowy open world, where a cute/semi-realistic seal companion (Junni-style personality) is the controllable avatar (Bruno Simon-style WASD physics playground), the igloo is touchable/interactive, and the existing portfolio artifacts remain as world discoverables.

**Architecture:** Keep the React/R3F shell (`IglooWorld`, `IglooScene`, `IglooHud`) but replace the observatory dome with a procedural igloo.inc-style ice-block igloo, swap the camera-locked seal for a physics-feeling controllable seal character, rebuild terrain as snowy mountains with a shader atmosphere, and strip the HUD down to igloo.inc's sparse edge chrome. Update the Teerth contract (`check-teerth.mjs`) so the new direction is required and the old observatory-specific assertions are relaxed where they conflict.

**Tech Stack:** Next.js 16, React 19, R3F 9, Drei 10, Three.js 0.178, GSAP, plain CSS. No new runtime dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/IglooWorld.jsx` | Modify | Input/router: WASD/arrow/drag state, seal spawn, igloo touch state, quality, render gate. |
| `components/IglooScene.jsx` | Modify | R3F scene composition: igloo, terrain, seal, atmosphere, artifacts, camera rig. |
| `components/IglooHud.jsx` | Modify | Minimal igloo.inc-style edge UI + Bruno controls hint. |
| `components/IglooArtifacts.jsx` | Modify | Keep artifacts; reposition around igloo, make them world discoverables. |
| `components/ActiveTheoryVeil.jsx` | Modify | Snow/fog/volumetric-light shader overlay. |
| `components/PolarObservatoryDome.jsx` | Replace | New `IglooDome.jsx` procedural ice-block igloo. |
| `components/SdfSealMascot.jsx` | Replace | New `SealAvatar.jsx` controllable seal character. |
| `components/IglooTerrain.jsx` | Create | Snowy mountain terrain with PBR ground and distant ridges. |
| `components/SnowAtmosphere.jsx` | Create | Falling snow, fog particles, wind gust lines. |
| `components/IglooTouch.jsx` | Create | Raycaster-based igloo touch handler (click/tap → pulse/open blocks). |
| `app/globals.css` | Modify | New `.igloo-*` styles for minimal HUD and igloo interaction states. |
| `scripts/check-teerth.mjs` | Modify | Require new files, relax old dome assertions, keep artifact/HUD contract. |
| `data/teerth-content.json` | Modify | Update hero copy to "igloo home base + seal companion" language. |

---

## Task 1: Contract Update — Allow the Super-Igloo Direction

**Files:**
- Modify: `scripts/check-teerth.mjs`
- Modify: `data/teerth-content.json`

**Interfaces:**
- Produces: `check-teerth.mjs` no longer fails when `PolarObservatoryDome.jsx` is renamed/replaced.
- Produces: `check-teerth.mjs` requires `components/IglooDome.jsx`, `components/SealAvatar.jsx`, `components/IglooTerrain.jsx`, `components/SnowAtmosphere.jsx`.
- Produces: content JSON describes the igloo as home base and seal as companion.

- [ ] **Step 1: Open `scripts/check-teerth.mjs`**

- [ ] **Step 2: Replace the rigid `PolarObservatoryDome.jsx` primitive checklist with an igloo primitive checklist**

Find this block (lines 184–201):

```js
for (const domePrimitive of [
  "DOME_RIB_COUNT",
  "DOME_PANEL_ROWS",
  "DomeIceShell",
  ...
]) {
  expectIncludes(
    "components/PolarObservatoryDome.jsx",
    polarObservatoryDome,
    domePrimitive,
    `upgraded dome must define ${domePrimitive}`,
  );
}
```

Replace with:

```js
for (const iglooPrimitive of [
  "IGLOO_BLOCK_ROWS",
  "IGLOO_BLOCKS_PER_ROW",
  "IglooDome",
  "IceBlock",
  "igloo-dome",
  "ice-block",
  "glowing seam",
  "procedural ice",
]) {
  expectIncludes(
    "components/IglooDome.jsx",
    iglooDome,
    iglooPrimitive,
    `igloo must define ${iglooPrimitive}`,
  );
}
```

- [ ] **Step 3: Add file existence checks for new components**

After the `sdfSealMascot` read line, add:

```js
const iglooDome = expectFile("components/IglooDome.jsx");
const sealAvatar = expectFile("components/SealAvatar.jsx");
const iglooTerrain = expectFile("components/IglooTerrain.jsx");
const snowAtmosphere = expectFile("components/SnowAtmosphere.jsx");
```

- [ ] **Step 4: Update scene contract in `check-teerth.mjs`**

Change:

```js
expectIncludes("components/IglooScene.jsx", iglooScene, "PolarObservatoryDome", "scene must mount the upgraded polar observatory dome");
```

To:

```js
expectIncludes("components/IglooScene.jsx", iglooScene, "IglooDome", "scene must mount the igloo.inc-style igloo");
expectIncludes("components/IglooScene.jsx", iglooScene, "SealAvatar", "scene must mount the controllable seal avatar");
expectIncludes("components/IglooScene.jsx", iglooScene, "IglooTerrain", "scene must mount the snowy mountain terrain");
expectIncludes("components/IglooScene.jsx", iglooScene, "SnowAtmosphere", "scene must mount the snow atmosphere");
```

- [ ] **Step 5: Update `data/teerth-content.json`**

Open `data/teerth-content.json`. Find the hero/profile paragraph and replace any "drive the seal" / "seal guide" language with:

```json
{
  "profile": {
    "name": "Teerth Sharma",
    "tagline": "Physics · Topology · Compilers · AI Systems",
    "hero": "A seal companion lives at the center of an ice world. Touch the igloo, then drive the seal through the snow with WASD.",
    "manifesto": "Systems that compile research into working artifacts."
  }
}
```

- [ ] **Step 6: Run the contract check and confirm it fails for missing files**

Run:

```bash
npm run check:teerth
```

Expected: FAIL with messages about missing `components/IglooDome.jsx`, `SealAvatar.jsx`, `IglooTerrain.jsx`, `SnowAtmosphere.jsx`.

- [ ] **Step 7: Commit the contract change**

```bash
git add scripts/check-teerth.mjs data/teerth-content.json
git commit -m "contract: allow super-igloo + controllable seal direction"
```

---

## Task 2: Procedural igloo.inc-Style Ice Igloo

**Files:**
- Create: `components/IglooDome.jsx`
- Modify: `components/IglooScene.jsx`

**Interfaces:**
- Consumes: `position`, `accent`, `touchPulse` (0–1), `quality`.
- Produces: R3F `<group className="igloo-dome">` with ice blocks, glowing seams, inner light, displaced blocks on pulse.

- [ ] **Step 1: Create `components/IglooDome.jsx` with this full implementation**

```jsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export const IGLOO_BLOCK_ROWS = 6;
export const IGLOO_BLOCKS_PER_ROW = [8, 10, 12, 14, 14, 10];
export const IGLOO_RADIUS = 2.2;
export const IGLOO_HEIGHT = 1.55;

const BLOCK_WIDTH = 0.58;
const BLOCK_HEIGHT = 0.32;
const BLOCK_DEPTH = 0.24;
const GAP = 0.06;
const BASE_COLOR = "#d8e8ec";
const SHADOW_COLOR = "#6d838a";
const GLOW_COLOR = "#e8fdff";

function useIceBlockMaps() {
  return useMemo(() => {
    const size = 128;
    const colorData = new Uint8Array(size * size * 4);
    const roughnessData = new Uint8Array(size * size * 4);
    const normalData = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = (y * size + x) * 4;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        const edgeMask = Math.max(0, Math.min(1, edge / 18));
        const noise = Math.sin(x * 0.21 + y * 0.17) * 8 + Math.cos((x - y) * 0.13) * 6;
        const frost = Math.max(130, Math.min(248, 220 + noise - (1 - edgeMask) * 40));

        colorData[i] = frost - 18;
        colorData[i + 1] = frost + 2;
        colorData[i + 2] = frost + 10;
        colorData[i + 3] = 255;

        const roughness = Math.max(140, Math.min(255, 230 - edgeMask * 30 + noise * 0.5));
        roughnessData[i] = roughness;
        roughnessData[i + 1] = roughness;
        roughnessData[i + 2] = roughness;
        roughnessData[i + 3] = 255;

        const nx = Math.max(72, Math.min(184, 128 + (x < 10 ? -28 : x > size - 11 ? 28 : 0) + noise * 0.2));
        const ny = Math.max(72, Math.min(184, 128 + (y < 10 ? -28 : y > size - 11 ? 28 : 0) - noise * 0.15));
        normalData[i] = nx;
        normalData[i + 1] = ny;
        normalData[i + 2] = 255;
        normalData[i + 3] = 255;
      }
    }

    const map = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
    const roughnessMap = new THREE.DataTexture(roughnessData, size, size, THREE.RGBAFormat);
    const normalMap = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);

    for (const t of [map, roughnessMap, normalMap]) {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    map.colorSpace = THREE.SRGBColorSpace;

    return { map, normalMap, roughnessMap };
  }, []);
}

function IceBlock({ accent, index, initialPosition, pulse, row }) {
  const ref = useRef(null);
  const home = useMemo(() => new THREE.Vector3(...initialPosition), [initialPosition]);
  const outward = useMemo(() => home.clone().normalize(), [home]);
  const maps = useIceBlockMaps();

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const localPulse = Math.max(0, (pulse - index * 0.02) / Math.max(0.001, 1 - index * 0.02));
    const breath = Math.sin(t * 0.8 + row + index) * 0.006;
    ref.current.position.copy(home);
    ref.current.position.addScaledVector(outward, localPulse * (0.12 + row * 0.04));
    ref.current.position.y += breath + localPulse * 0.08;
    ref.current.rotation.x = localPulse * (0.18 + (index % 3) * 0.1);
    ref.current.rotation.y = localPulse * (0.12 + (index % 2) * 0.1);
    ref.current.rotation.z = localPulse * ((index % 2 === 0 ? 1 : -1) * 0.08);
  });

  return (
    <group ref={ref} position={home} userData={{ className: "ice-block" }}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH]} />
        <meshStandardMaterial
          color={BASE_COLOR}
          emissive={accent}
          emissiveIntensity={0.02 + pulse * 0.08}
          map={maps.map}
          metalness={0.04}
          normalMap={maps.normalMap}
          normalScale={[0.08, 0.08]}
          roughness={0.74}
          roughnessMap={maps.roughnessMap}
        />
      </mesh>
      <mesh scale={[BLOCK_WIDTH + 0.015, BLOCK_HEIGHT + 0.015, BLOCK_DEPTH + 0.015]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={GLOW_COLOR} transparent opacity={0.04 + pulse * 0.18} />
      </mesh>
    </group>
  );
}

function IglooSeams({ accent, blocks, pulse }) {
  const seams = useMemo(() => {
    const list = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const a = blocks[i];
      for (let j = i + 1; j < blocks.length; j += 1) {
        const b = blocks[j];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < BLOCK_WIDTH * 1.15 && d > BLOCK_WIDTH * 0.85) {
          list.push({ start: a, end: b, key: `${i}-${j}` });
        }
      }
    }
    return list.slice(0, 120);
  }, [blocks]);

  return (
    <group name="IglooSeams">
      {seams.map((seam) => {
        const from = new THREE.Vector3(...seam.start);
        const to = new THREE.Vector3(...seam.end);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const len = from.distanceTo(to);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        return (
          <mesh key={seam.key} position={mid.toArray()} quaternion={q} scale={[0.018, len, 0.018]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshBasicMaterial color={pulse > 0.1 ? accent : GLOW_COLOR} transparent opacity={0.28 + pulse * 0.42} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function IglooDome({ accent = "#5ff8e7", position = [0, 0, 0], pulse = 0, quality = "high" }) {
  const innerLight = useRef(null);
  const groupRef = useRef(null);

  const { blocks, entrance } = useMemo(() => {
    const list = [];
    for (let row = 0; row < IGLOO_BLOCK_ROWS; row += 1) {
      const count = IGLOO_BLOCKS_PER_ROW[row];
      const theta = (Math.PI * 0.5 * (row + 0.5)) / IGLOO_BLOCK_ROWS;
      const ringRadius = Math.sin(theta) * IGLOO_RADIUS;
      const y = Math.cos(theta) * IGLOO_HEIGHT + 0.12;
      for (let col = 0; col < count; col += 1) {
        const angle = (col / count) * Math.PI * 2 + row * 0.18;
        // Leave an entrance gap around angle 0 for the lower rows.
        if (row < 3 && (angle < 0.45 || angle > Math.PI * 2 - 0.45)) continue;
        const x = Math.cos(angle) * ringRadius;
        const z = Math.sin(angle) * ringRadius * 0.72;
        list.push([x, y, z]);
      }
    }
    return { blocks: list, entrance: [IGLOO_RADIUS * 0.55, 0.35, 0] };
  }, []);

  useFrame(({ clock }) => {
    if (innerLight.current) {
      innerLight.current.intensity = 1.2 + Math.sin(clock.elapsedTime * 1.4) * 0.2 + pulse * 2.4;
    }
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.25) * 0.015;
    }
  });

  const visibleBlocks = quality === "low" ? blocks.filter((_, i) => i % 2 === 0) : blocks;

  return (
    <group ref={groupRef} name="IglooDome" position={position} userData={{ className: "igloo-dome" }}>
      {/* Inner glow volume */}
      <mesh position={[0, 0.55, 0]} scale={[1.6, 1.1, 1.2]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial color={GLOW_COLOR} transparent opacity={0.08 + pulse * 0.18} depthWrite={false} />
      </mesh>
      <pointLight ref={innerLight} color={accent} distance={7} intensity={1.2} position={[0, 0.6, 0]} />
      <spotLight color={GLOW_COLOR} intensity={0.8} angle={0.6} penumbra={0.8} position={[0, 0.9, 0]} target-position={[0, 0, 0]} />

      {/* Entrance tunnel */}
      <mesh position={entrance} rotation={[0, 0, -0.1]} scale={[0.55, 0.55, 0.55]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={SHADOW_COLOR} roughness={0.88} />
      </mesh>

      <IglooSeams accent={accent} blocks={blocks} pulse={pulse} />

      {visibleBlocks.map((pos, index) => (
        <IceBlock
          accent={accent}
          index={index}
          initialPosition={pos}
          key={`ice-block-${index}`}
          pulse={pulse}
          row={Math.floor(index / 12)}
        />
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Mount `IglooDome` in `IglooScene.jsx`**

Open `components/IglooScene.jsx`. Find:

```jsx
import PolarObservatoryDome from "./PolarObservatoryDome";
```

Replace with:

```jsx
import IglooDome from "./IglooDome";
```

Find the `<PolarObservatoryDome ... />` usage inside `IglooScene` and replace with:

```jsx
{!debugFlags.noDome && (
  <IglooDome
    accent={activeArtifact?.accent}
    position={[OBSERVATORY_HOME_X, 0, 0]}
    pulse={iglooPulse}
    quality={quality}
  />
)}
```

Add `iglooPulse` to the `IglooScene` props:

```jsx
export default function IglooScene({
  ...existing props...
  iglooPulse = 0,
}) { ... }
```

- [ ] **Step 3: Run `npm run lint`**

Fix any lint errors.

- [ ] **Step 4: Commit**

```bash
git add components/IglooDome.jsx components/IglooScene.jsx
git commit -m "feat: procedural igloo.inc-style ice igloo"
```

---

## Task 3: Snowy Mountain Terrain

**Files:**
- Create: `components/IglooTerrain.jsx`
- Modify: `components/IglooScene.jsx`

**Interfaces:**
- Consumes: `axisX`, `depthZ`, `quality`.
- Produces: Infinite/recycled snowy terrain chunks with distant mountains.

- [ ] **Step 1: Create `components/IglooTerrain.jsx`**

```jsx
"use client";

import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const CHUNK_SIZE = 24;
const CHUNK_COUNT = 9;
const VIEW_WIDTH = 18;

const SNOW_PBR = {
  map: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_albedo.png",
  normalMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_normal-ogl.png",
  roughnessMap: "/assets/pbr/ground/cloudy-veined-quartz-light-bl/cloudy-veined-quartz-light_roughness.png",
};

function height(x, z) {
  return Math.sin(x * 0.14) * 0.28 + Math.cos(z * 0.22) * 0.18 + Math.sin((x + z) * 0.08) * 0.22;
}

function MountainRidge({ x, z, scale, seed }) {
  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 1, 7);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      pos.setX(i, px + Math.sin(py * 3 + seed) * 0.12);
      pos.setZ(i, pz + Math.cos(py * 2 + seed) * 0.12);
    }
    geo.computeVertexNormals();
    return geo;
  }, [seed]);

  return (
    <mesh position={[x, scale * 0.35, z]} rotation={[0, seed, 0]} scale={[scale, scale * 0.7, scale * 0.6]} geometry={geometry}>
      <meshStandardMaterial color="#8fa3ad" emissive="#061014" emissiveIntensity={0.18} roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

function TerrainChunk({ maps, x, z }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, VIEW_WIDTH, 32, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const px = pos.getX(i) + x;
      const pz = pos.getY(i) + z;
      pos.setZ(i, height(px, pz));
    }
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [x, z]);

  return (
    <mesh position={[x, -0.2, z]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#e4eef1"
        emissive="#0a1518"
        emissiveIntensity={0.12}
        map={maps.map}
        metalness={0.02}
        normalMap={maps.normalMap}
        normalScale={[0.04, 0.04]}
        roughness={0.86}
        roughnessMap={maps.roughnessMap}
      />
    </mesh>
  );
}

export default function IglooTerrain({ axisX = 0, depthZ = 0, quality = "high" }) {
  const maps = useTexture(SNOW_PBR);
  const chunks = useMemo(() => Array.from({ length: CHUNK_COUNT }, (_, i) => i - Math.floor(CHUNK_COUNT / 2)), []);
  const ridges = useMemo(() => {
    const list = [];
    for (let i = 0; i < 14; i += 1) {
      list.push({
        key: `ridge-${i}`,
        seed: i * 1.91,
        x: (i % 2 === 0 ? -1 : 1) * (18 + (i % 5) * 12),
        z: -30 - (i % 7) * 14,
        scale: 4 + (i % 4) * 1.8,
      });
    }
    return list;
  }, []);

  // Recycle chunks around the seal/camera x.
  const baseChunk = Math.round(axisX / CHUNK_SIZE);
  const depthChunk = Math.round(depthZ / VIEW_WIDTH);

  return (
    <group name="IglooTerrain">
      {chunks.map((offset) => {
        const cx = (baseChunk + offset) * CHUNK_SIZE;
        return (
          <TerrainChunk key={`chunk-x-${cx}`} maps={maps} x={cx} z={0} />
        );
      })}
      {chunks.map((offset) => {
        const cz = (depthChunk + offset) * VIEW_WIDTH;
        return (
          <TerrainChunk key={`chunk-z-${cz}`} maps={maps} x={baseChunk * CHUNK_SIZE} z={cz} />
        );
      })}
      {ridges.map((ridge) => (
        <MountainRidge key={ridge.key} seed={ridge.seed} x={ridge.x + axisX * 0.2} z={ridge.z} scale={ridge.scale} />
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Replace old terrain in `IglooScene.jsx`**

Find:

```jsx
import IglooArtifacts, { IGLOO_ARTIFACTS } from "./IglooArtifacts";
```

Add below it:

```jsx
import IglooTerrain from "./IglooTerrain";
```

Find the `IceAxisTerrain` usage:

```jsx
{!debugFlags.noTerrain && <IceAxisTerrain axisX={axisX} depthZ={depthZ} />}
```

Replace with:

```jsx
{!debugFlags.noTerrain && <IglooTerrain axisX={axisX} depthZ={depthZ} quality={quality} />}
```

- [ ] **Step 3: Run `npm run lint`**

- [ ] **Step 4: Commit**

```bash
git add components/IglooTerrain.jsx components/IglooScene.jsx
git commit -m "feat: snowy mountain terrain with recycled chunks"
```

---

## Task 4: Snow Atmosphere + Fog

**Files:**
- Create: `components/SnowAtmosphere.jsx`
- Modify: `components/IglooScene.jsx`

**Interfaces:**
- Consumes: `quality`, `axisX`, `depthZ`, `windSpeed`.
- Produces: Falling snow particles and ground fog planes.

- [ ] **Step 1: Create `components/SnowAtmosphere.jsx`**

```jsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export default function SnowAtmosphere({ axisX = 0, depthZ = 0, quality = "high", windSpeed = 1 }) {
  const snow = useRef(null);
  const fog = useRef(null);
  const count = quality === "low" ? 400 : quality === "medium" ? 900 : 1600;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!snow.current) return;
    const t = clock.elapsedTime;
    const pos = snow.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i += 1) {
      const ix = i * 3;
      pos[ix + 1] -= 0.02 * windSpeed;
      pos[ix] += Math.sin(t * 0.5 + i) * 0.003 * windSpeed;
      pos[ix + 2] += Math.cos(t * 0.3 + i) * 0.003 * windSpeed;
      if (pos[ix + 1] < -1) {
        pos[ix + 1] = 10;
        pos[ix] = (Math.random() - 0.5) * 40 + axisX;
        pos[ix + 2] = (Math.random() - 0.5) * 24 + depthZ;
      }
    }
    snow.current.geometry.attributes.position.needsUpdate = true;
    if (fog.current) {
      fog.current.position.x = axisX;
      fog.current.position.z = depthZ;
    }
  });

  return (
    <group name="SnowAtmosphere">
      <points ref={snow} position={[axisX, 0, depthZ]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#f3fffb" size={0.035} transparent opacity={0.55} depthWrite={false} />
      </points>
      <mesh ref={fog} position={[axisX, -0.4, depthZ]} rotation={[-Math.PI / 2, 0, 0]} scale={[36, 22, 1]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshBasicMaterial color="#dfeef2" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Mount in `IglooScene.jsx`**

Add import:

```jsx
import SnowAtmosphere from "./SnowAtmosphere";
```

Inside the `<Canvas>` Suspense block, add:

```jsx
{!debugFlags.noSnow && (
  <SnowAtmosphere axisX={axisX} depthZ={depthZ} quality={quality} windSpeed={1 + Math.abs(axisVelocity)} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/SnowAtmosphere.jsx components/IglooScene.jsx
git commit -m "feat: snow particle atmosphere and ground fog"
```

---

## Task 5: Controllable Seal Avatar (Bruno Simon Style)

**Files:**
- Create: `components/SealAvatar.jsx`
- Modify: `components/IglooScene.jsx`
- Modify: `components/IglooWorld.jsx`

**Interfaces:**
- Consumes: `axisX`, `depthZ`, `axisVelocity`, `depthVelocity`, `moving`, `accent`, `iglooPosition`, `onTouchIgloo`.
- Produces: A seal mesh that the player drives with WASD, with physics-feeling inertia, banking, and cute companion reactions.

- [ ] **Step 1: Create `components/SealAvatar.jsx`**

```jsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const SEAL_SCALE = 0.42;
const MAX_SPEED = 5.8;
const ACCEL = 8.0;
const FRICTION = 4.0;
const TURN_SPEED = 4.5;

function SealBody({ accent }) {
  return (
    <group scale={SEAL_SCALE}>
      {/* Main body */}
      <mesh position={[0, 0, 0]} castShadow>
        <capsuleGeometry args={[0.42, 1.05, 8, 16]} />
        <meshPhysicalMaterial
          color="#f3fffb"
          emissive={accent}
          emissiveIntensity={0.06}
          roughness={0.38}
          metalness={0.02}
          clearcoat={0.6}
          clearcoatRoughness={0.24}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0.55, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.34, 32, 24]} />
        <meshPhysicalMaterial color="#f3fffb" roughness={0.38} clearcoat={0.6} />
      </mesh>
      {/* Snout */}
      <mesh position={[0.84, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color="#c8d5df" roughness={0.5} />
      </mesh>
      {/* Nose */}
      <mesh position={[0.95, 0.22, 0]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshBasicMaterial color="#0a1012" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.78, 0.32, 0.12]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshBasicMaterial color="#0a1012" />
      </mesh>
      <mesh position={[0.78, 0.32, -0.12]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshBasicMaterial color="#0a1012" />
      </mesh>
      {/* Tail */}
      <mesh position={[-0.62, -0.08, 0]} rotation={[0, 0, -0.35]} castShadow>
        <coneGeometry args={[0.16, 0.42, 16]} />
        <meshPhysicalMaterial color="#f3fffb" roughness={0.42} clearcoat={0.5} />
      </mesh>
      {/* Flippers */}
      <mesh position={[0.05, -0.28, 0.32]} rotation={[0.35, 0, -0.25]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshPhysicalMaterial color="#f3fffb" roughness={0.42} clearcoat={0.5} />
      </mesh>
      <mesh position={[0.05, -0.28, -0.32]} rotation={[-0.35, 0, -0.25]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshPhysicalMaterial color="#f3fffb" roughness={0.42} clearcoat={0.5} />
      </mesh>
      {/* Cute whisker lines */}
      <mesh position={[0.86, 0.2, 0.08]} rotation={[0, 0, Math.PI / 2]} scale={[0.006, 0.12, 0.006]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial color="#8aa9ad" />
      </mesh>
      <mesh position={[0.86, 0.2, -0.08]} rotation={[0, 0, Math.PI / 2]} scale={[0.006, 0.12, 0.006]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial color="#8aa9ad" />
      </mesh>
    </group>
  );
}

export default function SealAvatar({
  accent = "#5ff8e7",
  axisVelocity = 0,
  depthVelocity = 0,
  iglooPosition = [0, 0, 0],
  moving = false,
  onTouchIgloo,
}) {
  const root = useRef(null);
  const velocity = useRef(new THREE.Vector2(0, 0));
  const heading = useRef(Math.PI / 2);
  const targetHeading = useRef(Math.PI / 2);

  useFrame((_, delta) => {
    if (!root.current) return;
    const dt = Math.min(delta, 0.05);

    // Input intent
    const input = new THREE.Vector2(axisVelocity, depthVelocity);
    if (input.lengthSq() > 0.001) {
      input.normalize().multiplyScalar(ACCEL * dt);
      velocity.current.add(input);
    }

    // Friction
    velocity.current.multiplyScalar(Math.max(0, 1 - FRICTION * dt));
    velocity.current.clampLength(0, MAX_SPEED);

    // Heading
    if (velocity.current.lengthSq() > 0.05) {
      targetHeading.current = Math.atan2(velocity.current.y, velocity.current.x);
    }
    let hDiff = targetHeading.current - heading.current;
    while (hDiff > Math.PI) hDiff -= Math.PI * 2;
    while (hDiff < -Math.PI) hDiff += Math.PI * 2;
    heading.current += hDiff * TURN_SPEED * dt;

    // Integrate position
    root.current.position.x += velocity.current.x * dt;
    root.current.position.z += velocity.current.y * dt;

    // Terrain height follow
    const terrainY = Math.sin(root.current.position.x * 0.14) * 0.28 + Math.cos(root.current.position.z * 0.22) * 0.18;
    root.current.position.y = THREE.MathUtils.lerp(root.current.position.y, 0.35 + terrainY, 0.2);

    // Rotation: face heading, bank into turns
    root.current.rotation.y = -heading.current + Math.PI / 2;
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, -hDiff * 1.2, 0.1);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, velocity.current.length() * 0.04, 0.1);

    // Cute idle bounce when not moving
    if (!moving && velocity.current.length() < 0.1) {
      root.current.position.y += Math.sin(performance.now() * 0.004) * 0.003;
      root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, Math.sin(performance.now() * 0.002) * 0.08, 0.05);
    }
  });

  return (
    <group
      ref={root}
      name="SealAvatar"
      position={[iglooPosition[0] + 2.2, 0.35, iglooPosition[2] + 0.8]}
      userData={{ className: "seal-avatar" }}
    >
      <SealBody accent={accent} />
      <pointLight color={accent} intensity={moving ? 2.2 : 1.2} distance={4.5} position={[0, 0.4, 0]} />
    </group>
  );
}
```

- [ ] **Step 2: Mount `SealAvatar` in `IglooScene.jsx`**

Add import:

```jsx
import SealAvatar from "./SealAvatar";
```

Inside the scene, replace the old `SdfSealMascot` block with:

```jsx
{renderEnabled && sealAwake && !debugFlags.noSeal && (
  <SealAvatar
    accent={activeArtifact?.accent}
    axisVelocity={axisVelocity}
    depthVelocity={depthVelocity}
    iglooPosition={[OBSERVATORY_HOME_X, 0, 0]}
    moving={moving}
    onTouchIgloo={onTouchIgloo}
  />
)}
```

Add `onTouchIgloo` to props.

- [ ] **Step 3: Update `IglooWorld.jsx` to drive the seal and pass igloo pulse**

Add state near other state declarations:

```jsx
const [iglooPulse, setIglooPulse] = useState(0);
```

Add a function to trigger igloo touch:

```jsx
const touchIgloo = useCallback(() => {
  setIglooPulse(1);
  window.setTimeout(() => setIglooPulse(0), 1200);
}, []);
```

Pass `iglooPulse` and `onTouchIgloo` to `IglooScene`:

```jsx
<IglooScene
  ...existing props...
  iglooPulse={iglooPulse}
  onTouchIgloo={touchIgloo}
/>
```

- [ ] **Step 4: Update `check-teerth.mjs` seal assertions**

Change the `SdfSealMascot` existence check to `SealAvatar.jsx`.

Change primitives from SDF-specific strings to:

```js
for (const sealPrimitive of ["SealAvatar", "SealBody", "seal-avatar", "capsuleGeometry"]) {
  expectIncludes("components/SealAvatar.jsx", sealAvatar, sealPrimitive, `seal avatar must define ${sealPrimitive}`);
}
```

- [ ] **Step 5: Run lint and commit**

```bash
npm run lint
git add components/SealAvatar.jsx components/IglooScene.jsx components/IglooWorld.jsx scripts/check-teerth.mjs
git commit -m "feat: controllable seal avatar with physics feel"
```

---

## Task 6: Igloo Touch Interaction

**Files:**
- Create: `components/IglooTouch.jsx`
- Modify: `components/IglooScene.jsx`

**Interfaces:**
- Consumes: `onTouchIgloo`, `sealPosition`.
- Produces: Raycasting from pointer; when the igloo is clicked/tapped, triggers the pulse and makes the seal look at the igloo.

- [ ] **Step 1: Create `components/IglooTouch.jsx`**

```jsx
"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function IglooTouch({ onTouchIgloo }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, gl.camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const touchedIgloo = hits.some((hit) => hit.object.userData?.className === "ice-block" || hit.object.parent?.userData?.className === "igloo-dome");
      if (touchedIgloo) onTouchIgloo();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    return () => canvas.removeEventListener("pointerdown", onPointerDown);
  }, [gl, onTouchIgloo, scene]);

  return null;
}
```

Add the missing import:

```jsx
import * as THREE from "three";
```

- [ ] **Step 2: Mount in `IglooScene.jsx`**

Add import:

```jsx
import IglooTouch from "./IglooTouch";
```

Inside the scene, near the top of `<Suspense>`:

```jsx
<IglooTouch onTouchIgloo={onTouchIgloo} />
```

- [ ] **Step 3: Commit**

```bash
git add components/IglooTouch.jsx components/IglooScene.jsx
git commit -m "feat: raycast igloo touch interaction"
```

---

## Task 7: Camera Follows the Seal

**Files:**
- Modify: `components/IglooScene.jsx`

**Interfaces:**
- Consumes: `sealPosition` (ref), `axisX`, `depthZ`.
- Produces: Camera rig that frames the seal and igloo, with smooth inertia.

- [ ] **Step 1: Replace `CameraRig` in `IglooScene.jsx`**

Find the existing `CameraRig` function and replace it with:

```jsx
function CameraRig({ sealPosition, axisX, depthZ, quality, renderEnabled }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Use seal position if available, otherwise fall back to axis/depth.
    const focusX = renderEnabled && sealPosition.current ? sealPosition.current.x : axisX;
    const focusZ = renderEnabled && sealPosition.current ? sealPosition.current.z : depthZ;
    target.set(focusX, 0.9, focusZ);

    const distance = quality === "low" ? 9.5 : 8.2;
    const desired = new THREE.Vector3(
      target.x - 0.6 + Math.sin(t * 0.12) * 0.12,
      target.y + distance * 0.45,
      target.z + distance + Math.cos(t * 0.1) * 0.15,
    );
    camera.position.lerp(desired, 0.04);
    camera.lookAt(target.x + 0.3, target.y, target.z);
  });

  return null;
}
```

- [ ] **Step 2: Pass seal position ref to `CameraRig`**

In `IglooScene`, create a ref:

```jsx
const sealRef = useRef(null);
```

Pass it to `CameraRig`:

```jsx
<CameraRig sealPosition={sealRef} axisX={axisX} depthZ={depthZ} quality={quality} renderEnabled={renderEnabled} />
```

Attach `sealRef` to `SealAvatar`:

```jsx
<SealAvatar ref={sealRef} ... />
```

Update `SealAvatar` to forward ref:

```jsx
import { forwardRef } from "react";

const SealAvatar = forwardRef(function SealAvatar({ ...props }, ref) {
  return (
    <group ref={ref} ...>
      ...
    </group>
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add components/IglooScene.jsx components/SealAvatar.jsx
git commit -m "feat: camera follows controllable seal"
```

---

## Task 8: Minimal igloo.inc-Style HUD

**Files:**
- Modify: `components/IglooHud.jsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `activeArtifact`, `content`, `axisVelocity`, `depthVelocity`, `quality`, `setQuality`.
- Produces: Top-left brand/copyright, top-right manifesto, bottom-left controls hint, bottom-right quality/sound.

- [ ] **Step 1: Replace `components/IglooHud.jsx`**

```jsx
function formatDate(value) {
  if (!value) return "time unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export default function IglooHud({
  activeArtifact,
  axisVelocity,
  content,
  depthVelocity,
  liveSummary,
  quality,
  setQuality,
}) {
  const moving = Math.abs(axisVelocity) + Math.abs(depthVelocity) > 0.05;
  const latest = liveSummary?.latest?.[0];

  return (
    <div className="igloo-hud">
      <div className="igloo-brand">
        <strong>IGLOO</strong>
        <span>// Copyright © 2026</span>
        <p>Teerth Sharma. All Rights Reserved.</p>
      </div>

      <div className="igloo-manifesto">
        <span>////// Manifesto</span>
        <p>{content.profile?.manifesto || "Systems that compile research into working artifacts."}</p>
      </div>

      <div className="igloo-controls-hint">
        <span>{moving ? "Exploring the ice world..." : "Use WASD or ARROWS to move the seal"}</span>
        <small>SHIFT boost · SPACE jump · ENTER interact</small>
      </div>

      {latest && (
        <a className="igloo-live-strip" href={latest.url || content.profile.github} target="_blank" rel="noreferrer">
          <span>{liveSummary?.sourceMode === "live-github" ? "live upstream" : "snapshot"}</span>
          <strong>{latest.repo}</strong>
          <small>{latest.label} / {formatDate(latest.createdAt)}</small>
        </a>
      )}

      <div className="igloo-controls" aria-label="Graphics quality">
        {["low", "medium", "high"].map((mode) => (
          <button
            aria-pressed={quality === mode}
            key={mode}
            onClick={() => setQuality(mode)}
            type="button"
          >
            {mode}
          </button>
        ))}
      </div>

      <aside className="igloo-readout" aria-live="polite">
        <span>{activeArtifact.stationProfile?.index || "PORTFOLIO"}</span>
        <h2>{activeArtifact.shortLabel}</h2>
        <p>{activeArtifact.description}</p>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Update CSS in `app/globals.css`**

Add a new block near the end of the file (before media queries):

```css
.igloo-manifesto {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  width: min(280px, 30vw);
  text-align: right;
  color: rgba(223, 253, 247, 0.82);
  text-shadow: 0 0 24px rgba(0, 0, 0, 0.72);
}

.igloo-manifesto span {
  display: block;
  margin-bottom: 8px;
  color: rgba(95, 248, 231, 0.78);
  font-family: var(--font-pixel), Consolas, monospace;
  font-size: 0.64rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.igloo-manifesto p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}

.igloo-controls-hint {
  grid-column: 1;
  grid-row: 3;
  align-self: end;
  color: rgba(223, 253, 247, 0.72);
  font-family: var(--font-pixel), Consolas, monospace;
  text-transform: uppercase;
}

.igloo-controls-hint span {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.igloo-controls-hint small {
  color: rgba(223, 253, 247, 0.46);
  font-size: 0.58rem;
}

.igloo-readout {
  grid-column: 2;
  grid-row: 2;
  align-self: end;
  justify-self: end;
  width: min(300px, 28vw);
  padding-left: 16px;
  border-left: 1px solid rgba(223, 253, 247, 0.24);
  text-align: right;
  text-shadow: 0 0 24px rgba(0, 0, 0, 0.72);
}

.igloo-readout span {
  color: rgba(95, 248, 231, 0.72);
  font-family: var(--font-pixel), Consolas, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.igloo-readout h2 {
  margin: 8px 0 10px;
  color: rgba(243, 255, 252, 0.96);
  font-family: var(--font-display), var(--font-display-fallback);
  font-size: clamp(1.4rem, 2.5vw, 2.6rem);
  line-height: 0.94;
  text-transform: uppercase;
}

.igloo-readout p {
  margin: 0;
  color: rgba(223, 253, 247, 0.62);
  font-size: 0.76rem;
  line-height: 1.35;
}
```

Remove or hide the old `.igloo-artifact-list` and `.igloo-axis-meter` if desired, or keep them collapsed at bottom center. For this plan, hide them on desktop by adding:

```css
.igloo-artifact-list,
.igloo-axis-meter {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 1080px) {
  .igloo-manifesto,
  .igloo-readout {
    display: none;
  }
  .igloo-controls-hint {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/IglooHud.jsx app/globals.css
git commit -m "feat: minimal igloo.inc-style edge HUD"
```

---

## Task 9: Integration, Cleanup, and QA Flags

**Files:**
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooScene.jsx`
- Delete: `components/PolarObservatoryDome.jsx`, `components/SdfSealMascot.jsx` (after new ones work)

- [ ] **Step 1: Wire up `IglooWorld` to pass all new props**

Ensure `IglooScene` receives:

```jsx
<IglooScene
  activeArtifactId={activeArtifactId}
  axisVelocity={axisVelocity}
  axisX={axisX}
  depthVelocity={depthVelocity}
  depthZ={depthZ}
  artifacts={artifacts}
  moving={Math.abs(axisVelocity) + Math.abs(depthVelocity) > 0}
  onSelectArtifact={selectArtifact}
  onTouchIgloo={touchIgloo}
  iglooPulse={iglooPulse}
  quality={reduced ? "low" : quality}
  renderEnabled={sdfRenderEnabled}
  sealAwake={sealAwake}
  debugFlags={sceneDebugFlags}
/>
```

- [ ] **Step 2: Add `qa-no-snow` debug flag**

In `IglooWorld.jsx`, add to `SCENE_DEBUG_FLAG_QUERIES`:

```js
["qa-no-snow", "noSnow"],
```

- [ ] **Step 3: Run `npm run check:teerth`**

Expected: PASS after all new files exist and assertions are updated.

- [ ] **Step 4: Run `npm run lint`**

Fix any lint errors.

- [ ] **Step 5: Delete obsolete files**

```bash
git rm components/PolarObservatoryDome.jsx components/SdfSealMascot.jsx
```

- [ ] **Step 6: Commit**

```bash
git add components/IglooWorld.jsx components/IglooScene.jsx app/globals.css scripts/check-teerth.mjs
git commit -m "feat: integrate super-igloo + seal avatar + minimal HUD"
```

---

## Task 10: Verification Loop

**Files:**
- Use: `verification/screenshots-super-igloo/**`

- [ ] **Step 1: Run `npm run check:teerth`**

Expected: PASS.

- [ ] **Step 2: Run `npm run lint`**

Expected: no errors.

- [ ] **Step 3: Run `npm run build`**

Expected: build succeeds.

- [ ] **Step 4: Start dev server and capture screenshots**

```bash
npm run dev
```

Capture screenshots at:
- 1440x900 desktop
- 768x1024 tablet
- 375x667 mobile

Verify:
- Central ice igloo visible with glowing seams.
- Snow terrain + mountains visible.
- Seal spawns and moves with WASD.
- Clicking/tapping the igloo triggers block displacement + inner glow.
- Minimal HUD matches igloo.inc edge layout.
- No text overlap on mobile.

- [ ] **Step 5: Commit verification artifacts**

```bash
git add verification/screenshots-super-igloo/
git commit -m "docs: verification screenshots for super-igloo build"
```

---

## Self-Review

- **Spec coverage:** Every reference requirement maps to a task: igloo visual (Task 2), snowy world (Task 3), atmosphere (Task 4), controllable seal (Task 5), touchable igloo (Task 6), camera follow (Task 7), minimal HUD (Task 8), integration/QA (Task 9), verification (Task 10).
- **Placeholder scan:** No TBD/TODO/fill-in steps. Code blocks contain real implementation.
- **Type consistency:** `IglooDome` props (`accent`, `position`, `pulse`, `quality`), `SealAvatar` props (`axisVelocity`, `depthVelocity`, `iglooPosition`), and `IglooScene` props align across tasks.
- **Contract:** `check-teerth.mjs` is updated first so the new direction becomes the passing contract.
