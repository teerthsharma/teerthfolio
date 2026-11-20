// The topological shader's CPU half (docs/topological-shader/README.md, "One frame"): the seal's route heat, the latch, the governor,
// the critical cells, and the 43 x 49 harness texture T_h that the chunk in uber.glsl.js reads. Built only by TopoDriver and the lab,
// never on the default path. Mode "neutral" forces every cell LIVE (I2); "on" lets the latch run. kappa and Lambda are reserved zeros
// (T1 killed the route plates), so uA stays 0 and the alive multiply is the identity in both. Mode "on" may load the baked route plates
// (loadPlates): the latch then reads C' = min(c, e) and the plate pick is published as data; with no load call it is the plain latch.
import { DataTexture, NearestFilter, RGBAFormat, UnsignedByteType, Vector2 } from "three";
import { makeHexGrid } from "../../../lib/world/heat/hexgrid.js";
import { makeHeat } from "../../../lib/world/heat/heatfield.js";
import { makeLatch } from "../../../lib/world/heat/latch.js";
import { makeGovernor } from "../../../lib/world/heat/governor.js";
import { makeCritical } from "../../../lib/world/heat/critical.js";
import { makeRouteWeights } from "../../../lib/world/heat/route-weights.js";
import { packTh, TH_COLS, TH_ROWS } from "../../../lib/world/heat/harness.js";
import { loadRoutePlates } from "./plates.js";
import { topoChunk } from "./uber.glsl.js";

const R = 84;
const H = 4;
const TICK_S = 0.1; // heat deposit and latch step at 10 Hz: C only changes there, so the frame loop does no field work between ticks
const CRIT_S = 1; // critical cells at 1 Hz
const TQ_FPS = 12; // stepped time t_q for the dither: anime on twos

export function gridOrigin(g, h = H) {
  const s = (h * Math.sqrt(3)) / 2;
  const minZ = Math.min(...g.zs);
  let minI = Infinity;
  for (let c = 0; c < g.n; c++) {
    const row = Math.round((g.zs[c] - minZ) / s);
    minI = Math.min(minI, Math.round((g.xs[c] - (row % 2) * h * 0.5) / h));
  }
  return [minI * h, minZ];
}

export function createTopo(mode) {
  const grid = makeHexGrid(R, H);
  const n = grid.n;
  const heat = makeHeat(grid);
  const latch = makeLatch(n);
  const gov = makeGovernor();
  const crit = makeCritical(grid);
  const th = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const tex = new DataTexture(th, TH_COLS, TH_ROWS, RGBAFormat, UnsignedByteType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const [ox, oz] = gridOrigin(grid);
  const uniforms = {
    uTh: { value: tex },
    uGridOrigin: { value: new Vector2(ox, oz) },
    uCell: { value: new Vector2(H, (H * Math.sqrt(3)) / 2) },
    uA: { value: 0 },
    uTq: { value: 0 },
    uOmega0: { value: 1 },
  };
  const live = mode === "on";
  const zero = new Uint8Array(n);
  let cType = new Uint8Array(n);
  let cMult = new Uint8Array(n);
  let last = null;
  let acc = 0;
  let lastU = 0;
  let lastCrit = -Infinity;
  let wantPlates = false; // loadPlates was asked: LIVE until the plates are in, and for good if they fail
  let rw = null;
  let samples = 0;
  const topo = {
    grid,
    tex,
    th,
    uniforms,
    plug: { chunk: topoChunk, uniforms, pick: () => (rw && rw.latched.includes(1) ? rw.pick() : [-1, -1]) }, // [-1, -1] until some plate latches (gate, cold start, load failure)
    C: heat.hn,
    u: 0,
    step(x, z, t, frameMs) {
      const dt = last === null ? 0 : t - last;
      last = t;
      topo.u = gov.update(frameMs, t);
      acc += dt;
      uniforms.uTq.value = Math.floor(t * TQ_FPS) / TQ_FPS;
      const tick = acc >= TICK_S;
      if (tick) {
        heat.tick(x, z, acc);
        acc = 0;
        if (rw) rw.observe(heat.hn, heat.hn, t, samples++);
      }
      if (!tick && topo.u === lastU) return;
      lastU = topo.u;
      const run = live && (!wantPlates || rw);
      if (run) latch.step(rw ? rw.C : heat.hn, topo.u);
      if (t - lastCrit >= CRIT_S) {
        const c = crit.classify(heat.hn);
        cType = c.type;
        cMult = c.mult;
        lastCrit = t;
      }
      packTh(th, run ? latch.type : zero, cType, cMult, heat.hn, null, null, grid);
      tex.needsUpdate = true;
    },
    async loadPlates(loader = loadRoutePlates) {
      if (!live) return null;
      wantPlates = true;
      const plates = await loader();
      try {
        rw = plates ? makeRouteWeights(plates, grid) : null;
      } catch {
        rw = null;
      }
      samples = 0;
      return rw ? plates : null;
    },
  };
  return topo;
}
