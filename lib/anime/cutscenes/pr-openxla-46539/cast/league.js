// THE LEAGUE: small seals in League of Villains costume (L6b), built with costumed-seal-kit. All stand behind the Nomu, facing the seal.
//  Shigaraki  grey hoodie #8a8a96 (coat layer, hood collar), 5 blue spiky clumps #8a98b8, a hand mask #e8d8c0 (a small flipper cover), smug eyes.
//  Kurogiri   black mist scarf #1a1620 + neck metal plate #8a8a96, yellow slit eyes #ffcf20, floats, mist wisps orbit the neck.
//  Goons x4   grey-black jackets #333b4f with red trim #c82020, plain masks, short knives, braced.
// Reactions (bible, 24 fps): the dome reaches a seal d / 66.7 m/s after the strike (40 m in 0.6 s). Shigaraki gloats 0-4 f then tumbles back
// 3 m over 4-12 f; goons tumble over 6 f; Kurogiri's mist scatters outward at the dome and he flinches. Afterwards each lies fallen.
import { fig, makeFrame, smooth, clamp01, startOf } from "./common.js";
import { NOMU_F } from "./nomu.js";

const DOME_V = 40 / 0.6;
const knife = (ctx) => {
  const T = ctx.THREE, g = new T.Group();
  g.add(fig(ctx, new T.BoxGeometry(0.02, 0.2, 0.006), "#cdd4e0", "#8a90a0", { pos: [0, 0.14, 0] }), fig(ctx, new T.CylinderGeometry(0.014, 0.014, 0.08, 8), "#1d1822", "#1d1822", { pos: [0, 0.0, 0] }));
  g.position.set(0.27, 0.28, 0.25); g.rotation.set(0.4, 0, -0.5);
  return g;
};

