// THE FRIEND: the orange-cream cat-pup beside the pale one on the island (live-sheet frames 21 to 24). The same site builder, tinted and small.
import { sitePup } from "./pup.js";

export function buildFriend() {
  const pup = sitePup({ yaw: 0.5, scale: 0.62, tint: [1.0, 0.87, 0.69], track: { blink: [6.1] } });
  pup.group.position.set(-0.95, 0, 0.35);
  return { group: pup.group, update: (t) => pup.update(t), dispose: () => pup.dispose() };
}
