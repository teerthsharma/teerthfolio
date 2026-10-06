// p-nerve FX: world anchors (metres) from the bible, and the default event times (seconds) at 24 fps frames.
// Direction may override any anchor via scene.fx = { bell:[x,y,z], gaugeZ, ... } and any time by emitting the beat of that name.
export function anchors(scene) {
  const o = scene.fx || {};
  return {
    keyAt: o.keyAt || [4.7, 5.9, -0.7], keyAim: o.keyAim || [-0.5, 0.5, -1.6], keyHalf: o.keyHalf ?? 27, // look.js KEY_AT / KEY_AIM, half-angle deg
    bell: o.bell || [-7.0, 7.15, -9.0],            // tower.js bell at y 7.15; xz belongs to the world layer
    gaugeX: o.gaugeX || [-2.2, -1.3, -0.4, 0.5], gaugeZ: o.gaugeZ ?? -1.3, gaugeH: o.gaugeH ?? 2.6, // roof.js GAUGE
    realm: o.realm || [8.5, 21.5, -104],          // REALM_AT
    ryukMouth: o.ryukMouth || [1.55, 2.55, -1.57],
    chainCross: o.chainCross || [-1.8, 0.45, -1.1], // between L (-3.55,-0.24,-2.2) and the seal
    deckX: o.deckX || [-8, 8], deckZ: o.deckZ || [-2.2, 6],
  };
}

// Beat names this layer reads (all free cues; direction emits them, defaults below play without them).
// [t, dur] pairs.
export const DEFAULTS = {
  rain: [[1.3, 1]],                       // rain starts f31
  realm: [[4.4, 3.0]],                    // shot 2: the realm gap opens (3.0 to 4.6 scene) and closes
  kukuku: [[4.9, 1.0]],                   // apple taken
  bead: [[8.6, 0.55], [9.0, 0.55], [9.4, 0.55], [9.8, 0.55]], // four strokes, four beads (shot 3)
  scritch: [[8.45, 0.6], [8.85, 0.6], [9.25, 0.6], [9.65, 0.6]],
  shing: [[11.3, 0.3]],                   // shot 4, f271
  toll: [[12.4, 1.2], [13.6, 1.2], [14.8, 1.2]], // shot 5, DONG x3
  flare: [[18.1, 2.0]],                   // shot 6, the fourth bead
  rip: [[21.4, 0.9]],                     // shot 7, the chip bag torn
  pageGlint: [[22.7, 0.8]],               // shot 7, page to lens
  chain: [[6.5, 0.6]],                    // the amber witness ring at the crossing
  crack: [[24.4, 0.6]],                   // shot 8, web grows
  crunch: [[25.0, 0.7]],                  // chip eaten, the pocket breaks
  shatter: [[25.0, 5.5]],                 // flat shards fall (shots 8 to 9)
};