export default function league(ctx, frame = makeFrame(ctx)) {
  const { THREE, kit, engine } = ctx, S = frame.S, group = new THREE.Group(), members = [];
  const hair = (base, shade, hi, o = {}) => kit.defineHair("spiky", { color: { base, shade, hi }, ...o });
  const stand = (f, r) => frame.F(NOMU_F + f, r, 0);
  const add = (h, p, o) => {
    h.lookAtPoint(frame.a[0], frame.a[2]);
    const yaw = h.group.rotation.y;
    h.place(p[0], p[1], p[2], yaw); group.add(h.group);
    members.push({ h, p, yaw, ...o });
  };

  // ---- Shigaraki
  const shig = kit.costumedSeal(engine, { scale: 0.8 * S, coat: "#8e8c98", shade: "#5a5a68",
    layers: [{ type: "coat", col: "#8a8a96", shade: "#4a4a58", open: 0.03, collar: true }],
    hair: hair("#8a98b8", "#4a5878", "#c0d0e8", { count: 5, layers: 1, length: [0.16, 0.26], width: 0.09 }),
    eyes: { style: "tsurime", iris: "#d8283a", irisLo: "#7a1020" } });
  const mask = new THREE.Group();
  mask.add(fig(ctx, new THREE.SphereGeometry(0.07, 12, 8), "#e8d8c0", "#b8a890", { pos: [0.13, 0.5, 0.24], scale: [1, 1.15, 0.5], rot: [0, 0.3, 0.2] }));
  for (let i = 0; i < 4; i++) mask.add(fig(ctx, new THREE.ConeGeometry(0.014, 0.07, 6), "#e8d8c0", "#b8a890", { pos: [0.1 + i * 0.025, 0.575 + (i % 2) * 0.008, 0.26], rot: [0.2, 0, -0.5 + i * 0.3], lineMul: 0.6 }));
  shig.props.add(mask);
  add(shig, stand(2.4, 1.3), { role: "shig", delay: 4 / 24, dur: 8 / 24, away: 3 });

  // ---- Kurogiri: floats; the mist wisps are small dark puffs on his body group
  const kuro = kit.costumedSeal(engine, { scale: 0.85 * S, coat: "#1a1620", shade: "#0a0810",
    layers: [{ type: "scarf", col: "#2a2438", shade: "#0e0b16" }, { type: "cloak", col: "#1a1620", shade: "#0a0810", len: 0.55, collar: "high" }],
    eyes: { style: "slit", iris: "#ffcf20", irisLo: "#ff8a20", size: [0.1, 0.1] } });
  kuro.props.add(fig(ctx, new THREE.TorusGeometry(0.2, 0.026, 8, 24).rotateX(Math.PI / 2), "#8a8a96", "#4a4a58", { pos: [0, 0.4, 0.02] }));
  const wisps = [], rnd = ctx.rng("kurogiri-mist");
  for (let i = 0; i < 12; i++) {
    const w = fig(ctx, new THREE.SphereGeometry(0.1 + rnd() * 0.07, 8, 6), "#241e30", "#0e0b16", { line: 0.6, lineMul: 0.5 });
    wisps.push({ w, a: (i / 12) * Math.PI * 2, y: 0.28 + rnd() * 0.3, r: 0.26 + rnd() * 0.14, ph: rnd() * 6.28, out: [rnd() - 0.5, rnd() * 0.6, rnd() - 0.5] });
    kuro.body.add(w);
  }
  add(kuro, stand(2.0, -1.8), { role: "kuro", delay: 0, dur: 0.3, away: 0.6, float: 0.35 * S });

  // ---- four goons, braced in a line behind
  const goonCols = [["#333b4f", "#1a2030"], ["#383d52", "#1c2234"], ["#2f3649", "#171c2c"], ["#363a4e", "#1a1e2e"]];
  [[3.8, -3.0], [4.3, -0.9], [4.0, 1.0], [4.6, 2.9]].forEach(([f, r], i) => {
    const g = kit.costumedSeal(engine, { scale: 0.78 * S, coat: "#8e8c98", shade: "#5a5a68",
      layers: [{ type: "uniform", col: goonCols[i][0], shade: goonCols[i][1], stripe: "#c82020", collar: "#c82020" }, { type: "sash", col: "#c82020", shade: "#5a1010" }],
      hair: "bald", accessories: [{ kind: "mask", col: i % 2 ? "#cfc8c0" : "#2a3a52" }],
      eyes: { style: "tsurime", iris: "#c8c8d0", irisLo: "#7a7a88" } });
    g.props.add(knife(ctx));
    add(g, stand(f, r), { role: "goon", delay: i * 0.02, dur: 0.25, away: 2.6 + (i % 2) * 0.8, tw: (i - 1.5) * 0.35 });
  });

  return {
    group,
    update(t, dt, cue) {
      const u0 = t - startOf(cue, "smash", 9.42), nomuP = frame.F(NOMU_F, 0, 0);
      for (const m of members) {
        const d = Math.hypot(m.p[0] - nomuP[0], m.p[2] - nomuP[2]), u = u0 - d / DOME_V - m.delay; // seconds since the dome reached this seal
        m.h.state.poses = {};
        let away = 0, y = m.float ? m.float + Math.sin(t * 3 + m.p[0]) * 0.03 : 0, expr = "neutral", ek = 0;
        if (m.role === "kuro") {
          if (u >= 0) { m.h.setPose("recoil", smooth(u / 0.15) * (1 - 0.5 * smooth((u - 0.4) / 0.4))); expr = "terror"; ek = 1; away = m.away * smooth(u / 0.3); y += 0.25 * smooth(u / 0.3); } else { expr = "smug"; ek = 0.8; }
        } else if (u < 0) {
          if (m.role === "shig") { expr = "smug"; ek = 1; if (u > -0.25) m.h.setPose("stagger", 0.15); } // gloats until the dome lands
        } else {
          const k = smooth(u / m.dur);
          away = m.away * k;
          m.h.setPose("blown", k * (u < m.dur ? 1 : 1 - clamp01((u - m.dur) / 0.2)));
          if (u > m.dur * 0.9) m.h.setPose("fallen", smooth((u - m.dur * 0.9) / 0.25));
          expr = u > m.dur ? "shut" : "terror"; ek = 1;
          y += 0.28 * Math.sin(Math.PI * clamp01(u / m.dur)) * (m.role === "goon" ? 1.1 : 1.3);
        }
        m.h.expression(expr, ek);
        const side = (m.tw ?? 0) * clamp01(u / m.dur) * 0.5;
        m.h.place(m.p[0] + frame.fwd[0] * away + frame.right[0] * side, m.p[1] + y, m.p[2] + frame.fwd[1] * away + frame.right[1] * side, m.yaw);
        m.h.update(t);
        if (m.role === "kuro") {
          const sc = u >= 0 ? clamp01(1 - (u - 0.05) / 0.5) : 1, push = u >= 0 ? smooth(u / 0.5) : 0;
          for (const w of wisps) {
            const a = w.a + t * 1.4, r = w.r * (1 + push * 3);
            w.w.position.set(Math.cos(a) * r + w.out[0] * push * 0.9, w.y + Math.sin(t * 3 + w.ph) * 0.03 + w.out[1] * push, Math.sin(a) * r * 0.7 + w.out[2] * push * 0.9);
            w.w.scale.setScalar(Math.max(0.001, sc * (1 + 0.15 * Math.sin(t * 5 + w.ph))));
          }
        }
      }
    },
    dispose() { for (const m of members) m.h.dispose(); },
  };
}
