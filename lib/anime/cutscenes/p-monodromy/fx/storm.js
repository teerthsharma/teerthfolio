// STORM: the vortex column (bible 3.12), the sky flashes (6), the strike flash (shot 4), the frame-01 light slabs, the equip burst. Layer 1.
//
// Vortex column: an open funnel, radius 7.5 m at the top to 1.8 m at the bottom, 18 m tall, centred on the vortex point.
//   v = uv.y in [0,1], ring = floor(v * 9), phi = uv.x * 2pi + rot + 0.7 ring,  rot = floor(8 t)/8 * (2pi / 1.5)   (one revolution per 1.5 s, on threes)
//   n = vn(vec2(phi * 2.2, ring * 3.1)): posterised to 3 tones (#0e1650 < .4, #1f2a78 < .75, #3a4aa8 rim above), a #7fc8ff rim on the top of every ring (frac(v*9) > .9)
//   streaks: 4 hard white-cyan (#cfe6ff) slants where fract(phi / 2pi * 4 + v * 1.6) > .955
//   tighten: the funnel radius is scaled by 1 - .45 * sstep(4.9, 6.4, t); after the bolt it fades over 1 s.
// Sky flash: a full-frame quad behind the seal, additive #cfe6ff 22 percent for 4 frames, at the six card times (3.35 3.95 4.9 5.35 5.8 6.1).
// Strike flash: 2 frames at the bolt, #cfe6ff -> #fff2c0, hard-capped at 0.40 alpha (L8).
// Light slabs (frame 01, "BG dissolving to blue-white"): w = dot(p, (cos .38, sin .38)) * 1.7 + seed, cell = floor(w); a slab is on where fract(w) < width(cell)
//   (width .12 + .3 hash); white core, #8fd8ff edge band .05 wide; the seed jumps every 3 frames; intensity: equip 1.9-3.1 peak .35, charge 4.9-6.4 ramps to .4.
// Equip burst: 3 pulses (the scales snap on in 3 stages over 12 frames): 16 hard wedges + an expanding ring behind the seal, additive, 40 percent max.
// Cue names: "equip" (1.9), "charge" (4.9), "bolt" (6.4), "flash" (repeatable; defaults to the six card times).
import { bb, NZ, mat, sstep, clamp01, hash3 } from "./lib.js";

