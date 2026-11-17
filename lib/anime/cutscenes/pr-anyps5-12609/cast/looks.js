// LOOKS for pr-anyps5-12609: the Vice seal (the kit look with the dock ink and both pairs of shades), the partner and the police guest.
import { Matrix4, Quaternion, SphereGeometry, Vector3, CylinderGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import base from "../../../kit/hero/looks/pr-anyps5-12609.js";
import { bandana, denim, palmPrint, shades } from "../../../kit/hero/looks/pr-anyps5-12609.parts.js";
import { variant } from "../../../kit/hero/looks/_merge.js";
import { cached, piece } from "../../../kit/hero/body.js";

export const INK = "#0b0a10";

// the hero: kit look, dock ink; the extras carry the shirt, denim, bandana and BOTH pairs of shades (toggled by the cast layer)
export const vice = variant(base, {
  fur: { ink: INK },
  outfit: base.outfit.map((o, i) => (i === 0 ? { ...o, ink: INK } : o)),
  extras: (engine, h) => {
    const up = h.attach(shades(engine, false), "head"), down = h.attach(shades(engine, true), "head");
    h.vice = { up, down };
    return [h.attach(denim(engine), "body"), h.attach(palmPrint(engine), "body"), h.attach(bandana(engine), "body"), up, down];
  },
});

// the partner: braids as two pigtails, a denim jacket over a red top, gold hoops
export const partner = {
  fur: { coat: "#9a96a6", shade: "#52506e", belly: "#f4e7cc", bellyShade: "#b9a0a0", nose: "#2a2328", ink: INK, blush: "#f08a6a" },
  eyes: { style: "round", iris: "#3a2418", size: 1.04, lash: "#1a1214" },
  mouth: { rest: "smile" },
  hair: { preset: "twintail", col: "#1c1416", shade: "#3a2a2c", hi: "#6a4a4a" },
  acc: [{ kind: "earrings", col: "#e8c06a" }],
  outfit: [
    { kind: "vest", col: "#d8404a", shade: "#8a2230", collar: "round", buttons: 0, hem: 0.1, folds: false, ink: INK },
    { kind: "jacket", col: "#4a6a96", shade: "#2c4668", trim: "#6a8ab4" },
  ],
  hands: { kind: "flipper", skin: "#9a96a6" },
  scale: 0.95,
};

// a peaked cap on the head field: a dome, a flat visor and a gold band (no lettering)
function capGeo() {
  return cached("vice|cap", () => {
    const dome = new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.215, 0.15, 0.21).translate(0, 0.205, -0.005);
    const band = new CylinderGeometry(0.212, 0.214, 0.03, 24).scale(1, 1, 0.98).translate(0, 0.215, -0.005);
    const visor = new SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.15, 0.022, 0.12).applyMatrix4(new Matrix4().compose(new Vector3(0, 0.215, 0.185), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.22), new Vector3(1, 1, 1)));
    const ni = (g) => (g.index ? g.toNonIndexed() : g);
    return mergeGeometries([piece(ni(dome), "#35507e", "#22314a"), piece(ni(band), "#c9b46a", "#8a7a3a"), piece(ni(visor), "#161f33", "#0c1220")]);
  });
}

// the guest: a small seal in a navy uniform, a plain gold star badge and a peaked cap
export const guest = {
  fur: { coat: "#8a8e9c", shade: "#464a66", belly: "#f4e7cc", bellyShade: "#b9a0a0", nose: "#2a2328", ink: INK, blush: "#f08a6a" },
  eyes: { style: "round", iris: "#2a2a30", size: 1, lash: "#1a1214" },
  brows: { thick: 1.5 },
  mouth: { rest: "w" },
  hair: null,
  outfit: [{ kind: "uniform", col: "#4f7ab8", shade: "#2e4a7a", trim: "#c9b46a", collar: "round", buttons: 2, hem: 0.12, ink: INK }],
  hands: { kind: "flipper", skin: "#8a8e9c" },
  scale: 1,
  extras: (engine, h) => {
    const fig = engine.figure(capGeo(), { ink: INK, lineMul: 1.2 });
    fig.userData.hull.uniforms.uConst.value = 1;
    return [h.attach(fig, "head")];
  },
};
