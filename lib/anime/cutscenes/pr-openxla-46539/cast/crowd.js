// CIVILIANS: six rooftop cheerers, small seals in plain clothes (L6b), each on a dark roof block with a red #c82020 railing so none float.
//  Shirts/jackets #ff8a20 #3a8a5a #2f6ab0 #ffffff (uniform layer), small hair tufts, a phone or a hero flag in the flipper, open-mouth "awe".
// Timing: stand and watch; duck ("cower") for frames 0-6 (0.25 s) when the dome reaches them (d / 66.7 m/s after the strike);
// cheer on twos from "cheer" (default: sky opens + 1.2 s): a hop on the stepped clock, a stretch, and the flag swings.
import { fig, makeFrame, clamp01, startOf } from "./common.js";
import { NOMU_F } from "./nomu.js";

const DOME_V = 40 / 0.6;
// [f, r, roofY]: metres in the seal frame, three roofs each side of the avenue
const ROOFS = [[3, -9.5, 4.4], [7.5, -10.5, 5.6], [11.5, -9.5, 4.9], [4, 9.5, 5.2], [8.5, 10.2, 4.3], [12, 9.2, 5.8]];
const SHIRT = ["#ff8a20", "#3a8a5a", "#2f6ab0", "#ffffff", "#ff8a20", "#2f6ab0"];
const HAIR = ["#3a2a1a", "#8a5a2a", "#1a1620", "#c89a4a", "#5a2a2a", "#2a2a3a"];

