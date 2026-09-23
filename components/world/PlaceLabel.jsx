"use client";

// The name tag floating over a building. HTML, not 3D text, so it stays crisp
// and readable at any distance and on any screen.
//
// 23 of these on screen at once is clutter, so only the place the seal is
// standing at (ui.near) gets its full card, only places within CLOSE_RANGE
// expand to a small pill, and everything further off fades to a dot — read
// each frame from live.seal (no React state, so 23 labels moving every
// frame costs a dataset write, not 23 re-renders).

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { live, useUi } from "../../lib/world/store";

const CLOSE_RANGE = 24; // m: inside this, a label earns its name and kind

export default function PlaceLabel({ place, y = 6.5 }) {
  const near = useUi((s) => s.near === place.id);
  const ref = useRef(null);

  useFrame(() => {
    const dx = place.x - live.seal.x;
    const dz = place.z - live.seal.z;
    const close = dx * dx + dz * dz < CLOSE_RANGE * CLOSE_RANGE;
    const el = ref.current;
    if (el && el.dataset.close !== String(close)) el.dataset.close = close;
  });

  return (
    <Html position={[0, y, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div
        ref={ref}
        data-close="true"
        className={`place-label${near ? " is-near" : ""}`}
        style={{ "--accent": place.color }}
      >
        {place.section === "upstream" && place.logo && (
          <img className="place-label-logo" src={place.logo} alt="" width="14" height="14" />
        )}
        <span className="place-label-kind">{place.kind}</span>
        <span className="place-label-name">{place.name}</span>
      </div>
    </Html>
  );
}
