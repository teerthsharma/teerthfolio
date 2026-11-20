/* global console, process */
// node lib/world/cutscene/deadline.check.mjs: the deadline laws the cutscene prewarm orders its queue by (ARCHITECTURE-PLAN 3.1). Exit 0 when every law holds.
import { MOTION } from "../motion.js";
import { PLACES } from "../places.js";
import { APPROACH, CRITICAL_S, DROP_S, HORIZON_S, SPAWN_CRITICAL_S, V_FAST, deadlineS } from "./deadline.js";
import { ENGINE_LIVE } from "../../anime/live.js";
import { cardFor } from "./cards/index.js";

const fails = [];
let laws = 0;
const law = (name, ok, detail = "") => {
  laws += 1;
  if (!ok) fails.push(`${name}${detail === "" ? "" : ` (${detail})`}`);
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

law("V_FAST is the quickest arrival: maxSpeed times boost (15 m/s)", near(V_FAST, MOTION.maxSpeed * MOTION.boost), String(V_FAST));
law("APPROACH is the 7 m arrival ring of Controller.jsx", APPROACH === 7);
law("horizons are ordered: critical before ready, horizon after ready, drop last", CRITICAL_S < HORIZON_S && HORIZON_S < DROP_S && CRITICAL_S < SPAWN_CRITICAL_S);

const home = { x: 0, z: -8, radius: 9 };
const spawn = { x: 0, z: 9 };
law("the spawn sits 0.1 m outside home's arrival ring (0.007 s)", near(deadlineS(spawn, home), 0.1 / V_FAST, 1e-9), String(deadlineS(spawn, home)));
law("inside the arrival ring the deadline is 0", deadlineS({ x: 0, z: -8 }, home) === 0);
law("the deadline is never negative", PLACES.every((p) => deadlineS({ x: 0, z: 0 }, p) >= 0));

const ringEdgeZ = -8 + home.radius + APPROACH + MOTION.sealRadius;
const at = (metres) => ({ x: 0, z: ringEdgeZ + metres });
law("8 s of walking is 120 m beyond the ring", near(deadlineS(at(120), home), 8, 1e-9), String(deadlineS(at(120), home)));
law("the deadline grows by 1 s per 15 m", near(deadlineS(at(30), home) - deadlineS(at(15), home), 1, 1e-9));
law("the ring edge itself is 0 s", near(deadlineS(at(0), home), 0, 1e-9));
law("every dock has a finite deadline from the spawn", PLACES.every((p) => Number.isFinite(deadlineS(spawn, p))));

const preReady = PLACES.filter((p) => !ENGINE_LIVE.has(p.id) && !cardFor(p.id)?.plays && deadlineS(spawn, p) <= CRITICAL_S).map((p) => p.id).join();
law("exactly one non-engine dock is critical from the spawn", preReady === "p-resolvent", preReady);

if (fails.length) {
  console.log(`deadline.check: FAIL ${fails.length} of ${laws} laws\n  ${fails.join("\n  ")}`);
  process.exit(1);
}
console.log(`deadline.check: ok (${laws} laws)`);
