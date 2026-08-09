// The gate that makes two southwest buildings cryptography rather than
// decoration.
//
// lib/crypto-structures.js implements SHA-256 itself, because node:crypto does
// not cross the bundler into the browser and the world runs in the browser.
// This script is the independent half of that arrangement: it recomputes every
// exported value from data/teerth-content.json using node's own
// createHash("sha256") and a from-scratch LFSR written off the documented
// polynomial, and asserts byte equality. A hand-tweaked "prettier" tint, a
// nudged block depth or a re-ordered corpus all fail here.
//
// It also checks the two properties that separate a Merkle tree from a list of
// hashes: the root is not any leaf, and changing one leaf name changes the root.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const libraryPath = join(root, "lib", "crypto-structures.js");
const componentPath = join(root, "components", "PolarStationMechanismsSW.jsx");
const mechanismPath = join(root, "lib", "polar-station-mechanisms-sw.js");
const personalityPath = join(root, "lib", "polar-station-personality.js");

const content = JSON.parse(
  readFileSync(join(root, "data", "teerth-content.json"), "utf8"),
);
const {
  ARCHIVE_CORPUS,
  LFSR_PERIOD,
  LFSR_POLYNOMIAL,
  LFSR_TAPS,
  MAST_SEED,
  MAST_TELEMETRY,
  MAST_TELEMETRY_CYCLE_SECONDS,
  MERKLE_ARCHIVE_WALL,
  UPSTREAM_REPOS,
  merkleLevels,
  sha256Hex,
} = await import(pathToFileURL(libraryPath).href);

/* ---------------- reference implementations ---------------- */

const H = (buffer) => createHash("sha256").update(buffer).digest();

/** Reference Merkle tree. Same rules, node's hash, written independently. */
function referenceLevels(names) {
  let level = names.map((name) => H(Buffer.from(name, "utf8")));
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      next.push(
        index + 1 === level.length
          ? level[index]
          : H(Buffer.concat([level[index], level[index + 1]])),
      );
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

/**
 * Reference 32-bit Fibonacci LFSR, written from the polynomial the library
 * documents rather than from the library's code: x^32 + x^22 + x^2 + x + 1, so
 * the tap shifts are 32-e for each exponent e — 0, 10, 30, 31. Output bit is the
 * bit leaving the register; bytes are MSB-first.
 */
function referenceKeystream(seed, count) {
  let s = seed >>> 0;
  const shifts = LFSR_TAPS.map((exponent) => 32 - exponent);
  const out = Buffer.alloc(count);
  for (let index = 0; index < count; index += 1) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      byte = ((byte << 1) | (s & 1)) & 0xff;
      let feedback = 0;
      for (const shift of shifts) feedback ^= s >>> shift;
      s = (((s >>> 1) | ((feedback & 1) << 31)) >>> 0);
    }
    out[index] = byte;
  }
  return out;
}

/* ---------------- the primitive itself ---------------- */

