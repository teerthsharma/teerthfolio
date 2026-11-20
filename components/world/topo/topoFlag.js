const MODES = ["off", "neutral", "on"];

export function topoMode() {
  if (typeof window === "undefined") return "off";
  const v = new URLSearchParams(window.location.search).get("topo");
  return MODES.includes(v) ? v : "off";
}
