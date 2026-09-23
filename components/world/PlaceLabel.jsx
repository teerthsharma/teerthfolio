"use client";

// The name tag floating over a building. HTML, not 3D text, so it stays crisp
// and readable at any distance and on any screen.

import { Html } from "@react-three/drei";
import { useUi } from "../../lib/world/store";

export default function PlaceLabel({ place, y = 6.5 }) {
  const near = useUi((s) => s.near === place.id);
  return (
    <Html position={[0, y, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className={`place-label${near ? " is-near" : ""}`} style={{ "--accent": place.color }}>
        <span className="place-label-kind">{place.kind}</span>
        <span className="place-label-name">{place.name}</span>
      </div>
    </Html>
  );
}
