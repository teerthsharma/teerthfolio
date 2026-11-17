import { PACKET_SHADERS as MONODROMY_PACKET } from "./p-monodromy/packet.js";
import { CUTS_A, CUTS_A_COUNT, CUTS_A_DOCKS } from "./indexA.js";
import { CUTS_D, CUTS_D_COUNT, CUTS_D_DOCKS } from "./indexD.js";
import { cutKit } from "./kit.glsl.js";
import { jjkKit } from "../jjk/kit.glsl.js";
import aotShaders from "./pr-mujoco-3396/index.js";

export { cutKit } from "./kit.glsl.js";
export { CUTS_A, CUTS_A_COUNT, CUTS_A_DOCKS } from "./indexA.js";
export { CUTS_D, CUTS_D_COUNT, CUTS_D_DOCKS } from "./indexD.js";

const KITS = { cutKit, jjkKit };

export function cutGlslFor(mod) {
  const seen = new Set();
  const out = [];
  for (const d of mod.deps ?? ["cutKit"]) {
    if (seen.has(d)) continue;
    seen.add(d);
    const kit = KITS[d];
    if (kit) out.push(kit.glsl);
  }
  out.push(mod.glsl);
  return out.join("\n");
}

export const CUTS = [...CUTS_A, ...CUTS_D];
export const CUTS_COUNT = CUTS_A_COUNT + CUTS_D_COUNT;
export const CUTS_DOCKS = [...CUTS_A_DOCKS, ...CUTS_D_DOCKS];

if (CUTS.length !== CUTS_COUNT) {
  throw new Error(`cuts: expected ${CUTS_COUNT}, got ${CUTS.length}`);
}

CUTS.push(...aotShaders);
CUTS_DOCKS.push("pr-mujoco-3396");
export const CUTS_ALL_COUNT = CUTS.length;

export default CUTS;

import nemoShaders from "./pr-nemo-relay-481/index.js";
import { nemoKit } from "./pr-nemo-relay-481/packet.js";
KITS.nemoKit = nemoKit;
CUTS.push(...nemoShaders);
CUTS_DOCKS.push("pr-nemo-relay-481");

import mhaShaders from "./pr-openxla-46539/index.js";
import { mhaKit } from "./pr-openxla-46539/packet.js";
KITS.mhaKit = mhaKit;
CUTS.push(...mhaShaders);
CUTS_DOCKS.push("pr-openxla-46539");

import aethPacketShaders from "./p-aether-lang/packet.js";
CUTS.push(...aethPacketShaders);

import sepPacket, { sxKit } from "./p-separatrix/packet.js";
KITS.sxKit = sxKit;
CUTS.push(...sepPacket);

CUTS.push(...MONODROMY_PACKET);

import topoMlPacket from "./p-topological-ml-toolkit/packet.js";
CUTS.push(...topoMlPacket);
CUTS_DOCKS.push("p-topological-ml-toolkit");

import topographShaders from "./pr-topograph-432/index.js";
export const CUTS_TG = topographShaders;
export const CUTS_TG_DOCKS = ["pr-topograph-432"];

import tritonShaders from "./pr-triton-kernels-22/index.js";
import { tkKit } from "./pr-triton-kernels-22/packet.js";
KITS.tkKit = tkKit;
CUTS.push(...tritonShaders);
CUTS_DOCKS.push("pr-triton-kernels-22");

import { EH_PACKET, ehKit } from "./p-epsilon-hollow/packet.js";
KITS.ehKit = ehKit;
CUTS.push(...EH_PACKET);

import { HW_SHADERS, hwKit } from "./pr-highway-3244/packet.js";
KITS.hwKit = hwKit;
CUTS.push(...HW_SHADERS);

import resolventPacket, { rvKit } from "./p-resolvent/packet.js";
KITS.rvKit = rvKit;
CUTS.push(...resolventPacket);
CUTS_DOCKS.push("p-resolvent");

import asmodeusPacket from "./p-asmodeus/packet.js";
CUTS.push(...asmodeusPacket);
CUTS_DOCKS.push("p-asmodeus");

import homePacket, { homeKit } from "./home/packet.js";
KITS.homeKit = homeKit;
CUTS.push(...homePacket);

import polyShaders from "./pr-polychrom-79/index.js";
import { polyKit } from "./pr-polychrom-79/packet.js";
KITS.polyKit = polyKit;
CUTS.push(...polyShaders);
CUTS_DOCKS.push("pr-polychrom-79");

import planimeterPacket from "./p-planimeter/packet.js";
CUTS.push(...planimeterPacket);

import tangleShaders, { tgKit } from "./p-tangle/packet.js";
KITS.tgKit = tgKit;
CUTS.push(...tangleShaders);

import loopShaders from "./the-loop/index.js";
import { loopKit } from "./the-loop/packet.js";
KITS.loopKit = loopKit;
CUTS.push(...loopShaders);
CUTS_DOCKS.push("the-loop");

import gzPacket, { gzKit } from "./pr-tensorflow-128930/packet.js";
KITS.gzKit = gzKit;
CUTS.push(...gzPacket);
CUTS_DOCKS.push("pr-tensorflow-128930");

import anyps5Shaders from "./pr-anyps5-12609/index.js";
import { kaKit } from "./pr-anyps5-12609/packet.js";
KITS.kaKit = kaKit;
CUTS.push(...anyps5Shaders);
CUTS_DOCKS.push("pr-anyps5-12609");
