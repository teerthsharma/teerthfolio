// The 12 rivals of the Fourth War as SMALL COSTUMED SEALS (bible E15 + section 4). Data plus the prop builders; the
// choreography is in index.js. Hex values are the bible's. Every rival gets one fan-nameable silhouette item.
// hit: seconds (scene clock) the wheel reaches the rival (Gilgamesh first; the Assassins staggered 0,3,6,9 frames = 0.125 s steps).
// lat: lateral offset in chariot-metres (+ = the seal's right); side: the way the fling goes; kind: reaction after landing.
// idle: [pose, k] held while waiting. extras: names of the prop builders in makeProps() below.
const BL = (base, shade, hi) => ({ color: { base, shade, hi } });
export const RIVALS = [
  { id: "gilgamesh", hit: 8.9, lat: -1.3, side: -1, kind: "kneel", idle: ["salute", 1], expr: "smug", spin: 1,
    spec: { layers: [{ type: "uniform", col: "#c8102e", shade: "#6a0a1c", collar: false }, { type: "armour", col: "#ffcf3a", shade: "#b8741a", trim: "#fff6b8" }],
      hair: ["spiky", { count: 14, ...BL("#f2d878", "#b89a48", "#fff6c8") }], eyes: { style: "tsurime", iris: "#d62a2a", irisLo: "#7a0a14" } }, extras: ["gate"] },
  { id: "saber", hit: 9.3, lat: 1.6, side: 1, kind: "fallen", idle: ["stand", 0], expr: "calm", spin: 1,
    spec: { layers: [{ type: "cape", col: "#2f5fb8", shade: "#16306a", trim: "#c8d0dc" }, { type: "armour", col: "#c8d0dc", shade: "#6a7088", trim: "#2f5fb8" }, { type: "sash", col: "#fbf5ea", knot: "#e8c030" }],
      hair: ["swept", BL("#f2e08c", "#b8a050", "#fffbd0")], weapon: { kind: "sword", hand: "r", col: "#dff0ff", tilt: [0.9, 0] }, eyes: { style: "round", iris: "#3a9a5a", irisLo: "#1a5a30" } },
    extras: ["saberBun", "saberAhoge", "plate3244"] },
  { id: "lancer", hit: 9.7, lat: -2.6, side: -1, kind: "kneel", idle: ["stand", 0], expr: "rage", spin: 1,
    spec: { layers: [{ type: "uniform", col: "#1f3a2f", shade: "#0c1a14", buttons: "#6a4a2a" }, { type: "sash", col: "#6a4a2a" }],
      hair: ["swept", BL("#2a1c1c", "#120a0a", "#5a4040")], weapon: { kind: "spear", hand: "r", col: "#6a3a2a", trim: "#d62a2a" }, eyes: { style: "tareme", iris: "#d8c030", irisLo: "#7a6a10" } },
    extras: ["lancerSpear2", "mole"] },
  { id: "berserker", hit: 10.1, lat: 3.0, side: 1, kind: "fallen", idle: ["bow", 0.55], expr: "rage", spin: 1,
    spec: { layers: [{ type: "armour", col: "#14141c", shade: "#050508", trim: "#2a2a44" }, { type: "cloak", col: "#14141c", shade: "#050508", len: 0.8, collar: true }],
      hat: { kind: "helmet", col: "#14141c", shade: "#050508", trim: "#2a2a44" }, weapon: { kind: "broadsword", hand: "r", col: "#3a3a52", trim: "#14141c" } },
    extras: ["visorSlit", "mist"] },
  { id: "caster", hit: 10.5, lat: -1.8, side: -1, kind: "cower", idle: ["terror", 0.6], expr: "awe", spin: 1.2,
    spec: { layers: [{ type: "cloak", col: "#3a7a4a", shade: "#173a24", len: 1, collar: "high" }, { type: "scarf", col: "#e8c030", shade: "#8a6a10" }],
      hair: "bald", eyes: { style: "ring", iris: "#ffe36a", irisLo: "#c8a020", irisScale: 1.15 } }, extras: ["spellbook"] },
  { id: "kiritsugu", hit: 11.0, lat: 0.9, side: 1, kind: "fallen", idle: ["kneel", 0.55], expr: "calm", spin: 0,
    spec: { layers: [{ type: "coat", col: "#1a1620", shade: "#08060c", open: 0.06, collar: true }, { type: "scarf", col: "#f4efe4", shade: "#a8a0a0" }],
      hair: ["slick", BL("#1a1a22", "#08080c", "#4a4a5a")], eyes: { style: "round", iris: "#2a2a30", irisLo: "#0a0a10" } }, extras: ["smg"] },
  { id: "kirei", hit: 11.4, lat: -3.4, side: -1, kind: "kneel", idle: ["stand", 0], expr: "calm", spin: 1.5,
    spec: { layers: [{ type: "coat", col: "#1e1a26", shade: "#08060e", open: 0.03, collar: true }, { type: "sash", col: "#ffc926" }],
      hair: ["slick", BL("#3a2a2a", "#18100e", "#7a5a50")], eyes: { style: "slit", iris: "#4a2a2a", irisLo: "#1a0a0a" } }, extras: ["cross", "keys"] },
  { id: "tokiomi", hit: 11.9, lat: 2.3, side: 1, kind: "fallen", idle: ["salute", 1], expr: "smug", spin: 0, stumble: true,
    spec: { layers: [{ type: "coat", col: "#c8102e", shade: "#5a0818", open: 0.05, collar: true, trim: "#ffc926" }, { type: "scarf", col: "#ffc926", shade: "#a87a10" }],
      hair: ["swept", BL("#5a3a2a", "#2a1810", "#9a6a4a")], eyes: { style: "tsurime", iris: "#2f8cff", irisLo: "#1050a0" } }, extras: ["beard", "gemCane"] },
  ...[0, 1, 2, 3].map((j) => ({ id: `assassin${j + 1}`, hit: 9.9 + 0.125 * j, lat: [1.0, -1.0, 3.6, -3.6][j], side: j % 2 ? -1 : 1, kind: "fallen",
    idle: [["kneel", "cower", "bow", "kneel"][j], [0.5, 0.3, 0.6, 0.8][j]], expr: "calm", spin: 1,
    spec: { layers: [{ type: "cloak", col: "#14141c", shade: "#050508", len: 1, collar: "high", spread: 1.05 }], hair: "bald", accessories: [{ kind: "mask", col: "#f4efe4" }],
      eyes: { style: "blank", iris: "#14141c", irisLo: "#000000" }, weapon: { kind: "sword", hand: "r", col: "#cdd4e0", tilt: [1.2, 0] } },
    extras: ["dagger"] })),
];

