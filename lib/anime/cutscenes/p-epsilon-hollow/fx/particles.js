// PARTICLE SYSTEMS (cel flecks: hard squares and diamonds, no soft sprites; every position a pure function of the stepped clock uT).
//
//   motes    violet #7a3fc0 flecks 0.04 m, rising 0.2 m/s, on threes. y = mod(y0 + 0.2 t, 7), drift = 0.3 m sines, culled inside 3 m of the pup (L2).
//   embers   gold #ffd54a / #ffb524 diamonds orbiting the held shard (ref 04's ember language). Life 2.4 s, phase = fract(seed + t/2.4):
//            p = base + axis * L * r0 + (side cos a + side2 sin a) * (0.13 + 0.12 ph r1) + up 0.5 ph,   a = 2 pi r0 + 2 ph.
//   pour     teal #19e6c8 / #7affea: 6.4-9.0 it rises up a narrowing spiral column from the sleeper (h = H ph, radius 0.12 + 0.28 (1 - ph) r1),
//            then settles: p.y -> 0.05 + 0.1 r1 as uSettle goes 0 -> 1 over 9.0-10.5 and the population drains. Shot 6: "teal pours then settles".
//   sparks   shot 9: the 31 PR numbers rise from the plinth arc as 0.12 m glyph sparks at 0.4 m/s, gold, on twos. The arc: three rows at
//            5, 6.95, 8.9 m behind the pup, +-75 deg; glyph = canvas atlas cell (point-sprite, alpha-tested).
//   debris   27.0: the petrified stone cracks gold and falls away in 6 frames: a ring (3.5-6 m) of gold and stone-violet chips under gravity.
import { points } from "./kit.js";
import { toWorld, dirToWorld, swingTheta } from "./frame.js";

// the real closed-unmerged PR numbers on the plinths (graves.js order), "Epsilon-Hollow #268" first, "topograph #422" last
export const PR_NUMBERS = [268, 267, 265, 263, 259, 256, 255, 253, 251, 2, 249, 248, 245, 242, 238, 235, 233, 232, 229, 214, 212, 205, 17456, 3461, 3460, 3458, 11147, 46539, 706, 3423, 422];

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SLEEPER = [2.3, 0, -1.4]; // bible 3.6: the sleeper god-form instance 0 at x 2.3, z -1.4 (world offsets from the pole)

export function motes(ctx, T) {
  const { THREE } = ctx;
  const o = points(ctx, {
    n: 260, seed: 11, shape: 0,
    uniforms: { uC: { value: new THREE.Vector3() }, uOn: { value: 1 }, uCol: { value: new THREE.Color("#7a3fc0") } },
    place: /* glsl */ `
      uniform vec3 uC; uniform float uOn; uniform vec3 uCol;
      void place(out vec3 p, out float size, out vec3 col, out float alive) {
        vec2 xz = (vec2(aS.x, aS.y) * 2.0 - 1.0) * 16.0;
        float y = mod(aS.z * 7.0 + 0.2 * uT, 7.0);
        xz += 0.3 * vec2(sin(uT * 0.5 + aS.w * 20.0), cos(uT * 0.4 + aS.z * 20.0));
        p = uC + vec3(xz.x, y, xz.y);
        float edge = 1.0 - pow(abs(y / 3.5 - 1.0), 4.0);                  // fade at the wrap
        size = 0.04 * edge * (0.7 + 0.6 * aS.w);
        col = uCol * (aS.w > 0.85 ? 1.35 : 1.0);
        alive = length(xz) > 3.0 ? uOn : 0.0;                              // L2: clear 3 m round the pup
      }`,
  });
  return { obj: o, update(ts3) { o.material.uniforms.uT.value = ts3; o.material.uniforms.uC.value.set(ctx.seal.at[0], ctx.seal.at[1], ctx.seal.at[2]); } };
}

