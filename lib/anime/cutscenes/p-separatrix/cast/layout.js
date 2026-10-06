// Stage marks in the seal's HOME frame (x right, y up, z forward, metres before the seal scale). The seal faces +z, toward Diavolo.
// Stage around the camera law (L3): everything stands off the seal's axis so no lens ray from wide/arc/kill passes through a body to the chest;
// the cast also runs an occlusion guard per frame (util.occludes) for the home shot, which looks from behind.
export const MARK = {
  diavolo: [0.7, 0, 4.2],          // takes his mark 1.3-3.0
  diavoloFrom: [4.2, 0, 8.6],      // walks in from the Colosseum break
  kc: [0.9, 0, 5.7],               // King Crimson behind Diavolo
  ger: [-1.5, 0, 0.7],             // Gold Experience Requiem beside the seal (never between lens and seal)
  gerStep: [-1.5, 0, 1.6],         // steps forward 7.4-8.0
  gerLunge: [-1.1, 0, 2.5],        // barrage lunge
  slit: [-1.5, 0, 0.7],            // the arrow's slit = GER's own spot
  landing: [0, 0, 6.6],            // Diavolo lands here after the launch, then slides in x
  polnareff: [-3.9, 0, 2.7], mista: [4.0, 0, 1.8], trish: [3.1, 0, -1.7],
  bucciarati: [-4.4, 0, -0.9], abbacchio: [-2.4, 0, -3.1], fugo: [4.7, 0, 0.1], narancia: [-3.3, 0, 4.7], risotto: [4.5, 0, 4.3],
};
// the bible's clock (s): used when the direction layer defines no beat of that name (T(cue, name, abs))
export const CLK = {
  dress: [0.5, 1.0], enter: 1.3, snarl: 3.0, kcRise: [3.0, 3.7], erase: [3.7, 5.3], coin: 4.2, arrow: [5.15, 5.8], pierce: 5.8,
  gerRise: [6.05, 6.7], move: 6.0, back: 6.7, gild: 6.45, gerStep: [7.4, 8.0], rewind: 8.0, kcSink: [8.1, 8.9], coinBack: [8.2, 9.3], coinHalves: [9.3, 10.2],
  barrage: [10.35, 11.85], lastBlow: 11.85, launch: [11.85, 12.4], pose: 12.1, claim: 12.3, slide: [12.1, 15.4], home: 15.4, collapse: [16.6, 17.0],
};
