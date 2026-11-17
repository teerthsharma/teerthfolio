// Seal skins: the registry for the per-cutscene seal drawings (spec seal-skins.md s2, ticket S0.1).
// Pure data and functions. Nothing here imports three, so the gates run under plain node;
// buildSkin takes the engine and the sdf constructors (ell, cone, paint, polygonize) as arguments.

export const SKINS = {};

export function hexRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`seal skin: bad hex ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const labF = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 841) / 108 + 4 / 29);

export function lab(hex) {
  const [r, g, b] = hexRgb(hex).map(linear);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const fx = labF(X), fy = labF(Y), fz = labF(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const luma709 = (hex) => {
  const [r, g, b] = hexRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// C1-C4 on the key hexes (spec s2 and s4). Throws the first gate that fails.
export function checkKey(key, dock = "skin") {
  const need = ["back", "belly", "pad", "freckle", "eye"];
  for (const k of need) if (!key?.[k]?.col) throw new Error(`seal skin ${dock}: key.${k}.col missing`);
  const back = lab(key.back.col), belly = lab(key.belly.col), pad = lab(key.pad.col), freckle = lab(key.freckle.col);
  const C1 = luma709(key.belly.col) / luma709(key.back.col);
  const hue = ((Math.atan2(back.b, back.a) * 180) / Math.PI + 360) % 360;
  const C = Math.hypot(back.a, back.b);
  const C2 = { hue, C, bDiff: belly.b - back.b };
  const C3 = { padMinusBelly: pad.L - belly.L, freckleGap: pad.L - freckle.L };
  const C4 = { eyeL: lab(key.eye.col).L };
  if (!(C1 >= 1.4)) throw new Error(`seal skin ${dock}: C1 belly/back luma ${C1.toFixed(2)} < 1.40`);
  if (!(hue >= 200 && hue <= 290 && C >= 4 && C2.bDiff >= 6))
    throw new Error(`seal skin ${dock}: C2 back hue ${hue.toFixed(0)} C* ${C.toFixed(1)} b* gap ${C2.bDiff.toFixed(1)}`);
  if (!(C3.padMinusBelly >= -15 && C3.freckleGap >= 20))
    throw new Error(`seal skin ${dock}: C3 pad-belly ${C3.padMinusBelly.toFixed(1)} freckle gap ${C3.freckleGap.toFixed(1)}`);
  if (!(C4.eyeL <= 30)) throw new Error(`seal skin ${dock}: C4 eye L* ${C4.eyeL.toFixed(1)} > 30`);
  return { C1, C2, C3, C4 };
}

export function defineSkin(dock, s) {
  if (!s?.key) throw new Error(`seal skin ${dock}: no key`);
  checkKey(s.key, dock);
  return (SKINS[dock] = s);
}

// body and wear prims become one mesh and one hull (spec s2: 3 draws in all).
// Only body.prims and wear.prims are converted; wear.hair, wear.eye and wear.cover are descriptors, not prims.
// sdf is passed in by the caller.
export function buildSkin(engine, skin, sdf) {
  const prims = [...skin.body.prims, ...(skin.wear?.prims ?? [])].map((p, i) => toPrim(p, i, skin, sdf));
  const geo = sdf.polygonize(prims, 0.011);
  const fig = engine.figure(geo, { ink: skin.line.ink, lineMul: skin.line.gain });
  writeLook(fig, skin);
  return fig;
}

// the skin's look goes into the figure's surface material and its ink hull (pup.js buildPup2 does the same by hand).
// Every write is skipped when the uniform or the skin field is absent.
function writeLook(fig, skin) {
  const u = fig.userData.mat.uniforms, h = fig.userData.hull.uniforms;
  const put = (uni, name, args) => { if (uni[name] && args !== undefined) uni[name].value.set(...args); };
  const num = (uni, name, v) => { if (uni[name] && v !== undefined) uni[name].value = v; };
  const { cel, face, decals, line } = skin;
  if (cel) {
    put(u, "uKeyV", cel.keyV);
    put(h, "uKeyV", cel.keyV);
    num(u, "uCut", cel.cut);
    num(u, "uBand", cel.band);
  }
  if (face) {
    put(u, "uFace", face.uFace);
    put(u, "uEyeCol", face.eyeCol && [face.eyeCol]);
    if (face.blush === 0) { put(u, "uBlush", [0, 0, 0, 0]); put(u, "uBlushCol", [0, 0, 0, 0]); }
  }
  if (decals) {
    put(u, "uDecCol", decals.col && [decals.col]);
    put(u, "uDecShade", decals.shade && [decals.shade]);
    put(u, "uDecA", decals.belly);
    put(u, "uDecB", decals.muzzle);
  }
  if (line) num(h, "uInkGain", line.gain);
}

// a prim names a region (paint, resolved through skin.key) or carries its own colour (col, shade, bias, id)
function toPrim(p, i, skin, sdf) {
  let m;
  if (p.paint !== undefined) {
    const e = skin.key?.[p.paint];
    if (!e?.col) throw new Error(`seal skin: paint "${p.paint}" has no colour in key`);
    m = sdf.paint(e.col, e.shade ?? e.col, { bias: e.bias, id: p.id });
  } else if (p.col !== undefined) {
    m = sdf.paint(p.col, p.shade ?? p.col, { bias: p.bias, id: p.id });
  } else {
    throw new Error(`seal skin: prim ${i} (${p.shape}) has neither a paint name nor col`);
  }
  if (p.shape === "ell") return sdf.ell(p.c, p.r, m, p.k, p.rot);
  if (p.shape === "cone") return sdf.cone(p.a, p.b, p.r1, p.r2, m, p.k);
  throw new Error(`seal skin: unknown shape "${p.shape}"`);
}
