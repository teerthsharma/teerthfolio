/**
 * Real cryptography used as building structure, for two southwest stations.
 *
 * Everything in this file is computed ONCE, at module load, from the authored
 * corpus in data/teerth-content.json. Nothing here runs per frame; the render
 * path only reads frozen numbers off the tables below.
 *
 * WHY SHA-256 IS IMPLEMENTED HERE RATHER THAN IMPORTED
 * node:crypto does not cross the bundler into the browser, and the world runs
 * in the browser. So the primitive is implemented from FIPS 180-4 in this file,
 * and the build gate (scripts/check-crypto-structures.mjs) recomputes every
 * exported value with node's own createHash("sha256") and asserts equality.
 * Two independent implementations that must agree is a stronger contract than
 * one implementation agreeing with itself, so the constraint bought something.
 *
 * CO_07 topology-archive-wall — a Merkle wall.
 *   The archive's masonry IS a SHA-256 Merkle tree over the station's archived
 *   corpus. One block per tree node, one course per tree level, leaves on the
 *   bottom course, the root as a single distinguished capstone. Block value,
 *   depth and rise are bytes 0/1/2 of that node's own hash, so the wall is the
 *   content addressed by it. Change one archived name and the wall changes.
 *
 * CO_06 upstream-radio-mast — keystream telemetry.
 *   The mast's telemetry lamps blink on a 32-bit maximal-length LFSR keystream
 *   seeded by SHA-256 of the real upstream repositories the mast relays.
 */

// The import attribute is mandatory: Node has required it on JSON modules since
// 22, and scripts/check-crypto-structures.mjs imports this file directly.
import content from "../data/teerth-content.json" with { type: "json" };

/* ------------------------------------------------------------------ *
 * SHA-256, FIPS 180-4. Input and output are byte arrays.
 * ------------------------------------------------------------------ */

const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (word, bits) => ((word >>> bits) | (word << (32 - bits))) >>> 0;