export default function crowd(ctx, frame = makeFrame(ctx)) {
  const { THREE, kit, engine } = ctx, S = frame.S, group = new THREE.Group(), folk = [];
  const rnd = ctx.rng("rooftop-civilians");
  const nomuP = frame.F(NOMU_F, 0, 0);
  ROOFS.forEach(([f, r, ry], i) => {
    const p = frame.F(f, r, 0), roofH = ry * S;
    // the roof block: a dark stub tower, a lip, and a red railing along the street edge (the side facing the avenue)
    const w = 3.4 * S, dpt = 2.6 * S;
    const block = fig(ctx, new THREE.BoxGeometry(w, roofH, dpt), "#14121e", "#0a0a12", { pos: [p[0], roofH / 2 - 0.02, p[2]], rot: [0, frame.yaw, 0], lineMul: 1.1 });
    group.add(block);
    const edge = r < 0 ? 1 : -1; // toward the avenue, in the seal's right axis
    for (let k = 0; k < 5; k++) {
      const q = (k / 4 - 0.5) * (w - 0.3 * S);
      const post = fig(ctx, new THREE.CylinderGeometry(0.03 * S, 0.03 * S, 0.5 * S, 6), "#c82020", "#5a1010", { lineMul: 0.5 });
      post.position.set(p[0] + frame.fwd[0] * q + frame.right[0] * edge * (dpt / 2 - 0.1 * S), roofH + 0.23 * S, p[2] + frame.fwd[1] * q + frame.right[1] * edge * (dpt / 2 - 0.1 * S));
      group.add(post);
    }
    const rail = fig(ctx, new THREE.BoxGeometry(0.04 * S, 0.04 * S, w - 0.2 * S), "#c82020", "#5a1010", { lineMul: 0.5 });
    rail.position.set(p[0] + frame.right[0] * edge * (dpt / 2 - 0.1 * S), roofH + 0.48 * S, p[2] + frame.right[1] * edge * (dpt / 2 - 0.1 * S));
    rail.rotation.y = frame.yaw;
    group.add(rail);

    // the cheerer
    const h = kit.costumedSeal(engine, { scale: 0.8 * S, coat: "#9a98a2", shade: "#6a6878",
      layers: [{ type: "uniform", col: SHIRT[i], shade: SHIRT[i] === "#ffffff" ? "#b8bcc8" : "#2a2030", collar: false }],
      hair: kit.defineHair(i % 3 === 0 ? "spiky" : i % 3 === 1 ? "bob" : "swept", { count: 7 + (i % 3), layers: 1, length: [0.05, 0.1], color: { base: HAIR[i], shade: "#12070a", hi: "#e8e0d0" } }),
      eyes: { style: i % 2 ? "round" : "tareme", iris: ["#3a6ab0", "#4a8a4a", "#7a4a2a"][i % 3] } });
    // a phone (even) or a hero flag (odd) in the flipper
    const prop = new THREE.Group(), flag = new THREE.Group();
    if (i % 2 === 0) {
      prop.add(fig(ctx, new THREE.BoxGeometry(0.05, 0.09, 0.012), "#14121e", "#14121e", { pos: [0, 0.12, 0], lineMul: 0.5 }), fig(ctx, new THREE.BoxGeometry(0.04, 0.075, 0.004), "#cfe8ff", "#cfe8ff", { pos: [0, 0.12, 0.008], line: 0, lineMul: 0.2 }));
    } else {
      prop.add(fig(ctx, new THREE.CylinderGeometry(0.01, 0.012, 0.5, 6), "#6a4a2a", "#3a2a1a", { pos: [0, 0.22, 0], lineMul: 0.5 }));
      flag.position.set(0, 0.42, 0);
      flag.add(fig(ctx, new THREE.BoxGeometry(0.2, 0.13, 0.006), i === 1 ? "#19d3ff" : i === 3 ? "#ff2d8a" : "#ffc800", "#12070a", { pos: [0.1, 0, 0], lineMul: 0.8 }));
      flag.add(fig(ctx, new THREE.BoxGeometry(0.06, 0.1, 0.008), "#c82020", "#5a1010", { pos: [0.05, 0, 0.004], line: 0, lineMul: 0.3 })); // the little red-white crest
      prop.add(flag);
    }
    prop.position.set(i % 2 ? -0.27 : 0.27, 0.26, 0.26);
    h.props.add(prop);
    h.place(p[0], roofH, p[2], 0);
    h.lookAtPoint(frame.a[0] + frame.fwd[0] * NOMU_F * S * 0.5, frame.a[2] + frame.fwd[1] * NOMU_F * S * 0.5); // watch the fight
    const yaw = h.group.rotation.y;
    group.add(h.group);
    const d = Math.hypot(p[0] - nomuP[0], p[2] - nomuP[2]);
    folk.push({ h, p, roofH, yaw, flag, d, ph: rnd() * 6.28, rate: 5 + rnd() * 2 });
  });

  return {
    group,
    update(t, dt, cue) {
      const smash = startOf(cue, "smash", 9.42), cheer = startOf(cue, "cheer", startOf(cue, "skyOpen", 9.42) + 1.2);
      for (const c of folk) {
        const u = t - smash - c.d / DOME_V; // seconds since the dome reached this civilian
        const duck = u >= 0 && u < 0.25 ? Math.sin(Math.PI * clamp01(u / 0.25)) ** 0.5 : 0;
        const ch = clamp01((t - cheer) / 0.3);
        c.h.state.poses = {};
        let hop = 0;
        if (duck > 0) { c.h.setPose("cower", duck); c.h.expression("terror", 1); } else if (ch > 0) {
          c.h.setPose("salute", ch * (0.6 + 0.4 * Math.abs(Math.sin(t * c.rate + c.ph))));
          c.h.expression("awe", 1);
          hop = Math.abs(Math.sin(t * c.rate * 0.5 + c.ph)) * 0.1 * ch; // twos: t is the stepped clock
          c.flag.rotation.z = Math.sin(t * c.rate + c.ph) * 0.45 * ch;
        } else c.h.expression("awe", 0.5); // watching, mouth open
        c.h.place(c.p[0], c.roofH + hop * S, c.p[2], c.yaw);
        c.h.update(t);
      }
    },
    dispose() { for (const c of folk) c.h.dispose(); },
  };
}
