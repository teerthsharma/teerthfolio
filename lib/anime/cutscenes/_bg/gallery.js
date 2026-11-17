// THE GALLERY TABLE for _bg: each frame is a seal, a held camera and a world builder name (build.js). `&gal=<name>` picks one.
// shibuya, throne are the repaints of pr-triton-kernels-22 and pr-topograph-432 (the originals are not touched); the rest are the kit on its own.
export const FRAMES = {
  shibuya: { hero: "sukuna", seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.3, r: 3.3, elev: 0.35, fov: 42, look: [0, 1.1, -3] }, far: 600 },
  shibuyaWide: { hero: "sukuna", seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.5, r: 6.5, elev: 1.5, fov: 40, look: [0, 1.6, -8] }, far: 600, world: "shibuya" },
  domain: { hero: "sukuna", seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.2, r: 2.6, elev: -0.15, fov: 56, look: [0, 2.0, -4] }, far: 600, world: "shibuya" },
  throne: { hero: "ainz", seal: { at: [0, 0, -0.5], yaw: 0, scale: 1 }, cam: { az: Math.PI, r: 14.5, elev: 0.66, fov: 40, look: [0, 3.3, 11.8], minFrac: 0.05 }, far: 140 },
  throneLow: { hero: "ainz", seal: { at: [0, 0, 0.3], yaw: 0, scale: 1 }, cam: { az: Math.PI, r: 4.2, elev: 0.9, fov: 42, look: [0, 1.2, 4], minFrac: 0.05 }, far: 140, world: "throne" },
  day: { hero: null, seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.3, r: 3.2, elev: 0.15, fov: 38, look: [0, 0.75, -2] }, far: 700 },
  dayWide: { hero: null, seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.5, r: 7, elev: 1.8, fov: 42, look: [0, 3, -10] }, far: 700, world: "day" },
  classroom: { hero: null, seal: { at: [0, 0, -6], yaw: 0, scale: 1 }, cam: { az: 0.55, r: 2.8, elev: 0.25, fov: 50, look: [0, 0.9, -2], minFrac: 0.1 }, far: 100 },
  hall: { hero: null, seal: { at: [0, 0, -9], yaw: 0, scale: 1 }, cam: { az: 0.3, r: 3.6, elev: 0.35, fov: 46, look: [0, 1.4, -4], minFrac: 0.1 }, far: 200 },
  night: { hero: null, seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.35, r: 3.2, elev: 0.3, fov: 38, look: [0, 0.8, -2] }, far: 600 },
  storm: { hero: null, seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.4, r: 3.4, elev: 0.1, fov: 42, look: [0, 1.0, -3] }, far: 900 },
  sea: { hero: null, seal: { at: [0, 0, 0], yaw: 0, scale: 1 }, cam: { az: 0.4, r: 3.4, elev: 0.1, fov: 42, look: [0, 0.9, -3] }, far: 900 },
};
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
export const GAL = FRAMES[q.get("gal")] ? q.get("gal") : "shibuya";
export const FRAME = FRAMES[GAL];