/** SHA-256 of a byte array. Returns 32 bytes. */
export function sha256(bytes) {
  const state = Uint32Array.from([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLength = bytes.length * 8;
  // Pad: 0x80, zeros, then the 64-bit big-endian length.
  //
  // The padded length is ceil((len + 9) / 64) rounded up to whole blocks. Note
  // the ceiling: this was `((len + 9) >> 6) + 1` blocks, which is a FLOOR plus
  // one, and those differ by a whole block exactly when len + 9 is already a
  // multiple of 64 — that is, whenever len % 64 === 55. At those nine lengths
  // in 0..600 the message was compressed with one extra all-zero block and the
  // digest was not SHA-256 at all. No name in the shipped corpus is 55 mod 64
  // long, so no rendered value moves, but "the wall is a SHA-256 tree" is a
  // claim about every possible corpus, not the current one.
  const padded = new Uint8Array(((bytes.length + 72) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  // Lengths here are message sizes, never above 2^32 bits, so the high word
  // of the 64-bit length field is always zero.
  padded[padded.length - 4] = (bitLength >>> 24) & 0xff;
  padded[padded.length - 3] = (bitLength >>> 16) & 0xff;
  padded[padded.length - 2] = (bitLength >>> 8) & 0xff;
  padded[padded.length - 1] = bitLength & 0xff;

  const w = new Uint32Array(64);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i += 1) {
      const at = block + i * 4;
      w[i] =
        ((padded[at] << 24) |
          (padded[at + 1] << 16) |
          (padded[at + 2] << 8) |
          padded[at + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
  const digest = new Uint8Array(32);
  for (let i = 0; i < 8; i += 1) {
    digest[i * 4] = (state[i] >>> 24) & 0xff;
    digest[i * 4 + 1] = (state[i] >>> 16) & 0xff;
    digest[i * 4 + 2] = (state[i] >>> 8) & 0xff;
    digest[i * 4 + 3] = state[i] & 0xff;
  }
  return digest;
}

const encoder = new TextEncoder();

export function sha256Hex(text) {
  return toHex(sha256(encoder.encode(text)));
}

export function toHex(bytes) {
  let hex = "";
  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index].toString(16).padStart(2, "0");
  }
  return hex;
}

/* ------------------------------------------------------------------ *
 * CO_07 — the Merkle wall.
 * ------------------------------------------------------------------ */

/**
 * Standard binary Merkle tree.
 *   leaf   = H(utf8(name))
 *   parent = H(left || right)   over the two raw 32-byte digests
 *   an odd node at the end of a level is PROMOTED unchanged to the next level
 *
 * Returns levels[0] = leaves ... levels[n-1] = [root], each a Uint8Array(32).
 * Exported because the build gate runs an avalanche test against this exact
 * function rather than against a copy of it.
 */
export function merkleLevels(names) {
  let level = names.map((name) => sha256(encoder.encode(name)));
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      if (index + 1 === level.length) {
        next.push(level[index]);
        continue;
      }
      const pair = new Uint8Array(64);
      pair.set(level[index], 0);
      pair.set(level[index + 1], 32);
      next.push(sha256(pair));
    }
    level = next;
    levels.push(level);
  }
  return levels;
}

/**
 * The archived corpus for CO_07, in the authored order it appears in
 * data/teerth-content.json. That file's order IS the deterministic order —
 * re-sorting here would only add a second thing to keep in step.
 */
const ARCHIVE_STATION_ID = "topology-archive";
export const ARCHIVE_CORPUS = Object.freeze(
  content.stations.find((station) => station.id === ARCHIVE_STATION_ID).projects.slice(),
);

/**
 * The wall. One block per node; the course row is the tree level, so the bottom
 * course is the corpus itself and every course above it is one round of
 * hashing, converging on a single capstone that is the archive's address.
 *
 * Per-block physical attributes come off the node's own digest:
 *   byte 0 -> tint    value position inside the station's authored cladding
 *                     band (a VALUE variation, never a hue or saturation one —
 *                     this station has the tightest colour-anchor margin in the
 *                     world and a busier wall must not become a louder one)
 *   byte 1 -> depth   how far the block stands proud of the wall face
 *   byte 2 -> rise    small course-height variation, so a course reads as laid
 *                     masonry rather than as a printed strip
 */
function buildMerkleWall(names) {
  const levels = merkleLevels(names);
  const nodes = [];
  for (let level = 0; level < levels.length; level += 1) {
    const course = levels[level];
    for (let slot = 0; slot < course.length; slot += 1) {
      const digest = course[slot];
      nodes.push(
        Object.freeze({
          courseRow: level,
          courseSlot: slot,
          courseWidth: course.length,
          depth: digest[1] / 255,
          hex: toHex(digest),
          isRoot: level === levels.length - 1,
          rise: digest[2] / 255,
          tint: digest[0] / 255,
        }),
      );
    }
  }
  return Object.freeze({
    algorithm:
      "SHA-256 binary Merkle tree, parent = H(left || right), trailing odd node promoted",
    leafCount: names.length,
    leaves: Object.freeze(names.slice()),
    levels: levels.length,
    nodeCount: nodes.length,
    nodes: Object.freeze(nodes),
    rootHex: toHex(levels[levels.length - 1][0]),
  });
}

export const MERKLE_ARCHIVE_WALL = buildMerkleWall(ARCHIVE_CORPUS);

/* ------------------------------------------------------------------ *
 * CO_06 — keystream telemetry.
 * ------------------------------------------------------------------ */

/**
 * 32-bit Fibonacci LFSR, shifting right, feedback into the MSB.
 *
 *   polynomial  x^32 + x^22 + x^2 + x + 1     (taps 32, 22, 2, 1)
 *   tap shifts  32-32=0, 32-22=10, 32-2=30, 32-1=31
 *   period      2^32 - 1 = 4294967295 states (maximal length; 0 is excluded
 *               and is the one state the seed is forced away from)
 *
 * The output bit of a step is the bit LEAVING the register (s & 1), taken
 * before the shift. Bytes are assembled MSB-first from eight such bits.
 */
export const LFSR_POLYNOMIAL = "x^32 + x^22 + x^2 + x + 1";
export const LFSR_TAPS = Object.freeze([32, 22, 2, 1]);
export const LFSR_PERIOD = 4294967295;

export function lfsrStep(state) {
  const feedback = ((state ^ (state >>> 10) ^ (state >>> 30) ^ (state >>> 31)) & 1) >>> 0;
  return (((state >>> 1) | (feedback << 31)) >>> 0);
}

/** `count` keystream bytes from a 32-bit seed. Seed 0 is the LFSR's fixed point. */
export function lfsrKeystream(seed, count) {
  let state = seed >>> 0 || 1;
  const out = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      byte = ((byte << 1) | (state & 1)) & 0xff;
      state = lfsrStep(state);
    }
    out[index] = byte;
  }
  return out;
}

