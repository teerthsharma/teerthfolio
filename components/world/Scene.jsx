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

import { Canvas, useFrame } from "@react-three/fiber";
import { Component, Suspense, useRef } from "react";
import { PLACES, dockPoint } from "../../lib/world/places";
import { live, setUi } from "../../lib/world/store";
import { BUILDINGS } from "./buildings";
import CameraRig from "./CameraRig";
import Controller from "./Controller";
import Effects from "./Effects";
import Island from "./Island";
import Penguins from "./Penguins";
import PlaceLabel from "./PlaceLabel";
import Props from "./Props";
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
  };
}

function Buildings() {
  return PLACES.map((place) => {
    const Building = BUILDINGS[place.id];
    if (!Building) return null;
    return (
      <group key={place.id} position={[place.x, 0, place.z]} onClick={goTo(place)}>
        <Contain name={place.id}>
          <Building place={place} />
        </Contain>
        <PlaceLabel place={place} />
      </group>
    );
  });
}

function FirstFrame() {
  // useFrame runs before each draw, so the second call means one frame has
  // actually reached the screen: the only honest moment to say "ready".
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) {
      window.__world = { ...(window.__world || {}), ready: true };
      setUi({ ready: true });
    }
  });
  return null;
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.5, far: 260, position: [0, 20, 30] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", () => setUi({ failed: true }));
      }}
    >
      <Suspense fallback={null}>
        <Island />
        <Buildings />
        <Props />
        <Seal />
        <Trail />
        <Effects />
        <Penguins />
        <FirstFrame />
      </Suspense>
      <CameraRig />
      <Controller />
      <Sound />
    </Canvas>
  );
}
