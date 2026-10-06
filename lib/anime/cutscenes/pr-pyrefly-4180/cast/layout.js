// CAST layout + timeline for pr-pyrefly-4180. Pure data and tiny maths, no engine imports.
// All positions are STAGE-LOCAL: origin at the hero seal's start, +z = the seal's front, +x = its left, y up, metres at seal scale 1.
// (The stage group is placed at seal.at, turned by seal.yaw and scaled by seal.scale, so every size here is in seal heights.)
// The foe stands BEHIND the seal (-z): the law's arc camera sits at the seal's front-left (az +0.785) and looks through the hero at Kurama.
export const LAYOUT = {
  kurama: { at: [-3.4, 0, -10.5], size: 5.5 }, // shoulder height 5.5 m (bible 11 m, halved to the 0.8 m hero); faces the hero
  kunai: [[-6.2, 0, -7.6], [-0.8, 0, -7.3], [-3.4, 0, -13.8]], // the three Flying Thunder God marks round the fox: left paw, right paw, behind the tails
  hand: [0.27, 0.3, 0.25], // the hero's right flipper grip, seal-local
  branch: { a: [-3.0, 0.95, -0.8], b: [-5.4, 1.15, -2.8] }, // the masked shinobi's perch
  kushina: [1.6, 0, -3.4],
};
export const sm = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
// bump: 0 before 0, eases up over `up`, holds `hold`, eases down over `down`
export const bump = (x, up, hold, down) => (x <= 0 ? 0 : x < up ? sm(x / up) : x < up + hold ? 1 : x < up + hold + down ? 1 - sm((x - up - hold) / down) : 0);
// frame-locked pseudo-noise from the STEPPED clock: the same value on every redraw of a step, so scrubbing equals playing
export const jit = (t, a, f) => a * Math.sin(t * f) * Math.cos(t * f * 1.7 + 0.6);

// beat times: the scene's beat when it exists (cue names below), else the bible's time
export function timeline(scene) {
  const L = (n) => (scene.beats ?? []).filter((b) => b.name === n).sort((a, b) => a.t - b.t);
  const bt = (n, d, i = 0) => L(n)[i]?.t ?? d, bd = (n, d, i = 0) => L(n)[i]?.dur ?? d;
  return {
    mask: bt("mask", 1.2), // the tiny orange spiral mask pops on the branch
    roar: bt("roar", 2.6), roarDur: bd("roar", 1.3), // Kurama roars (shot 3, bubble 2.3 s)
    orb: bt("orb", 4.0), orbDur: bd("orb", 2.6), // the dark orb gathers
    throw: [0, 1, 2].map((i) => bt("throw", [6.2, 6.45, 6.7][i], i)), // three kunai, 8 frames each in the air
    flash: [0, 1, 2].map((i) => bt("flash", [7.25, 7.5, 7.75][i], i)), // Flying Thunder God, the hero at each kunai (3 frames on ones)
    trigram: bt("trigram", 7.9), // the Eight Trigrams seal on Kurama's belly
    chain: bt("chain", 7.92), // 208 links begin; Kurama flinches frames 0-8
    hoop: bt("hoop", 8.4), // link 100
    surge: bt("surge", 8.92), surgeDur: bd("surge", 1.5), // coral surge links 101-208
    burst: bt("burst", 10.45), // the surge bursts at the pin
    pin: bt("pin", 11.3), // the second brass pin; Kurama pinned frames 0-6
    cheer: bt("cheer", 9.0), // the shinobi cheer once chained
    dattebane: bt("dattebane", 14.3), // Kushina
    lower: bt("lower", 23.2), // the stage is lowered through the floor
  };
}