// If the hand-written SHA-256 in lib/ ever drifts, everything below is
// meaningless, so it is checked first against known-answer vectors and against
// node.
assert.equal(
  sha256Hex(""),
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "SHA-256 of the empty string must match FIPS 180-4",
);
assert.equal(
  sha256Hex("abc"),
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "SHA-256 of \"abc\" must match FIPS 180-4",
);
for (const probe of ["a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(119)]) {
  // The padding block boundary is the one place a hand-written SHA-256 breaks.
  assert.equal(
    sha256Hex(probe),
    H(Buffer.from(probe, "utf8")).toString("hex"),
    `SHA-256 must match node at length ${probe.length}`,
  );
}

/* ---------------- CO_07: the Merkle wall ---------------- */

const archiveStation = content.stations.find(
  (station) => station.id === "topology-archive",
);
assert.ok(archiveStation, "data/teerth-content.json must carry the topology-archive station");
assert.deepEqual(
  [...ARCHIVE_CORPUS],
  archiveStation.projects,
  "the Merkle wall's leaves must be the archive station's authored corpus, in file order",
);

const levels = referenceLevels(archiveStation.projects);
assert.equal(
  MERKLE_ARCHIVE_WALL.levels,
  levels.length,
  `tree levels must be ${levels.length} for ${archiveStation.projects.length} leaves`,
);
assert.equal(
  MERKLE_ARCHIVE_WALL.nodeCount,
  levels.reduce((total, level) => total + level.length, 0),
  "one block per tree node, no more and no fewer",
);
assert.equal(
  MERKLE_ARCHIVE_WALL.rootHex,
  levels[levels.length - 1][0].toString("hex"),
  "the wall's root must be the Merkle root of the real corpus",
);

// Every block's hash AND every physical attribute derived from it. The three
// attribute assertions are the ones that fail if somebody hand-tunes the wall
// to look nicer: tint, depth and rise are bytes 0, 1 and 2 of the digest and
// nothing else.
{
  let node = 0;
  for (let level = 0; level < levels.length; level += 1) {
    for (let slot = 0; slot < levels[level].length; slot += 1) {
      const digest = levels[level][slot];
      const block = MERKLE_ARCHIVE_WALL.nodes[node];
      const where = `node ${node} (level ${level}, slot ${slot})`;
      assert.equal(block.courseRow, level, `${where}: course row must be the tree level`);
      assert.equal(block.courseSlot, slot, `${where}: course slot must be the node index`);
      assert.equal(
        block.courseWidth,
        levels[level].length,
        `${where}: course width must be the level width`,
      );
      assert.equal(block.hex, digest.toString("hex"), `${where}: digest mismatch`);
      assert.equal(block.tint, digest[0] / 255, `${where}: tint must be digest byte 0`);
      assert.equal(block.depth, digest[1] / 255, `${where}: depth must be digest byte 1`);
      assert.equal(block.rise, digest[2] / 255, `${where}: rise must be digest byte 2`);
      assert.equal(
        block.isRoot,
        level === levels.length - 1,
        `${where}: exactly the top-level node is the capstone`,
      );
      node += 1;
    }
  }
  assert.equal(node, MERKLE_ARCHIVE_WALL.nodes.length, "no unaccounted blocks");
}

// Courses must converge: strictly narrower every level, ending in one capstone.
{
  const widths = [];
  for (const block of MERKLE_ARCHIVE_WALL.nodes) {
    widths[block.courseRow] = (widths[block.courseRow] || 0) + 1;
  }
  assert.equal(widths.length, MERKLE_ARCHIVE_WALL.levels, "one course per tree level");
  assert.equal(widths[0], ARCHIVE_CORPUS.length, "the bottom course is the corpus itself");
  assert.equal(widths[widths.length - 1], 1, "the wall must end in a single capstone");
  for (let row = 1; row < widths.length; row += 1) {
    assert.ok(
      widths[row] < widths[row - 1],
      `course ${row} (${widths[row]}) must be narrower than course ${row - 1} (${widths[row - 1]})`,
    );
  }
  assert.equal(
    MERKLE_ARCHIVE_WALL.nodes.filter((block) => block.isRoot).length,
    1,
    "exactly one block carries the accent capstone treatment",
  );
}

// A Merkle root is not a leaf, and it is not any interior node either.
for (const block of MERKLE_ARCHIVE_WALL.nodes) {
  if (block.isRoot) continue;
  assert.notEqual(
    block.hex,
    MERKLE_ARCHIVE_WALL.rootHex,
    "the root capstone must not repeat any other block's value",
  );
}

// Avalanche, run against the library's own tree function rather than a copy:
// change one character of one archived name and the capstone changes.
{
  const perturbed = [...ARCHIVE_CORPUS];
  perturbed[2] = `${perturbed[2]}x`;
  const shifted = merkleLevels(perturbed);
  const shiftedRoot = Buffer.from(shifted[shifted.length - 1][0]).toString("hex");
  assert.notEqual(
    shiftedRoot,
    MERKLE_ARCHIVE_WALL.rootHex,
    "changing one leaf name must change the root — otherwise the wall is decoration",
  );
  let differingBits = 0;
  for (let byte = 0; byte < 32; byte += 1) {
    const a = Number.parseInt(MERKLE_ARCHIVE_WALL.rootHex.slice(byte * 2, byte * 2 + 2), 16);
    const b = Number.parseInt(shiftedRoot.slice(byte * 2, byte * 2 + 2), 16);
    for (let bit = 0; bit < 8; bit += 1) differingBits += ((a ^ b) >> bit) & 1;
  }
  assert.ok(
    differingBits > 80 && differingBits < 176,
    `one-leaf avalanche should flip roughly half of 256 root bits (flipped ${differingBits})`,
  );
}

/* ---------------- CO_06: keystream telemetry ---------------- */

const expectedRepos = [...new Set(content.upstream.map((entry) => entry.repo))];
assert.deepEqual(
  [...UPSTREAM_REPOS],
  expectedRepos,
  "the mast seed must come from the real upstream repo names, deduplicated in file order",
);
assert.equal(LFSR_POLYNOMIAL, "x^32 + x^22 + x^2 + x + 1");
assert.deepEqual([...LFSR_TAPS], [32, 22, 2, 1]);
assert.equal(
  LFSR_PERIOD,
  2 ** 32 - 1,
  "a maximal-length 32-bit LFSR has period 2^32 - 1 = 4294967295 states",
);
assert.equal(MAST_TELEMETRY.period, LFSR_PERIOD);

const seedDigest = H(Buffer.from(expectedRepos.join("\n"), "utf8"));
assert.equal(MAST_TELEMETRY.seedHex, seedDigest.toString("hex"), "seed digest mismatch");
assert.equal(
  MAST_SEED,
  seedDigest.readUInt32BE(0),
  "the LFSR seed must be the first four SHA-256 bytes, big-endian",
);
assert.notEqual(MAST_SEED, 0, "seed 0 is the LFSR's fixed point and must never be reached");

// First 256 outputs, against a reference written from the polynomial.
{
  const reference = referenceKeystream(MAST_SEED, 256);
  assert.equal(
    MAST_TELEMETRY.keystreamHex,
    reference.toString("hex"),
    `the implemented PRG must match the reference for the first 256 outputs (32-bit Fibonacci LFSR, ${LFSR_POLYNOMIAL}, period ${LFSR_PERIOD})`,
  );
}

// The keystream must actually be a keystream: a stuck or short-period register
// shows up immediately as a repeated byte run or a collapsed byte histogram.
{
  const stream = referenceKeystream(MAST_SEED, 256);
  const distinct = new Set(stream).size;
  assert.ok(
    distinct > 128,
    `256 keystream bytes should be broadly distinct (got ${distinct}); a low count means the register is degenerate`,
  );
  let ones = 0;
  for (const byte of stream) for (let bit = 0; bit < 8; bit += 1) ones += (byte >> bit) & 1;
  assert.ok(
    ones > 870 && ones < 1178,
    `keystream bit balance should sit near 1024 of 2048 (got ${ones})`,
  );
}

// Lamp attributes are the keystream, byte for byte.
{
  const stream = referenceKeystream(MAST_SEED, 256);
  assert.equal(MAST_TELEMETRY.lampCount, 8);
  assert.ok(MAST_TELEMETRY_CYCLE_SECONDS > 0, "the telemetry blink cycle must be positive");
  for (let lamp = 0; lamp < MAST_TELEMETRY.lampCount; lamp += 1) {
    assert.equal(
      MAST_TELEMETRY.phase[lamp],
      stream[lamp * 2] / 256,
      `lamp ${lamp} phase must be keystream byte ${lamp * 2}`,
    );
    assert.equal(
      MAST_TELEMETRY.duty[lamp],
      0.28 + ((stream[lamp * 2 + 1] & 0x0f) / 15) * 0.34,
      `lamp ${lamp} duty must be the low nibble of keystream byte ${lamp * 2 + 1}`,
    );
    assert.equal(
      MAST_TELEMETRY.intensity[lamp],
      0.42 + ((stream[lamp * 2 + 1] >> 4) / 15) * 0.58,
      `lamp ${lamp} intensity must be the high nibble of keystream byte ${lamp * 2 + 1}`,
    );
  }
  // No lamp may be permanently dark or permanently lit: a constant lamp carries
  // no keystream and would read as a broken bulb.
  for (let lamp = 0; lamp < MAST_TELEMETRY.lampCount; lamp += 1) {
    assert.ok(
      MAST_TELEMETRY.duty[lamp] > 0.05 && MAST_TELEMETRY.duty[lamp] < 0.95,
      `lamp ${lamp} must actually blink (duty ${MAST_TELEMETRY.duty[lamp]})`,
    );
  }
  // ... and the eight of them must not share one phase, which is what an
  // authored chase light looks like and what this replaced.
  assert.ok(
    new Set(MAST_TELEMETRY.phase).size >= 7,
    "the telemetry run must not collapse onto a shared phase",
  );
}

/* ---------------- the buildings actually use it ---------------- */

const component = readFileSync(componentPath, "utf8");
for (const token of [
  "MERKLE_ARCHIVE_WALL",
  "MAST_TELEMETRY",
  "MAST_TELEMETRY_CYCLE_SECONDS",
  "TOPOLOGY_MERKLE_START",
  "TOPOLOGY_MERKLE_BLOCKS",
  "const TOPOLOGY_MERKLE_COUNT = MERKLE_ARCHIVE_WALL.nodeCount",
  "const TOPOLOGY_FOUNDATION_COUNT = TOPOLOGY_SHED_COUNT + TOPOLOGY_MERKLE_COUNT",
  "UPSTREAM_TELEMETRY_START",
  "UPSTREAM_TELEMETRY_MOUNTS",
  "upstreamTelemetryLevel",
  "const UPSTREAM_TELEMETRY_COUNT = MAST_TELEMETRY.lampCount",
  "state.telemetryTime",
]) {
  assert.ok(
    component.includes(token),
    `PolarStationMechanismsSW.jsx must wire ${JSON.stringify(token)}`,
  );
}
// The wall's structure comes from the tree, not from a literal that could drift
// out of step with the corpus.
assert.ok(
  !/TOPOLOGY_MERKLE_COUNT\s*=\s*\d/.test(component),
  "the Merkle block count must be derived from the tree, never written as a literal",
);
assert.ok(
  !/UPSTREAM_TELEMETRY_COUNT\s*=\s*\d/.test(component),
  "the telemetry lamp count must be derived from the keystream table, never a literal",
);
// The hashing happens at module load. A digest inside the frame loop is the one
// failure mode this whole design exists to avoid on an Intel UHD part.
{
  const frameLoop = component.slice(component.indexOf("useFrame(("));
  for (const forbidden of ["sha256", "merkleLevels", "lfsrKeystream"]) {
    assert.ok(
      !frameLoop.includes(forbidden),
      `${forbidden} must never be reachable from the frame loop`,
    );
  }
}

const mechanisms = readFileSync(mechanismPath, "utf8");
assert.match(
  mechanisms,
  /telemetryTime: 0/,
  "the upstream mechanism state must carry the telemetry clock",
);
{
  const beaconStart = mechanisms.indexOf("function stepUpstreamBeacon(");
  assert.ok(beaconStart >= 0, "stepUpstreamBeacon must own the mast's deterministic clocks");
  const beacon = mechanisms.slice(beaconStart, mechanisms.indexOf("\n}", beaconStart));
  const guard = beacon.indexOf("if (reducedMotion)");
  const escape = beacon.indexOf("return;", guard);
  const advance = beacon.indexOf("state.telemetryTime += FIXED_STEP_SECONDS;");
  assert.ok(guard >= 0 && escape > guard, "the beacon step must guard on reducedMotion");
  assert.ok(advance > escape, "the telemetry clock must advance only past the reduced-motion return");
  assert.ok(
    !/state\.telemetryTime\s*[+-]?=/.test(beacon.slice(0, escape)),
    "reduced motion must leave the telemetry clock untouched, so the pattern holds at its seed state",
  );
}

const personality = readFileSync(personalityPath, "utf8");
assert.match(
  personality,
  /sha256-merkle-archive-courses/,
  "CO_07's monument identity must name the Merkle structure",
);
assert.match(
  personality,
  /lfsr-keystream-signal-harbor/,
  "CO_06's monument identity must name the keystream",
);

console.log(
  `Cryptographic structures verified: CO_07 SHA-256 Merkle wall over ${ARCHIVE_CORPUS.length} archived names, ` +
    `${MERKLE_ARCHIVE_WALL.levels} courses / ${MERKLE_ARCHIVE_WALL.nodeCount} blocks, root ${MERKLE_ARCHIVE_WALL.rootHex.slice(0, 16)}...; ` +
    `CO_06 32-bit Fibonacci LFSR ${LFSR_POLYNOMIAL}, period ${LFSR_PERIOD}, seed 0x${MAST_SEED.toString(16)} ` +
    `from SHA-256 of ${UPSTREAM_REPOS.length} upstream repos, first 256 outputs match the reference.`,
);
