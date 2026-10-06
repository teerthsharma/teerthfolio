// spawn-seal FX / sparks: particle-sparks + bokeh-sparkle (bible 3.15, FX 1/2/9). Every particle is a pure function of the stepped clock.
// Emitters (seconds): PLOP motes 1.0 | Veldora shell 2.79 (60) | morph column 4.42 (50) | droplet burst 8.04 (40) | beam embers 10.0 (56) |
// lattice ignite 13.8 (42) | PON ring pulse 18.54 (48) | PLOP motes 29.29 (36).  Palette #3fdcff #ffffff #9fe6ff #ffd23a #ff7ae0.
// Cues read (optional, else fixed times above): "plop" "veldora" "morph" "shan" "beams" "lattice" "pon" "plop2"; bokeh calm window uses "beams" and "maw".
import { sparkField, ageOf, clamp01, sealPoint, MAW_T0 } from "./common.js";

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export default function sparks(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group(), rg = ctx.rng(5);
  const CY = hex("#3fdcff"), WH = hex("#ffffff"), IC = hex("#9fe6ff"), GO = hex("#ffd23a"), PK = hex("#ff7ae0"), DR = hex("#7fd0ff"), EM = hex("#ff5a1a"), SH = hex("#ffd25a");
  const pick = (a) => a[Math.floor(rg() * a.length)], R = (a, b) => a + (b - a) * rg();
  const items = [], sp = new THREE.Vector3();
  const burst = (t0, n, origin, speed, up, g, cols, life, size, shape = 0) => {
    for (let i = 0; i < n; i++) {
      const th = rg() * Math.PI * 2, u = R(-0.2, 1), s = Math.sqrt(1 - u * u), v = R(speed[0], speed[1]);
      items.push({ o: origin(i), v: [Math.cos(th) * s * v, u * v * up + R(0, 0.6), Math.sin(th) * s * v], c: pick(cols), t0: t0 + rg() * 0.12, life: life * R(0.7, 1.2), size: R(size[0], size[1]), shape: rg() < 0.35 ? 1 : shape, g });
    }
  };
  const at = (x, y, z) => sealPoint(seal, THREE, x, y, z, sp).toArray();
  // 1. PLOP 24 f: motes thrown off the pool where the drop lands (pool centre), cyan/white/ice
  burst(1.0, 36, () => [R(-0.5, 0.5), 0.25, R(-0.5, 0.5)], [0.8, 2.2], 1.0, 3.2, [CY, WH, IC], 1.0, [0.05, 0.11]);
  // 2. Veldora's barrier pulse 67 f: 60 gold sparks off the shell at (3.1, 2.4, -1.5)
  burst(67 / 24, 60, () => { const th = rg() * 6.28, ph = Math.acos(R(-1, 1)); return [3.1 + 1.85 * Math.sin(ph) * Math.cos(th), 2.4 + 1.85 * Math.cos(ph), -1.5 + 1.85 * Math.sin(ph) * Math.sin(th)]; }, [1.2, 3.0], 0.4, 0.6, [SH, GO, WH], 1.3, [0.06, 0.12]);
  // 3. morph column 106 f: 50 cyan sparks spiralling up off the seal's feet
  burst(106 / 24, 50, () => { const a = rg() * 6.28, r = R(0.2, 0.55); return at(Math.cos(a) * r, 0.1, Math.sin(a) * r); }, [0.2, 0.7], 3.0, -0.4, [CY, IC, WH], 1.5, [0.05, 0.1]);
  // 4. droplet burst 193 f: slime-blue #7fd0ff droplets off the shoulder, ballistic (g 6)
  burst(193 / 24, 40, () => at(0.22, 1.2, 0), [1.4, 3.2], 0.8, 6.0, [DR, DR, WH], 1.1, [0.07, 0.13]);
  // 5. beam embers 240 f: #ff5a1a embers (and gold) at each of the seven contact points (ring r 4.4)
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.2, ox = Math.cos(a) * 4.4, oz = Math.sin(a) * 4.4;
    burst(10.0 + i * 0.12, 8, () => [ox, 0.3, oz], [0.6, 1.8], 1.4, 1.2, [EM, GO, EM], 1.5, [0.05, 0.1]); }
  // 6. lattice ignition 331 f: gold + pink (scheduler) sparks rising from the seven nodes, in order
  for (let i = 0; i < 7; i++) { const d = [0, 51, 103, 154, 206, 257, 309][i] * Math.PI / 180, ox = Math.cos(d) * 6.5, oz = Math.sin(d) * 6.5;
    burst(331 / 24 + i * 0.12, 6, () => [ox, 0.9, oz], [0.3, 0.9], 2.2, -0.3, [GO, GO, PK, CY], 1.4, [0.05, 0.1]); }
  // 7. PON ring pulse 445 f: 48 white-cyan motes flung outward in a flat ring around the seal (the loop pulses)
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; items.push({ o: at(0, 0.5, 0), v: [Math.cos(a) * 3.2, 0.15, Math.sin(a) * 3.2], c: i % 3 ? IC : WH, t0: 445 / 24, life: 1.3, size: 0.07, shape: 0, g: 0 }); }
  // 8. PLOP 703 f: the island returns
  burst(703 / 24, 36, () => at(R(-0.4, 0.4), 0.2, R(-0.4, 0.4)), [0.8, 2.2], 1.0, 3.2, [CY, WH, IC], 1.0, [0.05, 0.11]);
  const field = sparkField(THREE, { additive: true, items }); field.pts.renderOrder = 13; group.add(field.pts);

  // BOKEH: 80 white-gold rimmed discs, 0.25-0.7 m, far (r 5-16 m, y 0.6-9 m), drifting; only through the calm shots.
  const bk = [];
  for (let i = 0; i < 80; i++) { const a = rg() * 6.28, r = R(5, 16);
    bk.push({ o: [Math.cos(a) * r, R(0.6, 9), Math.sin(a) * r], v: [R(-0.05, 0.05), R(0.03, 0.12), R(-0.05, 0.05)], c: i % 3 ? hex("#fff3b0") : WH, t0: R(-6, 24), life: R(7, 11), size: R(0.25, 0.7), shape: 2, g: 0 }); }
  const bokeh = sparkField(THREE, { additive: true, items: bk }); bokeh.pts.renderOrder = 3; group.add(bokeh.pts);
  const size = new THREE.Vector2();

  return {
    group,
    update(t, dt, cue) {
      try { ctx.engine.renderer.getDrawingBufferSize(size); } catch { size.set(1920, 1080); }
      field.set(t, size.y); bokeh.set(t, size.y);
      // calm shots only: dim to 0 across the beam shot (9.4-13.6 s) and from the maw (26.79 s) on
      const ba = ageOf(cue, t, "beams", 240 / 24), ma = ageOf(cue, t, "maw", MAW_T0);
      const beamShot = clamp01((ba + 0.5) / 0.4) * (1 - clamp01((ba - 3.4) / 0.4));
      bokeh.pts.material.uniforms.uAlpha.value = 0.32 * (1 - beamShot) * (1 - clamp01(ma / 0.3));
    },
    dispose() { field.dispose(); bokeh.dispose(); },
  };
}
