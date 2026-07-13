export const SEAL_GUIDE_STATES = Object.freeze(["idle", "probing", "moving", "docking", "error"]);

export function deriveSealGuideState({
  approachingStation = false,
  bridgeActive = false,
  hasRenderError = false,
  moving = false,
  rendererMode = "gated",
  stationDistance = Number.POSITIVE_INFINITY,
} = {}) {
  if (hasRenderError || rendererMode === "fallback") return "error";
  if (bridgeActive || rendererMode === "probe") return "probing";
  if (moving && approachingStation && stationDistance <= 3.8) return "docking";
  if (moving) return "moving";
  return "idle";
}
