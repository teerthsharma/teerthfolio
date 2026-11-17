// LOOK HELPERS: `variant(base, patch)` deep-merges a patch over a look spec (objects merge, arrays and scalars
// replace, null clears), so a second form or a hair-colour change is a few lines next to the base look.
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
export function variant(base, patch) {
  const out = { ...base };
  for (const k of Object.keys(patch)) out[k] = plain(patch[k]) && plain(base[k]) ? variant(base[k], patch[k]) : patch[k];
  return out;
}
