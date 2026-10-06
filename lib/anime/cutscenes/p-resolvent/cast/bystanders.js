// FERN AND STARK (bible 3.10, 4.3): bystander seals in their true colours. Never power owners; they stand clear of the lens line.
// Fern  purple blunt-bang wig #6a3a8a / #3e2a58, dark brown hooded coat #3a2a28 / #1d1414, cream collar #efe4d2, staff #7a5a3a + gold finial.
// Stark spiky red wig #d8442a / #7a2018, red jacket #c4302a / #6a1a18, black collar shirt #1c1c26, brown shorts #4a3024, axe blade #bfc3d4.
// Pop at 1.9 + 0.1 / 0.3 s; braced (brows down) at the release 7.7; relieved after 9.0; egg 5 (11.0 to 13.2): the axe haft shivers, Fern grips tight.
import { pop, makeFig } from "./util.js";
import { FERN_AT, STARK_AT } from "./layout.js";

export function buildBystanders(ctx) {
  const { THREE, engine, kit } = ctx;
  const fig = makeFig(ctx);
  const group = new THREE.Group();
  const k = 0.8 * (ctx.seal.scale ?? 1);
  const face = (p) => Math.atan2(4 - p[0], 0 - p[2]); // toward the standoff (hero at 0, Aura at +x): the middle of the court

  const fern = kit.costumedSeal(engine, {
    scale: k,
    layers: [{ type: "coat", col: "#3a2a28", shade: "#1d1414", open: 0.05, collar: "#efe4d2" }, { type: "cloak", col: "#3a2a28", shade: "#1d1414", len: 0.45, collar: "high" }],
    hair: kit.defineHair("long", { seed: 31, count: 22, color: { base: "#6a3a8a", shade: "#3e2a58", hi: "#a070c8" }, cut: { at: [0.4, 0.7], slant: 0.1, rate: 0.8 },
      fringe: { n: 4, length: 0.14, at: [0, 0.8, 0.22], sweep: [0, -0.4, 0.6], width: 0.09 } }),
    weapon: { kind: "staff", hand: "r", col: "#7a5a3a", trim: "#e6b84a", gem: "#e6b84a" },
    eyes: { style: "tareme", iris: "#b090d8", irisLo: "#5a3a80" },
  });
  const stark = kit.costumedSeal(engine, {
    scale: k,
    layers: [{ type: "coat", col: "#c4302a", shade: "#6a1a18", open: 0.09, collar: "#1c1c26" }, { type: "sash", col: "#4a3024", shade: "#2a1810" }],
    hair: kit.defineHair("spiky", { seed: 5, count: 5, layers: 1, length: [0.16, 0.26], color: { base: "#d8442a", shade: "#7a2018", hi: "#ff8a5a" }, cut: { at: [0.4, 0.7], slant: 0.1, rate: 0.9 } }),
    eyes: { style: "round", iris: "#6a8ad0", irisLo: "#2a3a70" },
  });
  // Stark's axe: haft + blade, leaned at his right
  const axe = new THREE.Group();
  axe.add(fig(new THREE.CylinderGeometry(0.014, 0.016, 0.7, 8), "#4a3024", "#2a1810", { pos: [0, 0.3, 0] }),
    fig(new THREE.BoxGeometry(0.2, 0.15, 0.018), "#bfc3d4", "#6a7088", { pos: [0.1, 0.58, 0] }));
  axe.position.set(0.3, 0.0, 0.2);
  stark.props.add(axe);
  const staff = fern.props.children[fern.props.children.length - 1]; // the weapon prop (added last)
  fern.place(...FERN_AT, face(FERN_AT));
  stark.place(...STARK_AT, face(STARK_AT));
  group.add(fern.group, stark.group);

  return {
    group,
    update(t, dt) {
      const R = 7.7, tp = 1.9, egg0 = 11.0;
      for (const [h, delay] of [[fern, 0.1], [stark, 0.3]]) {
        const P = pop(t, tp + delay, 0.25, 1.15);
        h.group.visible = P > 0.001;
        if (!h.group.visible) continue;
        let e = "neutral", ek = 1;
        if (t >= R - 0.3) { e = "rage"; ek = 0.5; } // braced: brows down
        if (t >= R + 1.3) { e = "calm"; ek = 0.9; } // relieved
        h.react("terror", 0);
        h.expression(e, ek);
        h.update(t, dt);
        h.group.scale.setScalar(h.scale * P);
        const since = t - R; // the release rocks them; they brace, never fall
        if (since > 0) h.body.rotation.x += -0.12 * Math.exp(-since * 2.5) * Math.sin(Math.min(since, 1) * 3);
      }
      stark.body.rotation.z += 0.12; // leans on the axe
      const egg = t >= egg0 && t <= 13.2 ? 1 : 0; // egg 5: shiver and grip
      axe.rotation.z = egg * 0.06 * Math.sin(t * 61);
      axe.position.x = 0.3 + egg * 0.004 * Math.sin(t * 73);
      if (staff) staff.rotation.z = egg * 0.03 * Math.sin(t * 47);
      fern.body.scale.y *= 1 - egg * 0.01; // the grip: a hair of compression
    },
    dispose() { fern.dispose(); stark.dispose(); },
  };
}
