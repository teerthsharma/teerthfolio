// THE LOOK PRESETS AND THE DEFAULT PAINT: one line of scene data repaints a dock.
//   scene.bg = "red-domain" | "night-city" | "dusk-city" | "day-city" | "hall" | "auto"   a named recipe (below)
//   scene.bg = { preset, look: {...bgLook options}, paint: {...paintOver options}, hero: false }   a recipe with overrides
//   scene.bg = false                                                                      leave the world untouched
//   scene.bg undefined                                                                    "auto": the engine applies the light pass to every dock
// bgApply(ctx, root, spec) runs after the world layer builds: it makes the look, paints the existing set over (brush, dark foot,
// gradient, lit window cards, pooled light) and, unless hero:false, binds the focus mass and one pool of light to the seal each frame.
import { Color, Vector3 } from "three";
import { bgLook } from "./look.js";
import { bgPaintOver } from "./paintover.js";
import { bgAir } from "./air.js";
import { bgForeground } from "./foreground.js";

// auto: the default look. Structure only (foot, haze by distance, a rim and one pool bound to the seal, hero focus); the photography owns how dark
// the set goes (look.photo.value), so the focus mass here is light. Its colours come from scene.palette in bgApply.
const AUTO = { look: { bands: [3, 0.05], base: { dark: 0.38, h: 6, grime: 0.35 }, haze: { k: 0.0035, start: 10, h: 40, amt: 0.55 }, rim: { dir: [0, 0.3, -1], k: 0.8 }, focus: { r: 0.3, k: 0.18 }, pools: [{ r: 3, k: 0.55 }] }, paint: { grit: 0.18, brush: 0.2, foot: 0.55, footH: 6, gradient: 0.4, pools: true, cards: true, gridCards: true }, hero: true, auto: true };

export const BG_PRESETS = {
  auto: AUTO,
  "red-domain": {
    look: {
      shade: "#4a2450", amb: "#6a2a4a", bands: [3, 0.05], base: { dark: 0.62, h: 9, grime: 0.5 },
      haze: { col: "#40101e", k: 0.0022, start: 24, h: 30, amt: 0.7 }, rim: { dir: [0, 0.25, -1], col: "#ff5a30", k: 1.0, lo: 0.5, hi: 0.9 },
      focus: { r: 0.26, k: 0.55 }, pools: [{ at: [0, 4, -40], col: "#ff3a18", r: 30, k: 0.8 }, { col: "#ff8a5a", r: 3.2, k: 0.7 }],
    },
    dress: { air: [{ kind: "mist", at: [0, 1.6, -26], size: [90, 6], col: "#b83a4a", k: 0.28 }] },
    paint: { footH: 9, foot: 0.7, gradient: 0.5, pools: true, facade: { wall0: "#2a2438", wall1: "#44305a", trim: "#c8a8b8", litA: "#ffd8a0", litB: "#f4efe2", litC: "#ff9a8a", night: 1, lit: 0.3 } }, hero: true,
  },
  "night-city": {
    look: {
      shade: "#32408a", amb: "#3a4a9a", bands: [3, 0.05], base: { dark: 0.55, h: 8, grime: 0.5 }, haze: { col: "#2a2050", k: 0.005, start: 12, h: 40, amt: 0.9 },
      rim: { dir: [0, 0.3, -1], col: "#ff9a60", k: 0.9 }, focus: { r: 0.28, k: 0.5 }, pools: [{ at: [4, 4.5, 3], col: "#ffb870", r: 10, k: 0.9 }, { col: "#ffc890", r: 3, k: 0.6 }],
    },
    dress: { air: [{ kind: "mist", at: [0, 1.8, -12], size: [60, 6], col: "#6a5a9a", k: 0.55 }] },
    paint: { pools: true, footH: 8, foot: 0.65, facade: { wall0: "#2a2e4a", wall1: "#443a62", trim: "#9a9ac0", litA: "#ffd890", litB: "#cfe8ff", litC: "#9affd8", night: 1, lit: 0.45 } }, hero: true,
  },
  "dusk-city": {
    look: {
      shade: "#6a4a98", amb: "#a06a8a", bands: [3, 0.06], base: { dark: 0.45, h: 6, grime: 0.4 }, haze: { col: "#f0b890", k: 0.004, start: 16, h: 24, amt: 0.8 },
      rim: { dir: [0, 0.2, -1], col: "#ffd0a0", k: 1.0 }, focus: { r: 0.32, k: 0.35 }, pools: [{ col: "#ffd0a0", r: 3, k: 0.5 }],
    },
    paint: { pools: true, footH: 6, facade: { wall0: "#6a5a78", wall1: "#a8808a", trim: "#f0d8c8", litA: "#ffe0a0", litB: "#fff4dc", litC: "#ffc890", night: 0.4, lit: 0.2 } }, hero: true,
  },
  "day-city": {
    look: {
      shade: "#6a82c0", amb: "#8cb0e8", bands: [3, 0.05], base: { dark: 0.38, h: 6, grime: 0.4 }, haze: { col: "#b8d4f2", k: 0.004, start: 12, h: 70, amt: 0.9 },
      rim: { dir: [-0.3, 0.4, -1], col: "#fff0c8", k: 0.7 },
    },
    paint: { pools: false, footH: 6, facade: { wall0: "#b4b0b8", wall1: "#e2d8cc", trim: "#f4f0ec", night: 0, lit: 0 } }, hero: false,
  },
  throne: {
    look: {
      light: { dir: [0.5, 0.8, -0.3], col: "#ffe2c8" }, shade: "#4a2a70", amb: "#6a4a88", bands: [3, 0.05], base: { dark: 0.5, h: 8, grime: 0.4 },
      haze: { col: "#2a1838", k: 0.007, start: 10, h: 40, amt: 0.6 }, rim: { dir: [0, 0.3, 1], col: "#ffc060", k: 1.0 }, focus: { r: 0.3, k: 0.45 },
      pools: [{ at: [0, 5.0, 8], col: "#ffc860", r: 11, k: 1.5 }, { col: "#ffd890", r: 3.2, k: 0.8 }, { at: [-3.6, 5.2, -1], col: "#7a98e8", r: 8, k: 0.4 }, { at: [3.6, 5.2, -1], col: "#7a98e8", r: 8, k: 0.4 }],
    },
    paint: { pools: true, footH: 7, foot: 0.6, gradient: 0.4, grit: 0.15, brush: 0.15 }, hero: true,
  },
  hall: {
    look: {
      shade: "#4a3a78", amb: "#5a4a88", bands: [3, 0.05], base: { dark: 0.62, h: 7, grime: 0.5 }, haze: { col: "#20182c", k: 0.012, start: 8, h: 26, amt: 0.85 },
      rim: { dir: [0, 0.3, -1], col: "#ff9a50", k: 0.9 }, focus: { r: 0.24, k: 0.6 }, pools: [{ at: [0, 6, 6], col: "#ffc860", r: 9, k: 1.0 }, { col: "#ffd890", r: 3.2, k: 0.7 }],
    },
    paint: { pools: true, footH: 8, foot: 0.7, gradient: 0.5 }, hero: true,
  },
};

