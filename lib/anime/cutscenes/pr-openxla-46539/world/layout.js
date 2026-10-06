// LAYOUT of the Kamino avenue, seal-local metres (x right, y up, z forward = the way the seal faces, toward the crater).
// The seal stands at the origin. Everything the world draws hangs off these numbers; index.js publishes them on ctx.set
// so other layers (cast: the Nomu rises from CRATER, the civilians stand on `roofs`; fx: the sun column lands near CRATER) can agree.
export const CRATER = { x: 0, z: 7, r: 3.2 };

// fires: [x, y, z, height m]. Ground fires burn at the block bases; facade fires burn out of broken floors.
export const FIRES = [
  [-8.6, 0, -44, 5], [8.8, 0, -38, 6], [-8.8, 0, -26, 4.5], [8.6, 0, -18, 5.5], [-8.4, 0, -9, 5.5], [8.5, 0, -2, 4],
  [8.6, 0, 16, 7], [-8.7, 0, 19, 6], [8.7, 0, 28, 5], [-8.5, 0, 34, 4.5], [8.8, 0, 44, 6], [-8.6, 0, 50, 5.5],
  [-4.5, 1.7, 22, 3.6], [5.6, 0, 11, 2.6],
  [-9.0, 9, -30, 4], [9.0, 12, -12, 4.5], [-9.0, 14, -4, 5], [9.0, 7, 22, 4], [-9.0, 11, 26, 4.5], [9.0, 15, 36, 5], [-9.0, 8, 44, 4], [9.0, 10, -46, 4.5],
];

// small heat/embers sources are the ground fires; the pavement bake lights its pools from them
export const POOLS = FIRES.map(([x, y, z, h]) => [x, z, y > 0.5 && y < 3 ? 3.4 : (y > 3 ? 3.5 : 4.5 + h * 0.8), y > 3 ? 0.45 : 1.0]);

// where the ground vehicles and dressing sit
export const TRUCK = { x: -4.6, z: 22, yaw: 0.35 };
export const SLAB = { x: -3.4, z: -2.2 };          // the PLUS ULTRA slab, facing the camera side (+x, +z)
export const SIGN = { x: -9.2, y: 9.5, z: -6 };    // the broken U.A. sign on the left block
