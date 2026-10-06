// FX layer for p-aether-lang (Jujutsu Kaisen: Infinite Void into Hollow Purple, MAPPA). Layer 1.
// Every effect of the bible's FX section (scripts/p-aether-lang.md, section 6) and the FX parts of section 3, one module each:
//   handseal.js  FX 1 hand-seal glow; 3.14/3.15 blindfold glints (easter egg 1)
//   burst.js     3.4 ragged burst + FX 2 bubble edge; 3.20 flood glow; shot-6 core pulse; FX 7 hold-flash
//   flood.js     FX 3 / 3.5 information flood (440 ribbons) + FX 4 freeze clock; 3.7 krackle arms
//   ring.js      FX 5 / 3.8 closing ring + dust + rim stars + shock; 3.9 H1 loop (easter egg 5); 3.16 STILL lettering
//   orbs.js      FX 6 / 3.17 Lapse Blue, Reversal Red, jitter bolts; FX 7 collision (impact frame, trauma, shock)
//   purple.js    FX 8 / 3.18 Hollow Purple as ref 06 (easter egg 2); FX 9 / 3.19 tunnel; FX 10 erase (easter egg 6)
// Cue names (the bible's words; each falls back to the bible's own time when scene.js has no such beat):
//   handseal 0.83  bloom 1.45  flood 1.45  glints 6.6  freeze 8.3  ringclose 8.7  still 9.5  corepulse 10.4  orbs 15.3  collide 17.79  purple 17.92  tunnel 18.6
// Optional scene.anchors: { core, h1, hanami, jogo, toji, mahito } world positions the cast/world agents may publish.
// Rules held by every module: depthTest on / depthWrite off (the seal, nearer and opaque, is never covered), no emissive on the seal,
// every colour linearised (pow 2.2) and clamped to 1.4, flat posterised bands, programs built once here (no link during playback).
import handseal from "./handseal.js";
import burst from "./burst.js";
import flood from "./flood.js";
import ring from "./ring.js";
import orbs from "./orbs.js";
import purple from "./purple.js";
import hollowCore from "./hollow-core.js";
import { timeline, sealW } from "./lib.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-p-aether-lang";
  const A = ctx.scene.anchors ?? {};
  const v3 = (a, d) => new THREE.Vector3(...(a ?? d));
  const mahito = v3(A.mahito, [1.9, 0, -3.4]);
  const L = {
    THREE, T: timeline(ctx.scene),
    CORE: v3(A.core, [0, 1.7, -15]),                      // the white-violet sun (world.js:20)
    H1: v3(A.h1, [0, 0.012, -4.5]),                       // the one-circle floor loop, on the core line, clear of the victims
    victims: [                                           // Hanami, Jogo, Toji: erase f442, f449, f456 (Toji last)
      { p: A.hanami ?? [-3.0, 0, -6.5], sc: 1.0, t0: 442 / 24 },
      { p: A.jogo ?? [4.6, 0, -7.8], sc: 1.0, t0: 449 / 24 },
      { p: A.toji ?? [-1.4, 0, -9.5], sc: 1.0, t0: 456 / 24 },
    ],
    relic: mahito.clone().add(new THREE.Vector3(0, 1.3, -3)),   // the free blindfold, about 3 m behind Mahito-seal
    camPos: new THREE.Vector3(), camRight: new THREE.Vector3(1, 0, 0), dirCore: new THREE.Vector3(0, 0, -1),
    chest(out) { return ctx.seal.chest(out); },
    sealPoint(lx, ly, lz, out) { return sealW(ctx.seal, lx, ly, lz, out); },
    // a point on the far side of `from` from the lens, `dist` metres behind it: anything placed there is behind the seal
    away(from, dist, out) { return out.copy(from).sub(this.camPos).setY(0).normalize().multiplyScalar(dist).add(from); },
    frame() {
      const cam = ctx.player.camera;
      this.camPos.copy(cam.position);
      this.camRight.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0);
      if (this.camRight.lengthSq() < 1e-6) this.camRight.set(1, 0, 0); else this.camRight.normalize();
      const c = this.chest(new THREE.Vector3());
      this.dirCore.set(this.CORE.x - c.x, 0, this.CORE.z - c.z);
      if (this.dirCore.lengthSq() < 1e-6) this.dirCore.set(0, 0, -1); else this.dirCore.normalize();
    },
  };

  const mods = [];
  for (const [name, fn] of Object.entries({ handseal, burst, flood, ring, orbs, purple, hollowCore })) {
    try { const m = fn(ctx, L); group.add(m.group); mods.push({ name, m, dead: false }); }
    catch (e) { console.error(`[p-aether-lang fx] ${name} failed to build:`, e); }
  }
  return {
    group,
    update(t, dt, cue) {
      L.frame();
      for (const p of mods) {
        if (p.dead) continue;
        try { p.m.update(t, dt, cue); } catch (e) { p.dead = true; p.m.group.visible = false; console.error(`[p-aether-lang fx] ${p.name} update failed:`, e); }
      }
    },
    dispose() { for (const p of mods) { try { p.m.dispose?.(); } catch { /* ignore */ } } group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
