// Checks the clock's anchors (real to picture time, pass timing) and prints ok.
import { passReal, unwarp, warp } from "./clock.js";

const checks = [
  Math.abs(warp(18.6) - 9.2) < 1e-6,
  Math.abs(unwarp(10.3) - 20.8) < 0.02,
  Math.abs(passReal(8) - 14.62) < 0.02,
  Math.abs(warp(25.8) - 13.2) < 1e-6,
];
if (checks.includes(false)) throw new Error(`clock anchors failed: ${checks.join(" ")}`);
console.log("ok clock");
