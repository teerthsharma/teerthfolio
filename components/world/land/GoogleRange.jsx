"use client";

// THE GOOGLE RANGE: the two peaks east of Mount MujoRush, across the valley
// (lib/world/terrain.js shapes the rock and the pass through it; this file
// draws what stands on it — everything else lives in lib/world/land.js's
// "google-range" colliders).
//
//   - HIGHWAY PASS (google/highway #3244): the saddle between the range's
//     two peaks. Its story — pruning by slice structure — hangs across the
//     pass mouth as a row of floating boulders (monuments/Prune.jsx, the
//     draft absorbed here). The anomaly IS the story: place.radiation's own
//     light holds every boulder up on a glowing keel; nothing here falls.
//   - XNNPACK PEAK (google/XNNPACK #10801): the cave at its mountain's foot
//     is the reused leading gap (monuments/Arena.jsx). Its anomaly: cube
//     snow lifting out of the cave, in the peak's own radiation colour.
//
// Both stand straight on the snow, no plinth, at their place's own reading
// point; both quicken while the seal is there (near).

import { PLACES } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import Arena from "../monuments/Arena";
import Prune from "../monuments/Prune";

const HIGHWAY = PLACES.find((p) => p.id === "pr-highway-3244");
const XNNPACK = PLACES.find((p) => p.id === "pr-xnnpack-10801");

// The flat notch between the two peaks (lib/world/terrain.js's PASS: mouth
// at z = -66, centred on x = 38) — where the boulder row hangs.
const PASS_MOUTH = [38, -66];

export default function GoogleRange() {
  const near = useUi((s) => s.near);
  return (
    <>
      {HIGHWAY && (
        // Prune only reads `origin` for heightAt lookups; it does not place
        // itself, so the group below is what actually puts the row at the
        // pass mouth.
        <group position={[PASS_MOUTH[0], 0, PASS_MOUTH[1]]}>
          <Prune place={HIGHWAY} origin={PASS_MOUTH} />
        </group>
      )}
      {XNNPACK && (
        <group position={[XNNPACK.x, 0, XNNPACK.z]}>
          <Arena place={XNNPACK} near={near === XNNPACK.id} />
        </group>
      )}
    </>
  );
}
