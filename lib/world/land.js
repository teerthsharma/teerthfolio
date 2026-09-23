// The landscape's own bulk, for collision. The eleven upstream contributions
// are the island's landforms (Mount MujoRush, the Google range, the
// TensorFlow dam, the NVIDIA keep and its moat, ...): each place in
// lib/world/places.js keeps one circle for its interaction point, and a
// landform bigger than that lists the rest of its footprint here as extra
// circles { x, z, radius } so the seal slides around mountains and dam walls
// instead of through them. Owned by the world director and the land builders.
export const LAND_COLLIDERS = [];