export function energy(ctx, T) {
  const { THREE } = ctx, v = new THREE.Vector3(), a = new THREE.Vector3(), g = new THREE.Group();
  const embers = points(ctx, {
    n: 150, seed: 23, shape: 1,
    uniforms: { uBase: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3(0, 1, 0) }, uLen: { value: 1.9 }, uOn: { value: 0 }, uC0: { value: new THREE.Color("#ffd54a") }, uC1: { value: new THREE.Color("#ffb524") } },
    place: /* glsl */ `
      uniform vec3 uBase; uniform vec3 uAxis; uniform float uLen; uniform float uOn; uniform vec3 uC0; uniform vec3 uC1;
      void place(out vec3 p, out float size, out vec3 col, out float alive) {
        float k = aS.x + uT / 2.4, ph = fract(k), id = floor(k);
        float r0 = hh(aS.y * 91.0 + id), r1 = hh(aS.z * 57.0 + id * 1.7);
        vec3 side = normalize(cross(uAxis, vec3(0.3, 0.0, 1.0))), side2 = cross(uAxis, side);
        float ang = r0 * 6.2832 + ph * 2.0, rad = 0.13 + 0.12 * ph * r1;
        p = uBase + uAxis * uLen * r0 + (side * cos(ang) + side2 * sin(ang)) * rad + vec3(0.0, 0.5 * ph, 0.0);
        col = mix(uC0, uC1, floor(ph * 3.0) / 2.0) * 1.25;                 // stepped ember cooling, slightly emissive
        size = 0.05 * (1.0 - ph * 0.8) * (0.6 + 0.8 * r1);
        alive = uOn;
      }`,
  });
  const pour = points(ctx, {
    n: 130, seed: 29, shape: 0,
    uniforms: { uBase: { value: new THREE.Vector3() }, uAmt: { value: 0 }, uSettle: { value: 0 }, uH: { value: 1 }, uC0: { value: new THREE.Color("#19e6c8") }, uC1: { value: new THREE.Color("#7affea") } },
    place: /* glsl */ `
      uniform vec3 uBase; uniform float uAmt; uniform float uSettle; uniform float uH; uniform vec3 uC0; uniform vec3 uC1;
      void place(out vec3 p, out float size, out vec3 col, out float alive) {
        float k = aS.x + uT / 1.2, ph = fract(k), id = floor(k);
        float r0 = hh(aS.y * 91.0 + id), r1 = hh(aS.z * 57.0 + id * 1.7);
        float ang = r0 * 6.2832 + ph * 5.0, rad = 0.12 + 0.28 * (1.0 - ph) * r1;
        p = uBase + vec3(cos(ang) * rad, uH * ph, sin(ang) * rad);
        p.y = mix(p.y, uBase.y + 0.05 + 0.1 * r1, uSettle);                   // settles to the ground
        col = (r1 > 0.6 ? uC1 : uC0) * 1.15;
        size = 0.06 * (1.0 - ph * 0.5);
        alive = aS.w < uAmt ? 1.0 : 0.0;
      }`,
  });
  g.add(embers, pour);
  const seal = ctx.seal;
  return {
    obj: g,
    update(ts, t) {
      const eU = embers.material.uniforms, pU = pour.material.uniforms;
      eU.uT.value = ts; pU.uT.value = ts;
      const [b0, b1] = T.pour, [e0] = T.embers;
      // blade anchor: the shard rises from the sleeper 1.0 m/s over 6.4-9.0, then is held overhead
      if (t < 9.0) { eU.uBase.value.set(seal.at[0] + SLEEPER[0], seal.at[1] - 1.9 + Math.min(Math.max(t - b0, 0), b1 - b0), seal.at[2] + SLEEPER[2]); eU.uAxis.value.set(0, 1, 0); }
      else {
        toWorld(seal, 0, 0.85, 0.15, v); eU.uBase.value.copy(v);
        const th = swingTheta(t);
        dirToWorld(seal, 0, Math.cos(th), Math.sin(th), a); eU.uAxis.value.copy(a);
      }
      eU.uLen.value = 1.9 * seal.scale;
      eU.uOn.value = t >= e0 && t < T.wipe[0] ? 1 : 0;
      // pour: ramp in over the first 0.4 s, drain with the settle
      const settle = sstep(b1, b1 + 1.5, t);
      pU.uBase.value.set(seal.at[0] + SLEEPER[0], seal.at[1], seal.at[2] + SLEEPER[2]);
      pU.uH.value = 1.0 + Math.min(Math.max(t - b0, 0), b1 - b0);
      pU.uSettle.value = settle;
      pU.uAmt.value = t < b0 ? 0 : sstep(b0, b0 + 0.4, t) * (1 - settle);
    },
  };
}

