"use client";

// Shared parts for the group-4 docks (Epsilon-Hollow, Caustic, Monodromy, the
// Topological ML Toolkit, Faraday). Built on the kit, never editing it: a Rig
// that follows the pup in the camera's own frame, flat ink with a rim hull,
// and additive glow. Everything is a few meshes or one instanced mesh, no post.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, DoubleSide, MeshBasicMaterial } from "three";
import { paletteFor } from "../../../../../lib/world/cutscene/look";
import { FIGURE_AT, landPoint, turnFor } from "../../../../../lib/world/cutscene/timeline";
import { live } from "../../../../../lib/world/store";

// The group every prop lives in: at the pup, turned like the camera's rig (so
// a land speaker's place stands where the figure would), shown only inside the
// stage and only in the full scene (reduced motion keeps the plain world;
// `still` keeps a prop standing there, for a guest that is itself the speaker).
export function Rig({ cut, children, still = false }) {
  const g = useRef();
  useFrame(() => {
    const a = live.arrival;
    const on = Boolean(a.id) && (cut.mode === "full" ? live.inStage : still);
    g.current.visible = on;
    if (!on) return;
    const s = live.seal;
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = turnFor(cut.card, cut.place, s.x, s.z);
  }, -1.19);
  return <group ref={g} visible={false}>{children}</group>;
}

// Where the land speaks from, in the rig's frame: along the figure's bearing, as far as the place.
export function landLocal(cut, out = [0, 0, 0]) {
  const a = landPoint(cut.card, cut.place);
  const s = live.seal;
  const d = Math.hypot(a.x - s.x, a.z - s.z);
  const n = Math.hypot(FIGURE_AT[0], FIGURE_AT[2]);
  out[0] = (FIGURE_AT[0] / n) * d;
  out[1] = a.y;
  out[2] = (FIGURE_AT[2] / n) * d;
  return out;
}

// Flat ink and its rim hull, tinted to the place (look.js).
export function useInk(card) {
  return useMemo(() => {
    const p = paletteFor(card);
    return {
      p,
      ink: new MeshBasicMaterial({ color: new Color(p.ink), toneMapped: false, fog: false }),
      rim: new MeshBasicMaterial({ color: new Color(p.rim), side: BackSide, toneMapped: false, fog: false }),
    };
  }, [card]);
}

// Additive glow in a flat colour; the move drives .opacity.
export function glow(color, side = DoubleSide) {
  return new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side });
}

// 0..1 window with a rise and a fall, so a prop comes in and goes out cleanly.
export const pulse = (t, a, b, ramp = 0.25) => Math.max(0, Math.min(1, Math.min((t - a) / ramp, (b - t) / ramp)));
