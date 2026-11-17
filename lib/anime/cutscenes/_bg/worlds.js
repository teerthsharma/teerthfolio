// The gallery worlds. Each is (ctx, group, { bg, throneWorld, parts }) -> { update?, dispose? }; they use only the kit calls a builder would use.
import { Vector3 } from "three";

const aim = (a, d) => [Math.sin(a) * d, 0, -Math.cos(a) * d];

function shibuya(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.35, 0.7, 0.6], col: "#ff9c78" }, shade: "#4a2450", amb: "#6a2a4a", bands: [3, 0.05],
    base: { dark: 0.6, h: 9, grime: 0.5 }, haze: { col: "#40101e", k: 0.0052, start: 14, h: 34, amt: 0.95 },
    rim: { dir: [0, 0.25, -1], col: "#ff5a30", k: 1.0, lo: 0.5, hi: 0.9 }, focus: { at: [0.5, 0.3], r: 0.3, k: 0.5 },
    pools: [{ at: [0, 4, -40], col: "#ff3a18", r: 30, k: 0.9 }, { at: [0.4, 1.5, 1.0], col: "#ff8a5a", r: 4, k: 0.55 }, { at: [-9, 5, -14], col: "#ff2a3a", r: 14, k: 0.6 }],
  });
  parts.push(look);
  group.add(bg.sky(ctx, "domain", { az: [-1.4, 1.4], el: [-0.25, 1.1], ppr: 640, focus: { az: 0, el: 0.13 } }));
  group.add(bg.rank(ctx, look, "shrine", { k: 0.15, dark: "#12040a", mid: "#3a0a14", rim: "#ff5a2a", rimK: 1.4, at: [0, 34, -118], size: [110, 66], w: 1024, h: 614, seed: 4 }));
  for (const [i, k] of [[0, 0.55], [1, 0.8]]) group.add(bg.rank(ctx, look, "skyline", { k, dark: "#1a0a14", mid: "#3a1424", rim: "#ff4a3a", glow: "#ffb888", at: [0, 24 - i * 3, -150 - i * 45], size: [420, 100], w: 2048, h: 488, density: 26, lit: 0.22, seed: 5 + i }));
  const blocks = bg.layout(ctx.rng(21), { half: 14, z0: -90, z1: 10, hMin: 24, hMax: 52, rows: 2 }).filter((s) => s.x > 0 || s.z < -48);
  const city = bg.city(ctx, look, {
    blocks, seed: 21, ink: 0.7,
    paint: { wall0: "#2a2438", wall1: "#44305a", trim: "#c8a8b8", litA: "#ffd8a0", litB: "#f4efe2", litC: "#ff9a8a", sign0: "#ff1a38", sign1: "#f4efe2", sign2: "#ff6a3a", sky0: "#3a0a14", sky1: "#9a1a30", night: 1, lit: 0.3, signs: 0.35, bay: 1.0 },
  });
  group.add(city.group); parts.push(city);
  group.add(bg.ground(ctx, look, { kind: "asphalt", size: 700, puddles: 0.4, scale: 1, palette: { g0: "#1c1226", g1: "#2a1830", g2: "#5a3040", g3: "#a89898", refl: "#ff3a28" }, road: { half: 14, zebra: [-3, 3], stripe: 0.4 } }));
  const air = bg.air(ctx, look, [{ kind: "mist", at: [0, 2.2, -16], size: [70, 7], col: "#d04a58", k: 0.7, seed: 2 }, { kind: "mist", at: [-5, 1.4, -7], size: [40, 4], col: "#e05a60", k: 0.55, seed: 5 }]);
  group.add(air.group); parts.push(air);
  const fg = bg.foreground(ctx, look, [{ shot: 1, kind: "rubble", side: "bl", size: 0.16, dist: 1.1, dark: "#0c0408", mid: "#3a1018", rim: "#ff4a2a", rimK: 1.3 }, { shot: 1, kind: "cables", side: "t", size: 0.3, dist: 1.2, dark: "#080206", mid: "#200a10", rim: "#ff4a2a" }]);
  group.add(fg.group); parts.push(fg);
  return {};
}

function throne(ctx, group, { bg, throneWorld, parts }) {
  const w = throneWorld(ctx); group.add(w.group); parts.push(w);
  const look = bg.look(ctx, {
    light: { dir: [0.5, 0.8, -0.3], col: "#d8c8ff" }, shade: "#3a2e78", amb: "#4a3a98", bands: [3, 0.05],
    base: { dark: 0.55, h: 8, grime: 0.4 }, haze: { col: "#1a1030", k: 0.012, start: 8, h: 40, amt: 0.9 },
    rim: { dir: [0, 0.3, 1], col: "#e8b050", k: 1.0 }, focus: { at: [0.5, 0.45], r: 0.3, k: 0.55 },
    pools: [{ at: [-3.6, 5.2, -1], col: "#7a98e8", r: 9, k: 0.55 }, { at: [3.6, 5.2, -1], col: "#7a98e8", r: 9, k: 0.55 }, { at: [0, 6.2, 4.5], col: "#8aa8f0", r: 10, k: 0.6 }, { at: [0, 5.0, 10], col: "#ffc860", r: 9, k: 1.1 }],
  });
  parts.push(look);
  const pass = bg.paintOver(group, look, { footH: 7, foot: 0.7, mode: "dark" });
  return { update() { pass.refresh(); } };
}

