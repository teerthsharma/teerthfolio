"use client";

import Placeholder from "./Placeholder";

// Building for PLACE_BY_ID["workshop"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius.
export default function AssemblyWorkshop({ place }) {
  return <Placeholder place={place} />;
}
