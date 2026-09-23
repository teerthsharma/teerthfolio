"use client";

// A fixed-angle follow camera, the way Bruno Simon's site frames its car: the
// view never rotates, so "up the screen" always means the same way on the
// island and the visitor never has to relearn the controls.

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { live } from "../../lib/world/store";

// Direction from the seal to the camera (elevation about 49 degrees).
const OFFSET = new Vector3(0, 27, 23);
const LOOK_AHEAD = 0.35; // seconds of velocity the view leads by

export default function CameraRig() {
  const { camera, size } = useThree();
  const focus = useRef(new Vector3(live.seal.x, 0, live.seal.z));
  const wanted = useRef(new Vector3());
  // ?zoom=0.35 brings the camera in for close-up screenshots of the seal or a
  // building; it is a debugging aid, not a player control.
  const zoom = useRef(null);
  if (zoom.current === null) {
    const value = typeof window === "undefined" ? NaN : Number(new URLSearchParams(window.location.search).get("zoom"));
    zoom.current = value > 0 ? value : 1;
  }

  useFrame((_, delta) => {
    const seal = live.seal;
    const aspect = size.width / size.height;
    // Portrait screens see a sliver of the island at the desktop distance, so
    // pull back until roughly the same width of ground is in view.
    const pull = Math.min(1.9, Math.max(1, 1.35 / aspect));
    // Speed zooms out a little so the road ahead stays in frame.
    const speedPull = 1 + Math.min(seal.speed / 10, 1) * 0.12;

    wanted.current.set(seal.x + seal.vx * LOOK_AHEAD, 0, seal.z + seal.vz * LOOK_AHEAD);
    focus.current.lerp(wanted.current, 1 - Math.exp(-4 * Math.min(delta, 0.1)));

    camera.position.copy(OFFSET).multiplyScalar(pull * speedPull * zoom.current).add(focus.current);
    camera.lookAt(focus.current.x, 0.6, focus.current.z);
  });

  return null;
}
