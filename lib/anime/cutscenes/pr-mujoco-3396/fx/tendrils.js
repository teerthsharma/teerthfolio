// E09 Founder's light: path tendrils (gold-leaf lines, green 20% outer) + pillar web at the Wall; E16 crack glow.
// Tendrils: 8 filaments from above the seal's head (never over the pup) to each titan nape (x5 + 3 extra over the crest),
// grow over f98-118 (4.08-4.92 s) staggered, pulse on every footfall (22 frames), flare at the strike (6.75 s).
// Curve: quadratic Bezier B(u) = (1-u)^2 P0 + 2u(1-u) C + u^2 P1 with wobble A*sin(8u + phase + drawing). Width 0.1 m at the root,
// widened with distance so it still reads from 40 m (0.02 m per metre).
import { makeRibbon, win, smooth, clamp } from "./util.js";
import { TITANS } from "./steam.js";

export default function buildTendrils(ctx, O) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const r = ctx.rng(31);
  const napes = TITANS.map(([x, y, z]) => new THREE.Vector3(O[0] + x, O[1] + y + 3, O[2] + z));
  // 3 extra filaments to the impostor rank over the crest
  for (let i = 0; i < 3; i++) napes.push(new THREE.Vector3(O[0] + (i - 1) * 55, O[1] + 30, O[2] - 90 - i * 30));
  const fil = napes.map((nape, i) => {
    const rb = makeRibbon(THREE, 44, "add", { uSpark: { value: 1 } });
    rb.U.uCore.value.set("#fff0c8"); rb.U.uMid.value.set("#c99a4a"); rb.U.uGlow.value.set("#7fe0a0");
    group.add(rb.mesh);
    return { rb, nape, ph: r() * 6.28, delay: i * 0.06, ctrl: new THREE.Vector3((r() - .5) * 30, 18 + r() * 14, 0) };
  });
  // pillar web: 4 arcs 1.5 m wide at the Wall (cornerstone to nape-height), crystal-white against the lava glow
  const pillars = [-26, -9, 9, 26].map((x, i) => {
    const rb = makeRibbon(THREE, 30, "add", { uSpark: { value: 1 } });
    rb.U.uCore.value.set("#fffbe0"); rb.U.uMid.value.set("#c99a4a"); rb.U.uGlow.value.set("#7fe0a0");
    group.add(rb.mesh); return { rb, x, i };
  });

  // crack glow (shot 3, f79-103 = 3.3-4.3 s): fissure racing up the Wall face from the base, underlight #e96a2d additive
  const crackM = makeRibbon(THREE, 48, "add", {}); crackM.U.uCore.value.set("#ffd9a0"); crackM.U.uMid.value.set("#e96a2d"); crackM.U.uGlow.value.set("#a0391a");
  group.add(crackM.mesh);
  const branches = []; for (let i = 0; i < 6; i++) { const b = makeRibbon(THREE, 14, "add", {}); b.U.uCore.value.set("#ffd9a0"); b.U.uMid.value.set("#e96a2d"); b.U.uGlow.value.set("#a0391a"); group.add(b.mesh); branches.push(b); }
  const WALL_Z = -29.4;
  // fissure spine, fixed (a function of the seed, not the clock): jittered upward walk
  const spine = []; { const rr = ctx.rng(77); let x = 0; for (let i = 0; i < 48; i++) { x += (rr() - .5) * 2.6; spine.push(new THREE.Vector3(O[0] + x, O[1] + i * 0.95, O[2] + WALL_Z)); } }
  const brData = branches.map((b, i) => { const rr = ctx.rng(90 + i), at = 6 + Math.floor(rr() * 34), dir = rr() < .5 ? -1 : 1, pts = [spine[at].clone()]; for (let j = 1; j < 14; j++) { const p = pts[j - 1]; pts.push(new THREE.Vector3(p.x + dir * (0.6 + rr() * 1.4), p.y + (rr() - .3) * 1.6, p.z)); } return { at, pts }; });

  const sealC = new THREE.Vector3(), a0 = new THREE.Vector3(), tmp = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      // ---- crack ----
      const ck = win(cue, t, "crack", 3.3, 4.3);
      const fade = 1 - smooth(5.2, 6.6, t); // the glow settles to embers once the titans rise
      const nS = Math.floor(clamp(ck.k) * spine.length);
      if (nS >= 2 && fade > 0.01) {
        const pulse = 1 + 0.35 * Math.sin(t * 40) * 0; // steady: pulse comes from footfall below
        const ft = Math.exp(-(((t - 4.92) * 24 / 22) % 1) * 5) * (t > 4.92 ? 1 : 0);
        crackM.set(spine.slice(0, nS), u => 0.35 + 0.5 * (1 - u), u => 1 - 0.3 * u);
        crackM.U.uI.value = (1.1 + 0.8 * ft) * fade * pulse; crackM.U.uT.value = t;
        brData.forEach((b, i) => {
          const g = clamp((nS - b.at) / 8);
          if (g <= 0) return branches[i].hide();
          branches[i].set(b.pts.slice(0, Math.max(2, Math.floor(g * b.pts.length))), u => 0.22 * (1 - u * .7), u => 1 - u);
          branches[i].U.uI.value = 0.9 * fade; branches[i].U.uT.value = t;
        });
      } else { crackM.hide(); branches.forEach(b => b.hide()); }

      // ---- tendrils ----
      const g = win(cue, t, "tendrils", 4.08, 4.92);
      const ftN = (t - 4.92) * 24 / 22, foot = t > 4.92 ? Math.exp(-(ftN % 1) * 4) : 0;
      const stk = win(cue, t, "strike", 6.75, 7.05), flare = Number.isFinite(stk.since) ? Math.exp(-stk.since * 5) : 0;
      ctx.seal.chest(sealC);
      const hs = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
      a0.set(sealC.x, sealC.y + 0.95 * hs, sealC.z + 0.0); // root floats above the head: no ribbon crosses the pup
      const drawing = Math.floor(t * 12);
      fil.forEach(f => {
        const gk = clamp((g.k - f.delay) / (1 - f.delay));
        if (gk <= 0.01) return f.rb.hide();
        const C = f.ctrl, n = Math.max(2, Math.floor(gk * 44));
        const len = a0.distanceTo(f.nape), w0 = 0.1 + 0.02 * len;
        const pts = [];
        for (let j = 0; j < n; j++) {
          const u = (j / 43) * 1; // path parameter along the FULL curve; growth cuts at n
          const mx = (a0.x + f.nape.x) * .5 + C.x, my = Math.max(a0.y, f.nape.y) * .6 + C.y, mz = (a0.z + f.nape.z) * .5;
          const om = 1 - u, bx = om * om * a0.x + 2 * u * om * mx + u * u * f.nape.x, by = om * om * a0.y + 2 * u * om * my + u * u * f.nape.y, bz = om * om * a0.z + 2 * u * om * mz + u * u * f.nape.z;
          const wob = Math.sin(8 * u + f.ph + drawing * 0.7) * 0.9 * Math.sin(u * Math.PI);
          pts.push(tmp.clone().set(bx + wob, by + wob * .5, bz + Math.cos(6 * u + f.ph) * 0.9 * Math.sin(u * Math.PI)));
        }
        f.rb.set(pts, u => w0 * (1 - 0.35 * u) * (u < .04 ? u / .04 : 1), u => (u < .08 ? u / .08 : 1) * (1 - 0.4 * smooth(.85, 1, u)));
        f.rb.U.uI.value = (0.9 + 0.7 * foot * (g.k >= 1 ? 1 : 0) + 1.6 * flare) * (1 - smooth(10.3, 11.2, t)); f.rb.U.uT.value = t;
      });
      // ---- pillar web: rises as the tendrils land, pulses with footfalls ----
      pillars.forEach(p => {
        const k = smooth(4.4 + p.i * 0.08, 5.2 + p.i * 0.08, t);
        if (k <= 0.01) return p.rb.hide();
        const pts = [], H = 44 * k;
        for (let j = 0; j < 30; j++) {
          const u = j / 29;
          pts.push(tmp.clone().set(O[0] + p.x + Math.sin(u * 3.1 + p.i) * 3.0, O[1] + u * H, O[2] - 29.2 + Math.sin(u * Math.PI) * 1.6));
        }
        p.rb.set(pts, () => 1.5, u => (u < .1 ? u / .1 : 1) * (1 - .5 * u));
        p.rb.U.uI.value = (0.55 + 0.5 * foot + 1.2 * flare) * (1 - smooth(10.3, 11.2, t)); p.rb.U.uT.value = t;
      });
    },
    dispose() { fil.forEach(f => f.rb.dispose()); pillars.forEach(p => p.rb.dispose()); crackM.dispose(); branches.forEach(b => b.dispose()); },
  };
}
