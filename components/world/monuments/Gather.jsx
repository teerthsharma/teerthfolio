"use client";

// Sculpture for the "gather" figure: NVIDIA/NeMo-Relay #481 (place id pr-nemo-relay-481).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Gather({ place }) {
  return <Placeholder place={place} />;
}
