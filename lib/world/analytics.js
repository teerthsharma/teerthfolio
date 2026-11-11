import { getUi, live, subscribe } from "./store";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function track(name, params) {
  if (GA_ID && typeof window !== "undefined" && window.gtag) window.gtag("event", name, params);
}

// One store subscriber turns ui transitions into GA4 events, so nothing in the scene knows about analytics.
export function watchWorld() {
  if (!GA_ID) return undefined;
  let prev = getUi();
  let cutAt = 0;
  const visited = new Set();
  return subscribe(() => {
    const ui = getUi();
    if (ui.ready && !prev.ready) track("world_ready", { tier: ui.tier });
    if (ui.started && !prev.started) track("island_start");
    if (ui.failed && !prev.failed) track("webgl_failed");
    if (ui.list && !prev.list) track("project_list_open");
    if (ui.near && !visited.has(ui.near)) {
      visited.add(ui.near);
      track("place_visit", { place_id: ui.near, order: visited.size });
    }
    if (ui.open && ui.open !== prev.open) track("place_open", { place_id: ui.open });
    if (prev.cutscene && ui.cutscene !== prev.cutscene) {
      track("cutscene_end", {
        place_id: prev.cutscene,
        how: live.arrival.ended ?? "skip",
        seconds: Math.round((performance.now() - cutAt) / 1000),
      });
    }
    if (ui.cutscene && ui.cutscene !== prev.cutscene) {
      cutAt = performance.now();
      track("cutscene_start", { place_id: ui.cutscene });
    }
    prev = ui;
  });
}
