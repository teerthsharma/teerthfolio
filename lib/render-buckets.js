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