function glyphAtlas(THREE) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.font = "bold 50px Georgia, serif";
  PR_NUMBERS.forEach((n, i) => g.fillText("#" + n, (i % 8) * 128 + 64, Math.floor(i / 8) * 128 + 64));
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}

export function sparks(ctx, T) {
  const { THREE } = ctx;
  const o = points(ctx, {
    n: 90, seed: 31, shape: 2, tex: glyphAtlas(THREE), grid: [8, 4],
    uniforms: { uC: { value: new THREE.Vector3() }, uYaw: { value: 0 }, uSc: { value: 1 }, uOn: { value: 0 }, uCol: { value: new THREE.Color("#ffb524") } },
    place: /* glsl */ `
      uniform vec3 uC; uniform float uYaw; uniform float uSc; uniform float uOn; uniform vec3 uCol;
      void place(out vec3 p, out float size, out vec3 col, out float alive) {
        float row = floor(aS.w * 3.0), R = 5.0 + row * 1.95;
        float ang = (aS.y * 2.0 - 1.0) * 1.31;                              // +-75 deg about straight behind
        vec2 loc = vec2(sin(ang), -cos(ang)) * R;
        vec2 w = vec2(loc.x * cos(uYaw) + loc.y * sin(uYaw), -loc.x * sin(uYaw) + loc.y * cos(uYaw)) * uSc;
        float cyc = 3.0 + 1.5 * aS.z, ph = fract(aS.x + uT / cyc);
        float y = 0.45 + 0.4 * ph * cyc;                                    // 0.4 m/s rise from the plinth top (0.42 m)
        p = uC + vec3(w.x, y, w.y);
        size = 0.30 * (ph < 0.12 ? ph / 0.12 : (ph > 0.8 ? (1.0 - ph) / 0.2 : 1.0));   // glyph cap height ~0.12 m in a 0.30 m cell
        col = uCol * 1.15;
        alive = uOn;
      }`,
  });
  return {
    obj: o,
    update(ts, t) {
      const u = o.material.uniforms;
      u.uT.value = ts; u.uYaw.value = ctx.seal.yaw; u.uSc.value = ctx.seal.scale;
      u.uC.value.set(ctx.seal.at[0], ctx.seal.at[1], ctx.seal.at[2]);
      u.uOn.value = t >= T.sparks[0] && t < T.sparks[1] + 0.6 ? 1 : 0;
    },
  };
}

export function debris(ctx, T) {
  const { THREE } = ctx;
  const o = points(ctx, {
    n: 72, seed: 41, shape: 0,
    uniforms: { uC: { value: new THREE.Vector3() }, uAge: { value: -1 }, uGold: { value: new THREE.Color("#ffb524") }, uStone: { value: new THREE.Color("#5a4a63") } },
    place: /* glsl */ `
      uniform vec3 uC; uniform float uAge; uniform vec3 uGold; uniform vec3 uStone;
      void place(out vec3 p, out float size, out vec3 col, out float alive) {
        float ang = aS.x * 6.2832, R = 3.5 + aS.y * 2.5;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec3 b = uC + vec3(dir.x * R, 0.05 + 0.3 * aS.z, dir.y * R);
        float age = uAge - 0.04 * floor(aS.w * 6.0);                        // staggered across 6 frames
        vec3 v = vec3(dir.x * (0.4 + aS.w), 2.0 + 3.0 * aS.z, dir.y * (0.4 + aS.w));
        p = b + v * max(age, 0.0) + vec3(0.0, -4.9 * age * age, 0.0);
        p.y = max(p.y, 0.03);                                               // chips settle on the ground
        bool gold = aS.z < 0.35;
        col = gold ? uGold * 1.5 : uStone;
        size = (0.07 + 0.07 * aS.y) * (1.0 - smoothstep(1.0, 1.6, age));
        alive = age > 0.0 && age < 1.6 ? 1.0 : 0.0;
      }`,
  });
  return {
    obj: o,
    update(ts, t) {
      const u = o.material.uniforms;
      u.uT.value = ts; u.uAge.value = t - T.debris[0]; u.uC.value.set(ctx.seal.at[0], ctx.seal.at[1], ctx.seal.at[2]);
    },
  };
}