export default function makeStorm(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "storm";
  const C = (h) => new THREE.Color(h);
  const tE = T.one("equip", 1.9), tC = T.one("charge", 4.9), tB = T.one("bolt", 6.4);
  const flashes = T.list("flash", [3.35, 3.95, 4.9, 5.35, 5.8, 6.1]);
  const F4 = 4 / 24;

  // ---- vortex column ----
  const colFs = /* glsl */ `
    uniform float uRot, uA; varying vec2 vUv;
    void main() {
      float v = vUv.y, ring = floor(v * 9.);
      float phi = vUv.x * 6.28318 + uRot + .7 * ring;
      float n = vn(vec2(phi * 2.2, ring * 3.1));
      vec3 c = n < .4 ? vec3(.055, .078, .314) : n < .75 ? vec3(.122, .165, .471) : vec3(.227, .29, .659);
      c = pow(c, vec3(2.2));
      float rim = step(.9, fract(v * 9.)); c = mix(c, pow(vec3(.5, .78, 1.), vec3(2.2)), rim);
      float st = step(.955, fract(phi / 6.28318 * 4. + v * 1.6)); c = mix(c, pow(vec3(.81, .9, 1.), vec3(2.2)) * 1.3, st);
      float al = uA * smoothstep(0., .12, v) * (1. - smoothstep(.85, 1., v));
      if (al < .004) discard;
      gl_FragColor = vec4(c, al * .92);
    }`;
  const cu = { uRot: { value: 0 }, uA: { value: 0 } };
  const colM = mat(THREE, { vs: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fs: NZ + colFs, u: cu });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 1.8, 18, 48, 1, true), colM);
  col.position.set(L.vortex[0], L.vortex[1] - 3, L.vortex[2]); col.frustumCulled = false; col.renderOrder = 1; col.visible = false;
  group.add(col);

  // ---- full-frame flash (behind the seal) ----
  const flashFs = /* glsl */ `uniform float uA; uniform vec3 uC; varying vec2 vUv; void main(){ if (uA < .004) discard; gl_FragColor = vec4(uC, uA); }`;
  const fu = { uA: { value: 0 }, uC: { value: C("#cfe6ff") } };
  const flash = bb(THREE, sh, flashFs, fu, { full: true, add: true, push: 0.4, order: 2 });
  group.add(flash);

  // ---- light slabs ----
  const slabFs = /* glsl */ `
    uniform float uA, uSeed; varying vec2 vUv; varying float vAsp;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.);
      float w = dot(p, vec2(cos(.38), sin(.38))) * 1.7 + uSeed * .37;
      float cell = floor(w), f = fract(w);
      float wd = .12 + .3 * h21(vec2(cell, uSeed));
      float on = step(f, wd) * step(.55, h21(vec2(cell, uSeed + 3.)));
      float eg = step(f, .05) + step(wd - .05, f) * step(f, wd);
      vec3 c = mix(pow(vec3(.81, .9, 1.), vec3(2.2)), pow(vec3(.56, .85, 1.), vec3(2.2)), clamp(eg, 0., 1.));
      float al = on * uA; if (al < .004) discard;
      gl_FragColor = vec4(c, al);
    }`;
  const su = { uA: { value: 0 }, uSeed: { value: 0 } };
  const slabs = bb(THREE, sh, slabFs, su, { full: true, add: true, push: 0.5, order: 2 });
  group.add(slabs);

  // ---- equip burst (wedges + expanding ring) ----
  const burstFs = /* glsl */ `
    uniform float uK, uA, uSeed; varying vec2 vUv;
    void main() {
      float r = length(vUv), a = atan(vUv.y, vUv.x), fw = fwidth(r) + 1e-4;
      float wedge = floor((a + 3.14159) / 6.28318 * 16.), L = .45 + .55 * h21(vec2(wedge, uSeed));
      float R = 1. - pow(1. - clamp(uK, 0., 1.), 3.);
      float inW = step(.1 * R, r) * step(r, R * L) * step(.22, fract((a + 3.14159) / 6.28318 * 16.)) * step(fract((a + 3.14159) / 6.28318 * 16.), .78);
      float ring = (1. - smoothstep(R - fw, R, r)) - (1. - smoothstep(R - .05 - fw, R - .05, r));
      float al = (max(inW * .8, ring)) * uA * (1. - uK); if (al < .004) discard;
      gl_FragColor = vec4(mix(pow(vec3(.56, .85, 1.), vec3(2.2)), vec3(1.), step(r, R * .45)), al);
    }`;
  const bu = { uK: { value: 0 }, uA: { value: 0 }, uSeed: { value: 0 } };
  const burst = bb(THREE, sh, burstFs, bu, { add: true, push: 0.7, order: 3 });
  burst.userData.u.uSize.value.set(1.8 * L.scale, 1.8 * L.scale);
  group.add(burst);
  const chest = new THREE.Vector3();
  const pulses = [tE, tE + 0.17, tE + 0.33];

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      // column: ramps in with the storm (1.9 -> 4.6), tightens into the charge, fades after the bolt
      const ramp = sstep(tE, tE + 2.7, ct) * (1 - sstep(tB + 0.2, tB + 1.2, ct));
      col.visible = ramp > 0.01; cu.uA.value = ramp;
      cu.uRot.value = (Math.floor(ct * 8) / 8) * (6.28318 / 1.5);
      const tight = 1 - 0.45 * sstep(tC, tB, ct);
      col.scale.set(tight, 1, tight);
      // flashes: the strike takes priority over the sky flashes
      let a = 0, c = "#cfe6ff";
      for (const ft of flashes) if (ct >= ft && ct < ft + F4) a = Math.max(a, 0.22);
      if (ct >= tB && ct < tB + 2 / 24) { a = 0.4; c = ct < tB + 1 / 24 ? "#cfe6ff" : "#fff2c0"; }
      fu.uA.value = Math.min(0.4, a); fu.uC.value.set(c); flash.visible = a > 0;
      // slabs
      const eq = ct >= tE && ct < tE + 1.2 ? 0.35 * Math.sin(Math.PI * clamp01((ct - tE) / 1.2)) ** 0.6 : 0;
      const ch = ct >= tC && ct < tB ? (0.15 + 0.25 * sstep(tC, tB, ct)) : 0;
      su.uA.value = Math.min(0.4, Math.max(eq, ch)); su.uSeed.value = Math.floor(ct * 8) % 7; slabs.visible = su.uA.value > 0.01;
      // equip burst: three staggered pulses of 0.35 s
      let bk = -1, bi = 0;
      pulses.forEach((p, i) => { const k = (ct - p) / 0.35; if (k >= 0 && k < 1) { bk = k; bi = i; } });
      burst.visible = bk >= 0;
      if (bk >= 0) { ctx.seal.chest(chest); burst.userData.u.uCenter.value.copy(chest); bu.uK.value = bk; bu.uA.value = 0.4 * (1 - 0.25 * bi); bu.uSeed.value = bi + hash3(bi, 4) * 5; burst.userData.u.uSize.value.setScalar((1.8 + 0.5 * bi) * L.scale); }
    },
    dispose() { col.geometry.dispose(); colM.dispose(); for (const m of [flash, slabs, burst]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