const merge = (a, b) => (b && typeof b === "object" && !Array.isArray(b) ? Object.fromEntries([...new Set([...Object.keys(a ?? {}), ...Object.keys(b)])].map((k) => [k, k in b ? (a?.[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]) : a[k]])) : b ?? a);

export function bgQuery(spec) {
  const q = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("bg");
  return q === null ? spec : q === "off" ? false : q;
}

export function bgSpec(spec) {
  if (spec === false || spec === null) return null;
  const s = typeof spec === "string" ? { preset: spec } : spec ?? {};
  const base = BG_PRESETS[s.preset ?? "auto"] ?? AUTO;
  return { look: merge(base.look, s.look), paint: merge(base.paint, s.paint), hero: s.hero ?? base.hero, dress: merge(base.dress, s.dress), auto: base === AUTO };
}

// the auto preset takes its light from the dock's own palette: haze is the sky or ground pulled dark, rim and pool the accent
function autoColours(ctx, S) {
  const pal = ctx.palette ?? {}, dark = (h, k) => `#${new Color(h).multiplyScalar(k).getHexString()}`;
  const ok = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
  const acc = [pal.accent, pal.key, pal.red, pal.gold].find(ok) ?? "#ffd0a0", base = [pal.sky, pal.ground, pal.paper].find(ok) ?? "#241a38";
  const l = S.look;
  if (!l.haze.col) l.haze = { ...l.haze, col: dark(base, 0.35) };
  if (!l.rim.col) l.rim = { ...l.rim, col: acc };
  l.pools = l.pools.map((p) => ({ ...p, col: p.col ?? acc }));
  if (!l.shade) l.shade = dark(base, 0.5);
}

export function bgApply(ctx, root, spec) {
  const S = bgSpec(bgQuery(spec));
  if (!S) return null;
  if (S.auto) autoColours(ctx, S);
  const look = bgLook(ctx, S.look), pass = bgPaintOver(root, look, S.paint);
  const v = new Vector3(), P = ctx.player, seal = ctx.seal;
  const hero = S.hero && P?.camera && seal?.chest;
  const at = ctx.scene.seal?.at ?? [0, 0, 0], parts = [];
  if (S.dress?.air?.length) { const air = bgAir(ctx, look, S.dress.air.map((e) => ({ ...e, at: [e.at[0] + at[0], e.at[1] + at[1], e.at[2] + at[2]] }))); root.add(air.group); parts.push(air); }
  if (S.dress?.fg?.length) { const fg = bgForeground(ctx, look, S.dress.fg); root.add(fg.group); parts.push(fg); }
  return {
    look, pass,
    update(t, dt, cue) {
      if (hero) {
        seal.chest(v);
        look.pool(1, { at: [v.x, v.y + 0.9, v.z + 1.2] });
        v.project(P.camera);
        look.u.uFocus.value.x = v.x * 0.5 + 0.5; look.u.uFocus.value.y = v.y * 0.5 + 0.5;
      }
      pass.refresh();
      for (const p of parts) p.update(t, dt, cue);
    },
    dispose() { look.dispose(); for (const p of parts) p.dispose?.(); },
  };
}