function dayCity(ctx, group, { bg, parts }, wide) {
  const look = bg.look(ctx, {
    light: { dir: [0.45, 0.65, 0.55], col: "#fff2dc" }, shade: "#6a82c0", amb: "#8cb0e8", bands: [3, 0.05],
    base: { dark: 0.4, h: 6, grime: 0.4 }, haze: { col: "#b8d4f2", k: 0.0042, start: 10, h: 70, amt: 0.92 },
    rim: { dir: [-0.3, 0.4, -1], col: "#fff0c8", k: 0.7 },
  });
  parts.push(look);
  group.add(bg.sky(ctx, "day", { az: [-1.3, 1.3], el: [-0.25, 1.15], ppr: 640 }));
  for (const [i, k] of [[0, 0.5], [1, 0.78]]) group.add(bg.rank(ctx, look, "skyline", { k, dark: "#5a6a8a", mid: "#9ab0d0", rim: "#fff2c0", glow: "#ffffff", lit: 0.1, at: [0, 26 - i * 4, -170 - i * 60], size: [460, 110], w: 2048, h: 490, density: 24, seed: 8 + i }));
  const city = bg.city(ctx, look, {
    avenue: { half: 9, z0: -110, z1: 14, hMin: 22, hMax: 58 }, seed: 5, ink: 0.7,
    paint: { wall0: "#b4b0b8", wall1: "#e2d8cc", trim: "#f4f0ec", litA: "#fff2c8", litB: "#ffffff", litC: "#ffe8c0", sign0: "#e83a4a", sign1: "#ffd23a", sign2: "#2a8ae8", sky0: "#a8cdf0", sky1: "#3a78d0", night: 0, lit: 0, signs: 0.25, bay: 1.2 },
  });
  group.add(city.group); parts.push(city);
  group.add(bg.ground(ctx, look, { kind: "asphalt", size: 700, puddles: 0, palette: { g0: "#6a7080", g1: "#8a90a0", g2: "#c8c8d0", g3: "#f4f4f8", refl: "#a8cdf0" }, road: { half: 9, zebra: [-4, 2], stripe: 0.8 } }));
  const fg = bg.foreground(ctx, look, [{ shot: 1, kind: "leaves", side: "tl", size: 0.6, dark: "#0e2a14", mid: "#3a8a3a", rim: "#e8ffa0", rimK: 0.45 }, { shot: 1, kind: "leaves", side: "tr", size: 0.45, dark: "#0e2a14", mid: "#3a7a34", rim: "#e8ffa0", rimK: 0.45, flip: true, seed: 9 }]);
  group.add(fg.group); parts.push(fg);
  return {};
}

function classroom(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.9, 0.45, 0.15], col: "#fff0d8" }, shade: "#7a8ab8", amb: "#c0d0e8", bands: [3, 0.06],
    base: { dark: 0.3, h: 1.5, grime: 0.3 }, haze: { col: "#dfe6ec", k: 0.004, start: 6, h: 6, amt: 0.4 },
    rim: { dir: [1, 0.3, 0], col: "#fff4d8", k: 0.8 },
  });
  parts.push(look);
  const room = bg.room(ctx, look, { kind: "classroom", w: 9, d: 11, h: 3.2, glow: "#fff1d0", lamps: 2 });
  group.add(room.group); parts.push(room);
  return {};
}

function hall(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.3, 0.8, 0.5], col: "#ffd8a0" }, shade: "#4a3a78", amb: "#5a4a88", bands: [3, 0.05],
    base: { dark: 0.6, h: 7, grime: 0.5 }, haze: { col: "#20182c", k: 0.014, start: 6, h: 24, amt: 0.85 },
    rim: { dir: [0, 0.3, -1], col: "#ff9a50", k: 0.9 },
  });
  parts.push(look);
  const air = bg.air(ctx, look, [{ kind: "shafts", at: [4, 22, -22], dir: [-0.15, -1, 0.35], len: 26, w: 3, n: 5, col: "#ffd8a0", k: 0.5 }]);
  group.add(air.group); parts.push(air);
  const room = bg.room(ctx, look, { kind: "hall", w: 20, d: 50, h: 26, columns: 6, glow: "#ffcf80", lamps: 3, stone: { colors: { st0: "#7a7898", st1: "#4a4868", mortar: "#100e1a", moss: "#3a5a3a" } } });
  group.add(room.group); parts.push(room);
  return {};
}

