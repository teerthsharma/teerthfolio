// FX layer for the-loop: the demon circle stack, the aura column with its specks, the shard sphere, the debris and the sparks, the B1 plate.
// Layer 1: solids and overlays. Every material is built here; nothing links during playback.
import { Group } from "three";
import { buildCircles } from "./circles.js";
import { buildColumn } from "./column.js";
import { buildPlate } from "./plate.js";
import { buildShards } from "./shards.js";

export default function build(ctx) {
  const group = new Group(), circles = buildCircles(ctx), column = buildColumn(ctx), shards = buildShards(ctx), plate = buildPlate(ctx);
  group.name = "the-loop-fx";
  group.add(circles.group, column.group, shards.group, plate.group);
  return {
    group,
    update(t, dt, cue) {
      circles.update(t, cue);
      column.update(t, cue);
      shards.update(t, cue);
      plate.update(t, cue);
    },
    dispose() {
      circles.dispose();
      column.dispose();
      shards.dispose();
      plate.dispose();
    },
  };
}
