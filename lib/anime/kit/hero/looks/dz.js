// WARDROBE test looks for the dress upscale (lab only): ?cut=_hero&look=dz&variant=<name>
import gojo from "./gojo.js";
import { variant } from "./_merge.js";

const base = variant(gojo, { acc: [], outfit: [] });
const o = (outfit, acc = [], hair) => variant(base, { outfit, acc, ...(hair ? { hair } : {}) });
const GOLD = "#d9b34a", GSH = "#7a5612";
export default o([{ kind: "uniform", col: "#1c1c2a", shade: "#0b0b14", trim: GOLD, buttons: 2, collar: "open", shirt: "#ebe7de", lapel: "#2c2c40" }]);
export const high = o([{ kind: "uniform", col: "#2c1e3a", shade: "#130a1c", trim: GOLD, buttons: 1, collar: "high", cuffAt: 0.05 }, { kind: "bands", col: "#1a120c" }]);
export const blazer = o([{ kind: "blazer", col: "#b8262c", shade: "#6a1418", lapel: "#c63a3e" }]);
export const vest = o([{ kind: "vest", col: "#d8c0a8", shade: "#9a8068", shirt: "#ffffff", trim: "#e8e0d0", collar: "v" }]);
export const tabard = o([{ kind: "tabard", col: "#2f4fb0", shade: "#16256a", panel: "#c42a2c", trim: GOLD }, { kind: "belt", col: GOLD, buckle: "#f0d070" }]);
export const gi = o([{ kind: "gi", col: "#e8771c", shade: "#9a4208", trim: "#2a50c0" }, { kind: "sash", col: "#2a50c0", shade: "#16306a" }, { kind: "bands", col: "#2a50c0", shade: "#16306a" }]);
export const tunic = o([{ kind: "tunic", col: "#d8cdb4", shade: "#8a7c60", belt: "#5a3c22" }]);
export const cloak = o([{ kind: "cloak", col: "#14161e", shade: "#07080c", trim: "#2a2d3c", motif: "clouds" }], [{ kind: "protector" }]);
export const haori = o([{ kind: "haori", col: "#f2efe6", shade: "#b0aa9c", trim: "#1a1a22", cuffTrim: "#1a1a22" }, { kind: "sash", col: "#2a3a6a" }], [{ kind: "protector", col: "#1b2438" }]);
export const mantle = o([{ kind: "mantle", col: "#f2efe6", shade: "#b4ad9e", trim: GOLD }, { kind: "choker", col: "#f2efe6" }], [{ kind: "earrings", drop: true, stud: true, col: GOLD, dropCol: "#c8283a" }]);
export const cape = o([{ kind: "cuirass", col: "#7a4a2a", shade: "#3a2010", trim: GOLD }, { kind: "cape", col: "#b0202a", shade: "#5a0a10", fur: "#efe6d4", trim: GOLD }]);
export const scarves = o([{ kind: "scarfX", col: "#c0202a", shade: "#6a1018" }, { kind: "sash", col: "#e8dcc0" }], [{ kind: "circlet", gem: "#2a7ad0" }]);
export const armour = o([{ kind: "collar", col: GOLD }, { kind: "plate", col: GOLD, shade: GSH, trim: "#f0d878" }, { kind: "armour", col: "#6a3a90", shade: "#341a50", trim: GOLD }, { kind: "bracers", col: GOLD, studs: true }, { kind: "belt", col: "#2a1a10", beads: "#e8e0d0" }], [{ kind: "headband", col: "#2a8a4a", heart: "#e86a8a" }, { kind: "studs", col: GOLD }]);
export const robe = o([{ kind: "robe", col: "#2a1a48", shade: "#120a24", trim: GOLD }, { kind: "cape", col: "#2a1a48", shade: "#120a24", trim: GOLD, clasp: GOLD }, { kind: "collar", col: GOLD }], [{ kind: "hood", col: "#35204f", shade: "#1a0f28", point: 0.18 }], { preset: "none" });
export const blind = o([{ kind: "uniform", col: "#1c1c2a", shade: "#0b0b14", trim: GOLD, buttons: 2, collar: "open" }], [{ kind: "blindfold", up: true, col: "#1d1a22" }, { kind: "glasses" }, { kind: "clip" }]);
const jk = { kind: "uniform", col: "#1c1c2a", shade: "#0b0b14", trim: GOLD, buttons: 2, collar: "open" };
export const props1 = o([jk, { kind: "prop", prop: "coin", hand: "R" }, { kind: "prop", prop: "notebook", hand: "L" }]);
export const props2 = o([jk, { kind: "prop", prop: "kunai3", hand: "R" }, { kind: "prop", prop: "pencil", hand: "L" }]);
export const props3 = o([jk, { kind: "prop", prop: "staff", hand: "R" }, { kind: "prop", prop: "cord", hand: "L" }]);
export const hoodie = o([{ kind: "robe", col: "#2a1a48", shade: "#120a24", trim: GOLD }], [{ kind: "hood", col: "#35204f", shade: "#1a0f28", point: 0.18 }, { kind: "studs", col: GOLD }], { preset: "none" });
