// Compose: shader kit → poly silhouette → graphic pass → stash blend → luma 0.92.
// Data only. Engine still compiles once in build(ctx). Time stays floor(t*fps)/fps.

import { composeStashes, lumaCap, inkLift, emitGate, STASH, LUMA_MAX } from "./protocol.js";
import { PASSES, PASS_BY_ID, HOUSE_STACK, passesFor } from "./graphic-passes.js";

export const PIPE = Object.freeze(["shader", "poly", "graphic", "stash", "luma"]);

export function stackGraphic(opts = {}) {
  const shaders = Object.freeze([...(opts.shaders ?? [])]);
  const poly = Object.freeze([...(opts.poly ?? [])]);
  const graphics = passesFor(opts.graphics ?? HOUSE_STACK);
  const stashes = composeStashes(opts.stashes);
  return Object.freeze({
    pipe: PIPE,
    shaders,
    poly,
    graphics,
    stashes,
    fps: opts.fps ?? 12,
    luma: LUMA_MAX,
    emit: opts.emit ?? 0,
  });
}

export function holdTime(t, fps = 12) {
  const f = Math.max(1, fps);
  return Math.floor(Number(t) * f + 1e-5) / f;
}

export function applyGraphic(rgb, passId, cov = 1) {
  const p = PASS_BY_ID[passId];
  if (!p) throw new Error(`graphic pass not found: ${passId}`);
  const src = inkLift(rgb);
  const k = Math.max(0, Math.min(1, cov));
  if (p.blend === "multiply") {
    return lumaCap([src[0] * (1 - k) + src[0] * src[0] * k, src[1] * (1 - k) + src[1] * src[1] * k, src[2] * (1 - k) + src[2] * src[2] * k]);
  }
  if (p.blend === "screen") {
    return lumaCap([
      src[0] + (1 - src[0]) * src[0] * k,
      src[1] + (1 - src[1]) * src[1] * k,
      src[2] + (1 - src[2]) * src[2] * k,
    ]);
  }
  if (p.blend === "add-clamped") {
    return emitGate(src, [0.18, 0.14, 0.08], k);
  }
  return lumaCap(src);
}

export function orderByStash(ids) {
  const rank = Object.fromEntries(Object.values(STASH).map((s) => [s.id, s.order]));
  return [...ids].sort((a, b) => (rank[PASS_BY_ID[a]?.stash] ?? 99) - (rank[PASS_BY_ID[b]?.stash] ?? 99));
}

export { PASSES, HOUSE_STACK, passesFor };
