// p-nerve FX: lettering and easter-egg glints. Bible 3.18 (SFX: white brush on black ink with a red drop shadow; pop .07 s,
// 1.3x overshoot, hold .7 s; sparing) plus easter eggs 2 (the amber witness ring at the chain crossing) and 1 (the foil
// glint as the page goes to the lens). In-world sprites; set scene.fx.worldSfx = false to hand lettering to the 2D overlay.
// Cues read: kukuku, scritch x4, shing, toll x3 (DONG), rip, crunch (CRUNCH), chain, pageGlint, crack.
import * as THREE from "three";
import { billboard, letteringTexture, STAR_FS, hex, sstep, clamp01 } from "./common.js";

export default function sfx(ctx, S) {
  const { U, TL, A, D } = S;
  const group = new THREE.Group(); group.name = "nerve-sfx";
  const own = [];
  const Y = new THREE.Vector3(0, 1, 0), chest = new THREE.Vector3(), o = new THREE.Vector3();
  const sealAt = (out, x, y, z) => { ctx.seal.chest(chest); return out.set(x, y, z).applyAxisAngle(Y, ctx.seal.yaw || 0).multiplyScalar(ctx.seal.scale || 1).add(chest); };
  const ryuk = new THREE.Vector3(...A.ryukMouth), bell = new THREE.Vector3(...A.bell);
  const mid = A.gaugeX.reduce((a, b) => a + b, 0) / 4;

  // lettering pop envelope on age a (s): s(a) = 1.3 a / .07 up to .07 ; eases 1.3 -> 1.0 by .17 ; holds to .87 ; hard cut after.
  const sprites = [];
  const defs = [
    ["kukuku", "KUKUKU", D.kukuku, () => o.copy(ryuk).add(new THREE.Vector3(0.5, 1.0, 0.3)), [2.6, 1.3]],
    ["scritch", "SCRITCH", D.scritch, () => o.set(mid + 0.3, 3.3, A.gaugeZ + 0.3), [2.3, 1.15]],
    ["shing", "SHING", D.shing, () => sealAt(o, 1.8, 0.95, 0.35), [2.5, 1.25]],
    ["toll", "DONG", D.toll, () => o.copy(bell).add(new THREE.Vector3(0, 2.6, 2.0)), [4.4, 2.2]],
    ["rip", "RIP", D.rip, () => sealAt(o, -1.35, 1.0, 0.4), [2.0, 1.0]],
    ["crunch", "CRUNCH", D.crunch, () => sealAt(o, 1.35, 1.0, 0.4), [2.7, 1.35]],
  ];
  if (ctx.scene.fx?.worldSfx !== false) {
    for (const [name, text, defs_, where, size] of defs) {
      let tex; try { tex = letteringTexture(text); } catch (e) { continue; } // no DOM canvas: skip the art, keep the rest
      const m = billboard({
        U, additive: false, size, uniforms: { uMap: { value: tex }, uAlpha: { value: 1 } },
        fs: `uniform sampler2D uMap; uniform float uAlpha; varying vec2 vUv; varying vec3 vW;
          void main(){ vec4 t = texture2D(uMap, vUv); float a = t.a * uAlpha * sealMask(vW); if (a < .02) discard; gl_FragColor = vec4(t.rgb, a); }`,
      });
      m.renderOrder = 40; m.visible = false; m.material.uniforms.uRoll.value = -0.1; group.add(m); own.push(tex);
      sprites.push({ m, evs: TL.evs(name, defs_), where, size });
    }
  }

  // easter egg 2: the amber witness ring, r .3 m, on the chain crossing: pulses on `chain`, then holds at half strength until the break
  const chainEv = TL.evs("chain", D.chain)[0], crunchEv = TL.evs("crunch", D.crunch)[0];
  const witness = billboard({
    U, size: [0.9, 0.9], uniforms: { uK: { value: 0 }, uCol: { value: hex("#e8a23a") } },
    fs: `uniform float uK; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
      void main(){ float d = abs(length((vUv - .5) * 2.) - .88); float a = step(d, .09) * uK * sealMask(vW);
        if (a < .01) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  witness.position.set(...A.chainCross); group.add(witness);

  // easter egg 1: foil glint as the page goes to the lens: 4-point star, #cfe8ea arms, white core, envelope sin(pi k) over dur
  const pgEv = TL.evs("pageGlint", D.pageGlint)[0];
  const glint = billboard({ U, size: [1.3, 1.3], uniforms: { uK: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: hex("#cfe8ea") }, uCore: { value: hex("#ffffff") } }, fs: STAR_FS });
  glint.renderOrder = 41; group.add(glint);

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      for (const s of sprites) {
        const L = TL.last(s.evs, ct), a = L.ago;
        if (!L.ev || a > 0.87) { s.m.visible = false; continue; }
        const k = a < 0.07 ? 1.3 * a / 0.07 : 1.3 - 0.3 * sstep(0.07, 0.17, a);
        s.m.visible = true; s.m.material.uniforms.uSize.value.set(s.size[0] * k, s.size[1] * k);
        s.where(); s.m.position.copy(o);
      }
      const wa = ct - chainEv.t;
      witness.material.uniforms.uK.value = wa < 0 || ct > crunchEv.t ? 0 : (wa < chainEv.dur ? 1 : 0.5);
      glint.material.uniforms.uK.value = Math.sin(Math.PI * clamp01((ct - pgEv.t) / pgEv.dur));
      sealAt(o, 0.62, 0.35, 0.3); glint.position.copy(o);
    },
    dispose() { for (const o2 of own) o2.dispose?.(); for (const m of [...sprites.map((s) => s.m), witness, glint]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
