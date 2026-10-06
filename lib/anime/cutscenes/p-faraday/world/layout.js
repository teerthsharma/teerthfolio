// p-faraday WORLD layout: the shared coordinates (metres, world frame = the bible's bridge frame, deck top y = 0).
// Beam travels +x at y 0.75, z -0.95. The cast and fx agents hold the same numbers from the bible (scenery.js constants):
// bushings at x 0.4 and 4.6 (platform centre 2.5, BUSH_X 2.1), height 4.4; arc levels y 1.15 / 2.35 / 3.55.
export const BRIDGE = { x0: -22, x1: 28, half: 3.3, thick: 0.5, truss: 3.2, panel: 2.5, girder: 0.35 };
export const PLATFORM = { x: 2.5, z: 0, w: 11.6, h: 0.16, d: 3.9, bushX: 2.1, bushH: 4.4 };
export const RIVER = { y: -7, half: 20 };
export const BEAM = { y: 0.75, z: -0.95, speed: 55, reach: 46 };
// moon: the bible's MOON vector (-0.62, 0.52, -0.58) as sky angles (az = atan2(x, -z), el = asin(y))
export const MOON = { dir: [-0.62, 0.52, -0.58], az: Math.atan2(-0.62, 0.58), el: Math.asin(0.52 / Math.hypot(-0.62, 0.52, -0.58)), r: 0.04 };
export const GLOW_AZ = 0.55; // the city-glow core, centre-right
// lamps [x, z, height]; the first is Kuroko's post (h 4.2)
export const LAMPS = [[7, 2.9, 4.2], [-16, 2.9, 3], [-9, -2.9, 3], [-3, 2.9, 3], [14, -2.9, 3], [21, 2.9, 3], [27, -2.9, 3]];
export const KUROKO_LAMP = LAMPS[0];
