// Aether-Lang: THE DOMAIN EXPANSION (approved; the reference move). The pup
// raises a flipper in the hand sign and the domain opens: a sphere of deep
// night with stars and a soft white-violet core blooms out of it and swallows
// the view, the tall ink silhouette (spiky upswept hair, a blindfold band,
// hands in pockets, no face) steps in beside it and speaks both lines of the
// koan, leaning in on the second, then the domain collapses back into the
// island. Shape, colour and pose only. Card: lib/world/cutscene/cards/p-aether-lang.js.

import { Speaker, Stage, signAt, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";

export default function AetherDomain(cut) {
  useCutFrame((t) => {
    if (cut.mode === "full") live.pose.sign = signAt(cut.tl, t);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
    </>
  );
}
