// A trip picked from the Projects list: the seal is immune to every dock's
// arrival on the way, and only the chosen project's cutscene plays at the end.
// live.travelTo is that project's id; null means normal play.

// Which arrival may start this frame. Normal play: the proximity one. On a
// trip: nothing until the target is in reach, then the target's scene.
export const gateApproach = (travelTo, approach, targetInReach, playsAs) => (travelTo ? (targetInReach ? playsAs(travelTo) : null) : approach);

// Fresh key, stick or tap: the visitor takes the wheel.
export function cancelTravel(live) {
  live.travelTo = null;
  live.target = null;
  live.pendingOpen = null;
}
