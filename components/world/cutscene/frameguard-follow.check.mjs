/* global console, process */
// node components/world/cutscene/frameguard-follow.check.mjs: the island follow casts 2 foreground rays a frame and probes every 2nd frame; the cutscene keeps 6 rays and one probe a frame. Exit 0 when every check holds.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "FrameGuard.jsx"), "utf8");
const fails = [];
const has = (name, re) => {
  if (!re.test(src)) fails.push(name);
};

has("FOLLOW_GRID_RAYS is a named tuning constant with the value 2", /^const FOLLOW_GRID_RAYS = 2;/m);
has("FOLLOW_PROBE_EVERY is a named tuning constant with the value 2", /^const FOLLOW_PROBE_EVERY = 2;/m);
has("the grid casts follow ? FOLLOW_GRID_RAYS : 6 rays (the cutscene keeps 6)", /const rays = follow \? FOLLOW_GRID_RAYS : 6;/);
has("the grid loop is bounded by rays", /for \(let j = 0; j < rays; j\+\+\)/);
has("the grid index advances by the rays actually cast", /\(s\.frame \* rays \+ j\) % GRID\.length/);
has("the occlusion probe runs every frame in a cutscene and every FOLLOW_PROBE_EVERY frames on the follow", /\(!follow \|\| s\.frame % FOLLOW_PROBE_EVERY === 0\)/);
has("the probe rotation k = s.frame % 5 is kept", /const k = s\.frame % 5;/);

if (fails.length) {
  console.log(`frameguard-follow.check: FAIL ${fails.length} of 7 checks\n  ${fails.join("\n  ")}`);
  process.exit(1);
}
console.log("frameguard-follow.check: OK 7 of 7 checks");
