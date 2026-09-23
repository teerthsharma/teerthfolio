"use client";

// Sculpture for the "closure" figure: tensorflow/tensorflow #124410 (place id pr-tensorflow-124410).
// Tells the same story as that figure on teerthsharma.github.io, in 3D.
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }.

import Placeholder from "./Placeholder";

export default function Closure({ place }) {
  return <Placeholder place={place} />;
}
