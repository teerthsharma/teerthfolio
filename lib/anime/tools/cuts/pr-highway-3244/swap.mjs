// SWAP probe for pr-highway-3244: node swap.mjs. Steps the pup and the character at 24 fps through makeSwap with stub nodes.
// PASS when exactly one of the two is visible at every step, the squash values at 1.3 s, 1.4 s, the four frames before POP and the pup frames after POP match the table.
import { makeSwap } from "../../../cutscenes/pr-highway-3244/cast/character.js";
import { POP, C, SEAL } from "../../../cutscenes/pr-highway-3244/clock.js";

const node = () => {
  const scale = { x: 1, y: 1, z: 1, set(x, y, z) { Object.assign(scale, { x, y, z }); } };
  return { visible: true, scale };
};
const seal = { group: node() }, pup = { group: node() };
const sw = makeSwap({ seal }, pup);
const near = (a, b, e = 0.002) => Math.abs(a - b) <= e;

let both = 0, neither = 0, steps = 0;
for (let k = 0; k <= 26 * 24; k++) {
  sw.update(k / 24);
  steps++;
  if (seal.group.visible && pup.group.visible) both++;
  if (!seal.group.visible && !pup.group.visible) neither++;
}
const at = (t) => { sw.update(t); return seal.group.scale.y; };
const ch = (t) => { sw.update(t); return { seal: seal.group.scale.y, pup: pup.group.scale.y }; };

const fail = [];
const y13 = at(1.3), y14 = at(1.4);
if (!near(y13, SEAL.char * 0.5)) fail.push(`character squash at 1.3 s ${y13.toFixed(4)}`);
if (!near(y14, SEAL.char * 1.16)) fail.push(`character squash at 1.4 s ${y14.toFixed(4)}`);
console.log(`character squash y: 1.3 s ${y13.toFixed(4)}, 1.4 s ${y14.toFixed(4)} (want ${(SEAL.char * 0.5).toFixed(4)}, ${(SEAL.char * 1.16).toFixed(4)})`);

for (const k of [4, 3, 2, 1]) {
  const v = ch(POP - k / 24);
  if (!near(v.seal, SEAL.char * 0.86)) fail.push(`before POP -${k}/24 squash ${v.seal.toFixed(4)}`);
  console.log(`POP -${k}/24: character y ${v.seal.toFixed(4)} (want ${(SEAL.char * 0.86).toFixed(4)})`);
}

const want = [0.6, 1.14, 1.14, 0.96, 0.96].map((k) => k * SEAL.pup);
[2, 3, 4, 5, 6].forEach((k, i) => {
  const v = ch(POP + k / 24);
  if (seal.group.visible) fail.push(`character still shown at POP+${k}/24`);
  if (!near(v.pup, want[i], 0.002)) fail.push(`pup frame POP+${k}/24 squash ${v.pup.toFixed(4)}`);
  console.log(`POP +${k}/24: pup y ${v.pup.toFixed(4)} (want ${want[i].toFixed(4)})`);
});

if (both) fail.push(`${both} steps with both visible`);
if (neither) fail.push(`${neither} steps with neither visible`);
console.log(`steps ${steps}: both visible ${both}, neither visible ${neither}, POP ${POP}, impact ${C.impact}`);
if (fail.length) { console.error(fail.join("\n")); console.log("SWAP FAIL"); process.exit(1); }
console.log("SWAP PASS");