/**
 * The repositories this mast actually relays, deduplicated in the order they
 * appear in data/teerth-content.json. These are the upstream feed's own repo
 * names, not a label invented for the mast.
 */
export const UPSTREAM_REPOS = Object.freeze([
  ...new Set(content.upstream.map((entry) => entry.repo)),
]);

const MAST_SEED_DIGEST = sha256(encoder.encode(UPSTREAM_REPOS.join("\n")));
/** Seed = the first four digest bytes, big-endian. */
export const MAST_SEED =
  ((MAST_SEED_DIGEST[0] << 24) |
    (MAST_SEED_DIGEST[1] << 16) |
    (MAST_SEED_DIGEST[2] << 8) |
    MAST_SEED_DIGEST[3]) >>>
  0;

export const MAST_TELEMETRY_LAMP_COUNT = 8;
const MAST_KEYSTREAM_BYTES = lfsrKeystream(MAST_SEED, 256);

/**
 * Two keystream bytes per lamp:
 *   byte 2i     -> phase offset within the blink cycle (0..1)
 *   byte 2i+1   low nibble  -> duty, the on-fraction of the cycle (0.28..0.62)
 *               high nibble -> lit intensity (0.42..1.00)
 *
 * The cycle clock lives in the fixed-step mechanism state and does not advance
 * under reduced motion, so the pattern then holds at its seed state forever.
 */
export const MAST_TELEMETRY = Object.freeze({
  algorithm: `32-bit Fibonacci LFSR, ${LFSR_POLYNOMIAL}`,
  duty: Object.freeze(
    Array.from(
      { length: MAST_TELEMETRY_LAMP_COUNT },
      (_, lamp) => 0.28 + ((MAST_KEYSTREAM_BYTES[lamp * 2 + 1] & 0x0f) / 15) * 0.34,
    ),
  ),
  intensity: Object.freeze(
    Array.from(
      { length: MAST_TELEMETRY_LAMP_COUNT },
      (_, lamp) => 0.42 + ((MAST_KEYSTREAM_BYTES[lamp * 2 + 1] >> 4) / 15) * 0.58,
    ),
  ),
  keystreamHex: toHex(MAST_KEYSTREAM_BYTES),
  lampCount: MAST_TELEMETRY_LAMP_COUNT,
  period: LFSR_PERIOD,
  phase: Object.freeze(
    Array.from(
      { length: MAST_TELEMETRY_LAMP_COUNT },
      (_, lamp) => MAST_KEYSTREAM_BYTES[lamp * 2] / 256,
    ),
  ),
  repos: UPSTREAM_REPOS,
  seed: MAST_SEED,
  seedHex: toHex(MAST_SEED_DIGEST),
});

/** One blink cycle. Chosen, not derived — the keystream owns the pattern, not the tempo. */
export const MAST_TELEMETRY_CYCLE_SECONDS = 1.7;
