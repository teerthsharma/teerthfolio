// Pure layout for the "caustic" building (p-caustic): where the 20 fixed
// beacon bulbs sit in the lamp room. No diagram, no per-entity data -- the
// figure's own stages, roles and counts were removed under SHOW, NEVER TELL
// (they read as a colour-legend chart, not lighthouse architecture).

const TAU = Math.PI * 2;
export const NE = 20;

// Entity i's own point, evenly spaced around a ring of radius r, i = 0
// nearest the camera (+z), so a visitor arriving at the dock faces it.
export function homePoint(i, r) {
  const a = (i / NE) * TAU;
  return [Math.sin(a) * r, Math.cos(a) * r];
}
