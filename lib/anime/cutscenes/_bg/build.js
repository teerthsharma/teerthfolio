// BUILD for _bg: one world layer per gallery frame, made of the kit (lib/anime/kit/bg) and nothing else, except throne, which repaints the
// real Nazarick hall by import (lab only) to show bg.paintOver on geometry the kit did not make.
import { Group } from "three";
import { composeLayers } from "../framework.js";
import { bg } from "../../kit/bg/index.js";
import { FRAME, GAL } from "./gallery.js";
import { WORLDS } from "./worlds.js";

const KIND = FRAME.world ?? GAL;
const throneWorld = KIND === "throne" || KIND === "throneLow" ? (await import("../pr-topograph-432/world/index.js")).default : null;

function world(ctx) {
  const group = new Group(), parts = [];
  const w = WORLDS[KIND](ctx, group, { bg, throneWorld, parts });
  return {
    group,
    update(t, dt, cue) { for (const p of parts) p.update?.(t, dt, cue); w?.update?.(t, dt, cue); },
    dispose() { for (const p of parts) p.dispose?.(); w?.dispose?.(); },
  };
}

export default function build(ctx) { return composeLayers(ctx, { world }); }
