// ANSWER CARDS: two glowing cards (cyan #19d3ff "2", magenta #ff2d8a "2": the two different outputs) thrown by the Nomu, hovering above
// the seal's shoulders, then at "punch" (default 14.4 s) smashed over 8 frames (0.33 s) into ONE gold #ffc800 card with a blue check #1f5fe0
// and a "1" (easter egg 4: two, then one). Cards are 0.8 x 1.1 m scaled to 0.55, spin on twos, Ben-Day dots and a 3 px ink border.
// Staging law: cards hover to the sides and ABOVE the head, never on the lens-to-seal line (the home/front cameras stay clear).
import { makeFrame, smooth, clamp01, startOf, lerp } from "./common.js";
import { NOMU_F } from "./nomu.js";

function face(THREE, { col, text, check, dots }) {
  const c = document.createElement("canvas"); c.width = 160; c.height = 220;
  const g = c.getContext("2d");
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 160, 220);
  g.fillStyle = col; g.fillRect(8, 8, 144, 204);
  if (dots) { g.fillStyle = "rgba(5,2,10,0.28)"; for (let y = 10; y < 214; y += 10) for (let x = 10 + ((y / 10) % 2) * 5; x < 154; x += 10) { g.beginPath(); g.arc(x, y, 2.2 + 2.2 * (y / 220), 0, 7); g.fill(); } }
  g.fillStyle = "#f4ecd8"; g.beginPath(); g.ellipse(80, 110, 48, 62, 0, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = "#12070a"; g.stroke();
  g.fillStyle = "#12070a"; g.font = "900 96px Impact, 'Arial Black', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 80, 118);
  if (check) { g.strokeStyle = "#1f5fe0"; g.lineWidth = 16; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(100, 176); g.lineTo(122, 198); g.lineTo(150, 160); g.stroke(); }
  g.lineWidth = 8; g.strokeStyle = "#12070a"; g.strokeRect(4, 4, 152, 212);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export default function cards(ctx, frame = makeFrame(ctx)) {
  const { THREE, seal } = ctx, S = frame.S, group = new THREE.Group(), tex = [];
  const W = 0.8 * 0.55, H = 1.1 * 0.55;
  const mk = (spec, halo) => {
    const t = face(THREE, spec); tex.push(t);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false })));
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.45, H * 1.35), new THREE.MeshBasicMaterial({ color: halo, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    hm.position.z = -0.01; g.add(hm);
    g.scale.setScalar(S); group.add(g);
    return g;
  };
  const A = mk({ col: "#19d3ff", text: "2", dots: true }, "#19d3ff");
  const B = mk({ col: "#ff2d8a", text: "2", dots: true }, "#ff2d8a");
  const G = mk({ col: "#ffc800", text: "1", check: true, dots: true }, "#ffc800");
  const nomuHand = frame.F(NOMU_F, 0, 1.9 * 3.4 * 0.3);
  // the live seal frame (the seal dashes and moves; the cards follow it with the hover offsets below)
  const rel = (f, r, y) => { const sn = Math.sin(seal.yaw), cs = Math.cos(seal.yaw), s = seal.scale; return [seal.at[0] + (sn * f + cs * r) * s, seal.at[1] + y * s, seal.at[2] + (cs * f - sn * r) * s]; };
  const HOVA = [0.25, 1.15, 1.35], HOVB = [0.1, -1.15, 1.1], GOLD = [-0.15, -0.95, 1.4];
  const set = (g, p, spinY, tilt = 0) => { g.position.set(p[0], p[1], p[2]); g.rotation.set(0, spinY, tilt); };

  return {
    group,
    update(t, dt, cue) {
      const thr = startOf(cue, "cards", 3.4), smash = startOf(cue, "smash", 9.42), punch = startOf(cue, "punch", 14.4);
      // throw: 0.7 s along an arc from the Nomu's raised flipper to the hover point, spinning (a card turns 3 times in flight)
      const flight = (g, hov, delay, side) => {
        const k = smooth((t - thr - delay) / 0.7);
        const to = rel(...hov), from = nomuHand;
        const p = [lerp(from[0], to[0], k), lerp(from[1], to[1], k) + Math.sin(Math.PI * k) * 1.2 * S, lerp(from[2], to[2], k)];
        const u = t - smash; // a tremble when the dome passes
        const tr = u > 0 && u < 0.4 ? Math.sin(u * 90) * 0.05 * S * (1 - u / 0.4) : 0;
        p[1] += tr + Math.sin(t * 2.2 + side) * 0.05 * S * k; // the hover bob on the stepped clock
        set(g, p, k < 1 ? k * Math.PI * 6 * side : Math.sin(t * 1.5 + side) * 0.5, side * 0.12 * k);
        g.visible = t >= thr + delay;
        g.scale.setScalar(S * (0.2 + 0.8 * smooth((t - thr - delay) / 0.2)));
      };
      const m = clamp01((t - punch) / (8 / 24)); // the 8-frame smash
      if (m <= 0) { flight(A, HOVA, 0, 1); flight(B, HOVB, 0.18, -1); G.visible = false; return; }
      // smash: both slam to the merge point above the head, grow bright, then the gold card pops with an overshoot
      const mid = rel(0, 0, 1.55);
      const slam = smooth(m / 0.7);
      for (const [g, hov, sd] of [[A, HOVA, 1], [B, HOVB, -1]]) {
        const from = rel(...hov);
        set(g, [lerp(from[0], mid[0], slam), lerp(from[1], mid[1], slam), lerp(from[2], mid[2], slam)], sd * m * 9, sd * 0.4 * (1 - slam));
        g.visible = m < 0.85; g.scale.setScalar(S * (1 - 0.3 * slam));
      }
      const pop = clamp01((m - 0.7) / 0.3), over = 1 + 0.35 * Math.sin(Math.PI * pop) * (1 - pop);
      const gp = rel(...GOLD), gm = [lerp(mid[0], gp[0], smooth((t - punch - 0.4) / 0.8)), lerp(mid[1], gp[1], smooth((t - punch - 0.4) / 0.8)) + Math.sin(t * 2) * 0.04 * S, lerp(mid[2], gp[2], smooth((t - punch - 0.4) / 0.8))];
      set(G, gm, Math.sin(t * 1.4) * 0.4, -0.06);
      G.visible = pop > 0; G.scale.setScalar(S * over * (0.2 + 0.8 * smooth(pop * 1.5)));
    },
    dispose() { for (const x of tex) x.dispose(); group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); },
  };
}
