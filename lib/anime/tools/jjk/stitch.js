// Named stitch beats. Reusable. Aether slots call these; other docks may too.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "stitch", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const STITCH = [
  D("jjkStitchFlood", "beat 0: eye + patches + space — 3s Unlimited Void still",
    /* glsl */ `vec3 jjkStitchFlood(vec2 p, float t) { return jjkStitch(p, t, 0.0); }`),
  D("jjkStitchDomain", "beat 1: flood + hero + Infinity halt",
    /* glsl */ `vec3 jjkStitchDomain(vec2 p, float t) { return jjkStitch(p, t, 1.0); }`),
  D("jjkStitchKill", "beat 2: domain + Hollow Purple left of the pear",
    /* glsl */ `vec3 jjkStitchKill(vec2 p, float t) { return jjkStitch(p, t, 2.0); }`),
  D("jjkBeatClock", "hold(t) picks flood / domain / kill via kit jjkStitchTimed",
    /* glsl */ `vec3 jjkBeatClock(vec2 p, float t) { return jjkStitchTimed(p, t); }`),
];

if (STITCH.length !== 4) throw new Error(`jjk stitch count ${STITCH.length} != 4`);
