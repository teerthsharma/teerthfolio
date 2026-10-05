"use client";

// The whole 3D world. This file only composes; each part lives in its own
// file so it can be rebuilt without touching the others:
//   Island.jsx          ground, sea, sky, light, the name in the snow
//   buildings/*.jsx     one building per project (see buildings/index.js)
//   Seal.jsx            the player character
//   Props.jsx           loose things the seal can shove
//   CameraRig.jsx       the follow camera
//   Controller.jsx      input -> motion -> "which building am I at"
//   Trail, Effects, Penguins, Sound   the life around the seal
//   Atmosphere, Sea, Harbour, Look    sky and weather, water, the upstream
//                                     harbour, and the image-wide look

import { warmPending } from "./cutscene/prewarm";
import { Canvas, useFrame } from "@react-three/fiber";
import { Component, Suspense, useRef } from "react";
import { PLACES, dockPoint } from "../../lib/world/places";
import { getUi, live, setUi } from "../../lib/world/store";
import { BUILDINGS } from "./buildings";
import Atmosphere from "./Atmosphere";
import CameraRig from "./CameraRig";
import Districts from "./Districts";
import Controller from "./Controller";
import Blast from "./Blast";
import Effects from "./Effects";
import Harbour from "./Harbour";
import Island from "./Island";
import LabDecor from "./LabDecor";
import Look from "./Look";
import { SCULPTURES } from "./monuments";
import SpawnStatue from "./monuments/SpawnStatue";
import Penguins from "./Penguins";
import PlaceLabel from "./PlaceLabel";
import Props from "./Props";
import Sea from "./Sea";
import Toys from "./Toys";
import LoopAwakening from "./LoopAwakening";
import LoopBanner from "./LoopBanner";
import LoopCounter from "./LoopCounter";
import Cutscene from "./cutscene/Cutscene";
import Seal from "./Seal";
import Sound from "./Sound";
import Trail from "./Trail";

// One broken building must not take the island down with it.
class Contain extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error(`[world] ${this.props.name} failed to render`, error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function goTo(place) {
  return (event) => {
    if (event.delta > 8) return; // that was a drag, not a click
    event.stopPropagation();
    const dock = dockPoint(place);
    live.target = { x: dock.x, z: dock.z };
    live.pendingOpen = place.id;
    live.travelTo = null;
  };
}

const LAB_SCALE = 1.7; // lab sculptures read as landmarks: scale and collider (places.js LAB_RADIUS) grow together

function Buildings() {
  return PLACES.map((place) => {
    // Upstream contributions ARE the landscape (Districts.jsx draws them), so
    // they get only their label and click target here; lab projects are the
    // buildings Teerth builds, standing straight on the snow.
    const Building = BUILDINGS[place.id] ?? (place.section === "lab" ? SCULPTURES[place.figure?.name] : null);
    return (
      <group key={place.id} position={[place.x, 0, place.z]} onClick={goTo(place)}>
        <Contain name={place.id}>
          {Building && place.section === "lab" && !BUILDINGS[place.id] ? (
            <>
              <group scale={LAB_SCALE}>
                <Building place={place} />
              </group>
              <LabDecor place={place} radius={place.radius} />
            </>
          ) : (
            Building && <Building place={place} />
          )}
        </Contain>
        <PlaceLabel place={place} />
      </group>
    );
  });
}

// The loading screen stays up while the world auditions its first rung
// (Look.jsx guessed it from the renderer string): once shaders settle, the
// median of a few frames decides, and a rung that cannot hold 50 fps steps
// down before the visitor sees a frame. A pinned (?look=) or remembered rung
// needs no audition. The audition never holds the curtain past WARMUP_MS.
const WARMUP_MS = 6000;
const SETTLE_MS = 800; // after the world or a new rung appears: shader compiles and uploads hitch
const SAMPLE = 24;

function FirstFrame() {
  // useFrame runs before each draw, so a frame counted here has reached the
  // screen: the only honest moment to say "ready".
  const run = useRef({ frames: 0, start: 0, since: 0, dts: [], boot: 0 });
  useFrame((state, dt) => {
    const ui = getUi();
    if (ui.ready || ui.tier === null) return;
    const r = run.current;
    r.frames += 1;
    if (r.frames < 2) return;
    const now = performance.now();
    r.start ||= now;
    r.since ||= now;
    if (ui.tierFrom === "guess" && ui.tier > 0 && now - r.start < WARMUP_MS) {
      if (now - r.since < SETTLE_MS) return;
      r.dts.push(dt);
      if (r.dts.length < SAMPLE) return;
      const median = r.dts.sort((a, b) => a - b)[SAMPLE >> 1];
      r.dts = [];
      if (median > 1 / 50) {
        r.since = now;
        setUi({ tier: ui.tier - 1, tierCap: ui.tier - 1 });
        return;
      }
    }
    // BOOT COMPILE: every program the island draws is linked behind the curtain (compileAsync, into the composer's input buffer so the
    // program keys match the real draw), so the first interactive frames never stall on a first-sight shader. 8 s cap.
    if (r.boot !== 2) {
      if (!r.boot) {
        r.boot = 1;
        const { gl, scene, camera } = state;
        const prev = gl.getRenderTarget();
        const comp = window.__world?.composer;
        if (comp?.inputBuffer) gl.setRenderTarget(comp.inputBuffer);
        const done = () => { r.boot = 2; };
        try { gl.compileAsync(scene, camera).then(done, done); } catch { done(); }
        gl.setRenderTarget(prev);
        setTimeout(done, 8000);
      }
      return;
    }
    // lazy mounts (Suspense, tier passes, shadow depth variants) keep linking programs after the first compile: hold the curtain until the count
    // has been still for 700 ms (10 s cap), so those links land behind it
    const n = state.gl.info.programs?.length ?? 0;
    if (n !== r.progs) { r.progs = n; r.progAt = now; }
    if ((now - r.progAt < 700 || warmPending()) && now - r.start < 14000) return;
    window.__world = { ...(window.__world || {}), ready: true };
    setUi({ ready: true });
  });
  return null;
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={1}
      camera={{ fov: 28, near: 0.5, far: 320, position: [0, 20, 30] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", () => setUi({ failed: true }));
      }}
    >
      <Suspense fallback={null}>
        <Atmosphere />
        <Island />
        <Sea />
        <Harbour />
        <Districts />
        <Buildings />
        <SpawnStatue />
        <Props />
        <Toys />
        <Seal />
        <LoopAwakening />
        <LoopBanner />
        <LoopCounter />
        <Cutscene />
        <Trail />
        <Effects />
        <Blast />
        <Penguins />
        <FirstFrame />
      </Suspense>
      <CameraRig />
      <Controller />
      <Sound />
      <Look />
    </Canvas>
  );
}