function night(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.4, 0.6, 0.6], col: "#9ab0ff" }, shade: "#32408a", amb: "#3a4a9a", bands: [3, 0.05],
    base: { dark: 0.55, h: 8, grime: 0.5 }, haze: { col: "#2a2050", k: 0.0055, start: 12, h: 40, amt: 0.9 },
    rim: { dir: [0, 0.3, -1], col: "#ff9a60", k: 0.9 },
    pools: [{ at: [4, 4.5, 3], col: "#ffb870", r: 10, k: 1.0 }, { at: [-5, 3, -4], col: "#ff4a8a", r: 12, k: 0.9 }, { at: [3, 5, -14], col: "#40d0ff", r: 14, k: 0.7 }],
  });
  parts.push(look);
  group.add(bg.sky(ctx, "night", { az: [-1.4, 1.4], el: [-0.25, 1.15], ppr: 640, sun: { az: -0.7, el: 0.6, size: 0.04 } }));
  for (const [i, k] of [[0, 0.5], [1, 0.75]]) group.add(bg.rank(ctx, look, "skyline", { k, dark: "#0a0a20", mid: "#241e4a", rim: "#ff9a60", glow: "#ffd890", lit: 0.28, at: [0, 24 - i * 3, -150 - i * 50], size: [440, 100], w: 2048, h: 466, density: 26, seed: 12 + i }));
  const city = bg.city(ctx, look, { avenue: { half: 9, z0: -90, z1: 14, hMin: 22, hMax: 60 }, seed: 31, ink: 0.7,
    paint: { wall0: "#2a2e4a", wall1: "#443a62", trim: "#9a9ac0", litA: "#ffd890", litB: "#cfe8ff", litC: "#9affd8", sign0: "#ff2a6a", sign1: "#ffe8a0", sign2: "#40d0ff", sky0: "#1a2050", sky1: "#4a5a9a", night: 1, lit: 0.5, signs: 0.5, bay: 1.1 } });
  group.add(city.group); parts.push(city);
  group.add(bg.ground(ctx, look, { kind: "asphalt", size: 700, puddles: 0.4, palette: { g0: "#1c2036", g1: "#2c3250", g2: "#5a5a7a", g3: "#c8cce0", refl: "#ffb870" }, road: { half: 9, zebra: [-5, 3], stripe: 0.9 } }));
  return {};
}

function storm(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.3, 0.8, 0.4], col: "#cfd8ff" }, shade: "#3a4a78", amb: "#5a6a98", bands: [3, 0.05],
    base: { dark: 0.5, h: 5, grime: 0.5 }, haze: { col: "#6a7a96", k: 0.0045, start: 10, h: 30, amt: 0.9 },
    rim: { dir: [0, 0.4, -1], col: "#cfe0ff", k: 0.9 },
  });
  parts.push(look);
  group.add(bg.sky(ctx, "storm", { az: [-1.4, 1.4], el: [-0.25, 1.15], ppr: 640, flash: 0.2 }));
  group.add(bg.rank(ctx, look, "ruins", { k: 0.5, dark: "#10141c", mid: "#3a4458", rim: "#cfe0ff", at: [0, 14, -90], size: [260, 60], w: 2048, h: 472, density: 12, seed: 6 }));
  group.add(bg.rank(ctx, look, "mountains", { k: 0.75, dark: "#1a2030", mid: "#4a5a76", rim: "#cfe0ff", at: [0, 30, -260], size: [700, 120], w: 2048, h: 350, density: 6, seed: 3 }));
  group.add(bg.ground(ctx, look, { kind: "paving", size: 700, puddles: 0.9, scale: 0.8, palette: { g0: "#5a6070", g1: "#3a4050", g2: "#10141c", g3: "#cfe0ff", refl: "#8aa0c8" } }));
  return {};
}

function sea(ctx, group, { bg, parts }) {
  const look = bg.look(ctx, {
    light: { dir: [0.2, 0.3, -0.8], col: "#ffc890" }, shade: "#4a5a98", amb: "#7a7ab8", bands: [3, 0.06],
    base: { dark: 0.2, h: 3, grime: 0.1 }, haze: { col: "#f0b890", k: 0.0042, start: 20, h: 18, amt: 0.8 },
    rim: { dir: [0, 0.2, -1], col: "#ffd0a0", k: 1.0 },
  });
  parts.push(look);
  group.add(bg.sky(ctx, "dusk", { az: [-1.4, 1.4], el: [-0.25, 1.15], ppr: 640, sun: { az: 0.1, el: 0.07, size: 0.05 } }));
  group.add(bg.water(ctx, look, { colors: { w0: "#2a3a78", w1: "#d86a70", sky0: "#ffd890", sky1: "#6a4a98", foam: "#fff4e0" }, scale: 0.4, height: 0.7, glint: 1.0 }));
  group.add(bg.rank(ctx, look, "mountains", { k: 0.7, dark: "#3a2a58", mid: "#8a5a8a", rim: "#ffd0a0", at: [0, 24, -300], size: [800, 110], w: 2048, h: 282, density: 5, seed: 8 }));
  return {};
}

export const WORLDS = {
  shibuya, shibuyaWide: shibuya, throne, throneLow: throne, day: (c, g, o) => dayCity(c, g, o), dayWide: (c, g, o) => dayCity(c, g, o, true),
  classroom, hall, night, storm, sea,
};
