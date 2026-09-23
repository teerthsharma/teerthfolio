"use client";

// What the seal wears at each place (the old site dressed it per station and
// the owner wants that back). Every variant renders <Outfit> inside its head
// group, so one outfit fits A, B and C alike. The head group's frame:
//   origin  the centre of the skull sphere
//   +z      where the nose points, +y up, +x the seal's own left
//   size    skull radius HEAD_RADIUS metres (a variant scales its head group
//           so its skull matches, whatever its own modelling units)
// Nothing yet: returns null for every place.

export const HEAD_RADIUS = 0.45;

// eslint-disable-next-line no-unused-vars -- the outfit build reads it
export default function Outfit({ placeId }) {
  return null;
}
