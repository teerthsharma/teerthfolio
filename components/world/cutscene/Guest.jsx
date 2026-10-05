"use client";

// THE GUEST (Band 1000): the ink silhouette for a card whose speaker is the landform (lib/world/cutscene/guests.js).
import { GUESTS } from "../../../lib/world/cutscene/guests";
import { Figure } from "./Speaker";

export default function Guest(cut) {
  const sp = GUESTS[cut.card.id];
  return sp && cut.mode === "full" ? <Figure {...cut} sp={sp} index={0} follow /> : null;
}
