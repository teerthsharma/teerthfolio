/**
 * What is left before the first frame, and why it is not bucketing.
 *
 * With the biome programs moved off this path, the first world draw lands at
 * 1.5-1.8s and the first blocking shader link is not until 2.3s — so the
 * remaining time is not shader compilation at all. The long-task record of a
 * cold visit shows it plainly: 70ms at 151ms, 81ms at 251ms, 456ms at 381ms,
 * 76ms at 977ms, 82ms at 1172ms, 213ms at 1256ms, and then 1,126ms at 1,469ms.
 * That last one dominates, and it is React mounting the scene graph and
 * constructing the hero bucket's geometry and materials.
 *
 * No single subsystem accounts for it. Removing the environment probe, the
 * observatory or the mascot moves first draw by less than the run-to-run spread,
 * which is about 280ms on single runs — no-env measured 32ms slower than
 * baseline and no-dome 160ms slower, both of which are noise rather than
 * results. Anything aimed at this needs paired runs the way probe-gpu-time does,
 * and a target worth that harness.
 *
 * Splitting the hero bucket further would not help either: what it builds is the
 * igloo, the character and the ground the visitor sees, and deferring any of
 * those defers the first viewport itself.
 *
 * What the visitor actually waits, measured by screenshotting a fresh browser
 * profile — an empty GPU program cache, the first-time visitor's path — and
 * looking at the frame rather than trusting a statistic about it:
 *
 *   cold, fully composed        2,510ms from navigation, 1,041ms after the click
 *   warm, renderer reports gl                              716ms after the click
 *
 * Composed means the authored world: full dome masonry, the tunnel, terrain
 * drift, the mountain range, the aurora, the mascot and the HUD.
 *
 * Two instruments were wrong here before these numbers were right, and both
 * failures look like results rather than errors. A colour heuristic over the
 * lower band cannot tell the world from the loading state: the entry splash is a
 * teal wireframe dome over a warm gradient, which reads cool and bright in
 * exactly the way snow does, and it reported the world composed at 1,578ms when
 * a screenshot of that moment is unambiguously the splash. And polling the page
 * every 50ms across the process boundary to catch the transition added about six
 * and a half seconds to the thing it was timing — 9,289ms after the click
 * polled, 2,746ms on the same build unpolled — because the main thread it
 * interrupts is the one linking shaders. Take one passive capture at a fixed
 * time and look at it.
 */

/**
 * Staged scene admission.
 *
 * Measured cause: a cold visit links 76 GPU programs, and because the whole
 * scene graph mounts in one React commit, every one of those links is resolved
 * inside the first rendered frame. The driver blocks the main thread for the
 * whole batch — 11.4s of getProgramParameter on a warm desktop GPU, which is
 * the entire ~10s gap between "enter the world" and the first world frame.
 * Warm visits cost 1.3s because Chrome's program cache already holds them, so
 * the stall lands only on first-time visitors, which is exactly who it must not
 * land on.
 *
 * The fix is not fewer programs (that is a separate, slower piece of work) but
 * admitting them in buckets: the first frame carries only what the hero read
 * needs, and each later bucket is admitted after the previous one has actually
 * been presented. Total link cost is unchanged; it is spread across frames the
 * viewer is already watching a composed scene through.
 *
 * Ordering is by what the first viewport must contain, not by cost.
 */
export const RENDER_BUCKETS = Object.freeze({
  /** Ground, hero building, character, camera, and the grade over them. */
  hero: 0,
  /** Everything that dresses the ground the hero stands on. */
  field: 1,
  /** Per-station machinery, sky topology, and semantic particles. */
  systems: 2,
  /** Effects and warm-compile primers with no first-viewport role. */
  finish: 3,
});

export const RENDER_BUCKET_ORDER = Object.freeze([
  "hero",
  "field",
  "systems",
  "finish",
]);

export const RENDER_BUCKET_MAX = RENDER_BUCKET_ORDER.length - 1;

/**
 * Presented frames between one bucket and the next. One frame is enough to
 * guarantee the previous bucket reached the screen; two leaves slack for the
 * frame in which its own links resolve, so a bucket cannot stack its stall on
 * top of the stall before it.
 */
export const RENDER_BUCKET_FRAME_GAP = 2;

/**
 * Bucketing needs a continuous frame loop to advance. Under reduced motion or
 * safe mode the canvas runs on demand, where frames only happen on invalidate,
 * so staging would strand later buckets unmounted forever. Those paths admit
 * the whole scene at once: they are also the paths with the least to draw.
 */
export function shouldStageRenderBuckets({ reducedMotion, renderEnabled, worldActive }) {
  return Boolean(worldActive && renderEnabled && !reducedMotion);
}
