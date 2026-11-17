// node lib/anime/kit/hero/moves.check.mjs : every entrance move is finite, never sinks through the ground, and ends neutral.
// Silent when it passes; an assertion names the move and the channel when it does not.
import assert from "node:assert";
import { HERO_MOVES, moveChannels } from "./moves.js";
import { REST_ARM, groundLift } from "./motion.js";

const near = (a, b, e = 1e-6) => Math.abs(a - b) < e, turn = (a) => Math.abs(a - 2 * Math.PI * Math.round(a / (2 * Math.PI)));
for (const name of Object.keys(HERO_MOVES)) {
  for (let i = 0; i <= 200; i++) {
    const c = moveChannels(name, i / 200);
    for (const v of [c.x, c.y, c.z, c.rx, c.ry, c.rz, c.yaw, c.sy, c.sxz, c.sx, c.sz, c.head.rx, c.tail.rx, c.armR.sx, c.wristL.rz]) assert(Number.isFinite(v), `${name} u=${i / 200}`);
    assert(c.y - groundLift(c) > -1e-9, `${name} sinks at u=${i / 200}`);
  }
  const e = moveChannels(name, 1);
  for (const k of ["x", "y", "z", "smear", "blink", "whisker"]) assert(near(e[k], 0), `${name} ends with ${k} ${e[k]}`);
  for (const k of ["rx", "ry", "rz", "yaw"]) assert(turn(e[k]) < 1e-6, `${name} ends turned ${k} ${e[k]}`);
  for (const k of ["sy", "sxz", "sx", "sz"]) assert(near(e[k], 1), `${name} ends squashed ${k} ${e[k]}`);
  for (const k in REST_ARM) assert(near(e.armR[k], REST_ARM[k]) && near(e.armL[k], REST_ARM[k]), `${name} ends with an arm off rest`);
}
assert(near(groundLift({}), 0));