// The extra props: name -> () => { obj, update?(ts, fl) } (fl = seconds since this rival was hit, negative before).
// Built with the shared sdf paint + engine.figure; added to the rival's group so the whole-body pose does not deform them.
export function makeProps(ctx) {
  const { THREE: T, engine, sdf } = ctx;
  const fig = (geo, col, shade, pos, rot, lm = 0.9) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: 1 })), { lineMul: lm, constant: true });
    f.position.set(...pos); if (rot) f.rotation.set(...rot); return f;
  };
  const W = ctx.kit.WEAPONS;
  return {
    // Gate of Babylon (egg 7): a gold ring with an inner disc behind him and one spinning blade
    gate: () => {
      const g = new T.Group(), ring = fig(new T.TorusGeometry(0.5, 0.035, 8, 40), "#ffb02a", "#a86a10", [0, 0.55, -0.36]);
      const disc = fig(new T.CylinderGeometry(0.44, 0.44, 0.012, 32).rotateX(Math.PI / 2), "#ffcf3a", "#b8741a", [0, 0.55, -0.37]);
      const blade = fig(new T.BoxGeometry(0.05, 0.5, 0.015), "#eef6ff", "#4a5f8a", [0, 0.55, -0.3]);
      g.add(disc, ring, blade);
      return { obj: g, update: (ts) => { ring.rotation.z = ts * 1.5; blade.position.set(Math.sin(ts * 3) * 0.34, 0.55 + Math.cos(ts * 3) * 0.34, -0.3); blade.rotation.z = -ts * 3; } };
    },
    saberBun: () => ({ obj: fig(new T.SphereGeometry(0.075, 12, 10), "#f2e08c", "#b8a050", [0, 0.72, -0.2]) }),
    saberAhoge: () => ({ obj: fig(new T.ConeGeometry(0.02, 0.15, 6), "#f2e08c", "#b8a050", [0, 0.86, 0.1], [0.4, 0, 0]) }),
    // egg 4: the 3244 sash as four alternating badge tiles (no text in the world: show, don't tell)
    plate3244: () => {
      const g = new T.Group();
      for (let i = 0; i < 4; i++) g.add(fig(new T.BoxGeometry(0.035, 0.05, 0.012), i % 2 ? "#fbf5ea" : "#ffc926", "#a87a10", [-0.075 + i * 0.05, 0.18, 0.352], null, 0.5));
      return { obj: g };
    },
    // Lancer's second (yellow) spear: crossed in the left hand, flung up and tumbling on the hit
    lancerSpear2: () => {
      const s = W.spear(engine, { col: "#6a4a2a", trim: "#e8c030" });
      return { obj: s, update: (ts, fl) => {
        if (fl > 0) { s.position.set(-0.27, 0.28 + 1.4 * Math.sin(Math.min(1, fl / 1.1) * Math.PI), 0.25); s.rotation.set(fl * 5, 0, 0.7 + fl * 9); }
        else { s.position.set(-0.27, 0.28, 0.25); s.rotation.set(0, 0, 0.7); }
      } };
    },
    mole: () => ({ obj: fig(new T.SphereGeometry(0.014, 6, 6), "#2a1c1c", "#2a1c1c", [0.11, 0.5, 0.278], null, 0.3) }),
    visorSlit: () => ({ obj: fig(new T.BoxGeometry(0.2, 0.022, 0.012), "#d62a2a", "#7a0a0a", [0, 0.585, 0.285], null, 0.3) }),
    // mist trailing from the Berserker: dark puffs drifting behind (local -z)
    mist: () => {
      const g = new T.Group(), p = [];
      for (let i = 0; i < 5; i++) { const m = fig(new T.SphereGeometry(0.09 + i * 0.012, 10, 8), "#2a2a44", "#14141f", [0, 0.1, -0.3], null, 0.4); g.add(m); p.push(m); }
      return { obj: g, update: (ts, fl) => p.forEach((m, i) => m.position.set(Math.sin(ts * 3 + i * 1.7) * 0.14, 0.12 + 0.06 * i + Math.sin(ts * 4 + i) * 0.03, -0.3 - i * 0.14 * (fl > 0 ? 1.5 : 0.9))) };
    },
    // Caster's spellbook: clutched, then spinning away when he is flung
    spellbook: () => {
      const b = W.book(engine, { col: "#6a2a44" });
      return { obj: b, update: (ts, fl) => {
        if (fl > 0) { b.position.set(0.1 * fl, 0.3 + 1.2 * Math.sin(Math.min(1, fl) * Math.PI), 0.3); b.rotation.set(fl * 6, fl * 8, 0); }
        else { b.position.set(0, 0.2, 0.3); b.rotation.set(0, 0, 0); }
      } };
    },
    smg: () => { const g = W.pistol(engine, { col: "#6a6a7a" }); g.scale.setScalar(1.7); g.position.set(0.22, 0.26, 0.3); return { obj: g }; },
    cross: () => {
      const g = new T.Group();
      g.add(fig(new T.BoxGeometry(0.03, 0.14, 0.012), "#ffc926", "#a87a10", [0, 0.33, 0.325], null, 0.5), fig(new T.BoxGeometry(0.09, 0.03, 0.012), "#ffc926", "#a87a10", [0, 0.36, 0.325], null, 0.5));
      return { obj: g };
    },
    // three black keys per hand, fanned
    keys: () => {
      const g = new T.Group();
      for (const s of [1, -1]) for (let k = 0; k < 3; k++) g.add(fig(new T.BoxGeometry(0.014, 0.17, 0.008), "#14141c", "#050508", [s * 0.29 + (k - 1) * 0.03 * s, 0.34, 0.27], [0, 0, s * (0.5 + (k - 1) * 0.35)], 0.5));
      return { obj: g };
    },
    beard: () => ({ obj: fig(new T.ConeGeometry(0.08, 0.14, 8), "#5a3a2a", "#2a1810", [0, 0.46, 0.24], [Math.PI * 0.88, 0, 0]) }),
    gemCane: () => { const g = W.wand(engine, { col: "#4a3322", gem: "#2f8cff" }); g.scale.setScalar(2.4); g.position.set(0.28, 0.26, 0.28); g.rotation.set(0.5, 0, -0.2); return { obj: g }; },
    dagger: () => { const g = W.sword(engine, { col: "#cdd4e0" }); g.scale.set(0.5, 0.45, 0.5); g.position.set(-0.27, 0.28, 0.25); g.rotation.set(1.1, 0, 0); return { obj: g }; },
  };
}
