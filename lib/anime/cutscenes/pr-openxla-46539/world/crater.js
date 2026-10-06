// THE CRATER (bible 3: "keep the crater": a glowing XLA geyser crater the Nomu rises from; the two answers, then one).
// Static: a lip of rubble boulders round r 3.1..4.4 m (layer 0). Live (layer 1, pure functions of the stepped time):
// PIT DISC  CircleGeometry r = 3.2 at y = 0.06, unlit, written with set id 0.5:
//   q = (uv - .5) 2, r = |q|; heat = (1 - r) + 0.15 (fbm(4 q + 0.6 ts) - .5)
//   cel3(heat, .25, .62, #1a0a08, #7a2a10, #ffcf20), then a core #fff2a0 x 1.6 where heat > 0.82 (blooms)
//   cracks = 1 - smoothstep(.02, .09, vor(5 q + 2).y) in #ff8a20; the vor seed steps on twos
//   XLA RING at r = 0.87 (half-width .035), 10 dashes round it, drifting 0.1 turn/s: the cyan half (#19d3ff) and the magenta half
//   (#ec2a8a) are the two runs, two answers; uGold wipes them to one stable gold #ffc800 (a hard edge sweeping round by angle)
//   all of it scaled by uPow (the crater breathes: 0.55 + 0.45 pulse; the smash drains it, the gold reignites it)
// GEYSER    open cylinder r 1.4 (base) -> 0.5 (top), 16 m, additive, drawn up to uH of its height (a ragged top):
//   two helical ribbons, v = height 0..1:  A = step(.88, .5 + .5 sin(4 pi u + 5 v - 5 ts)) cyan, B = the same + pi magenta,
//   body = #ff8a20 / #ffcf20 strands by step(.45, strand);  I = (1 - v)^0.6 smoothstep(0, .1, v) 0.55 uPow;  uGold turns ribbons gold.
// GLOW  one additive billboard over the mouth, 12 m, flickering.
import { CircleGeometry, CylinderGeometry, Group, Mesh, ShaderMaterial, Color } from "three";
import { boulder, rng as krng } from "../../../kit3d.js";
import { C } from "./palette.js";
import { V, ADD, sm, lerp, mergeSolid, glowSprite, faceCamera } from "./lib.js";
import { CRATER } from "./layout.js";

const HEIGHT = 16;

export function buildCrater(ctx) {
  const { engine } = ctx;
  const group = new Group();
  const glsl = ctx.tools.glslFor(["noise", "cel"]);

  // the lip (static)
  const lip = [], R = krng(4653);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + R() * 0.2, d = CRATER.r + 0.1 + R() * 1.1, s = 0.5 + R() * 0.7;
    lip.push(boulder([s * 1.3, s * 0.8, s], [CRATER.x + Math.cos(a) * d, s * 0.25, CRATER.z + Math.sin(a) * d], i + 5, 1.1));
  }
  group.add(mergeSolid(engine, lip, C.rubMid, C.rubShade, 0.52, "lip"));

  // the pit disc
  const pit = new Mesh(new CircleGeometry(CRATER.r, 48).rotateX(-Math.PI / 2), new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uPow: { value: 1 }, uGold: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uT; uniform float uPow; uniform float uGold; varying vec2 vUv; ${glsl}
      void main() {
        vec2 q = (vUv - 0.5) * 2.0; float r = length(q);
        float heat = (1.0 - r) + 0.15 * (fbm(q * 4.0 + uT * 0.6) - 0.5);
        vec3 col = cel3(heat, 0.25, 0.62, ${V("#1a0a08")}, ${V(C.fireHole)}, ${V(C.fireMid)});
        col = mix(col, ${V(C.fireCore)} * 1.6, celStep(heat, 0.82));
        vec2 vv = vor(q * 5.0 + 2.0 + floor(uT * 12.0) * 0.07);
        col = mix(col, ${V(C.fireEdge)} * 1.2, (1.0 - smoothstep(0.02, 0.09, vv.y)) * step(0.15, heat));
        // the XLA ring: two answers (cyan, magenta) that become one (gold)
        float a = atan(q.y, q.x);
        float ring = 1.0 - smoothstep(0.0, 0.035, abs(r - 0.87));
        float dash = step(0.35, fract(a / 6.2832 * 10.0 + uT * 0.1));
        vec3 two = a > 0.0 ? ${V(C.cyan)} : ${V(C.magenta)};
        float goldK = step(a / 6.2832 + 0.5, uGold * 1.02);
        vec3 rc = mix(two, ${V(C.gold)}, goldK) * 1.3;
        col = mix(col, rc, ring * dash);
        col *= 0.35 + 0.65 * uPow;
        gl_FragColor = vec4(col, 0.5);
      }`,
  }));
  pit.position.set(CRATER.x, 0.06, CRATER.z); pit.userData.layer = 1; pit.frustumCulled = false; group.add(pit);

  // the geyser
  const gey = new Mesh(new CylinderGeometry(0.5, 1.4, HEIGHT, 28, 1, true).translate(0, HEIGHT / 2, 0), new ShaderMaterial({
    ...ADD, side: 2,
    uniforms: { uT: { value: 0 }, uH: { value: 0 }, uPow: { value: 1 }, uGold: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = vec2(uv.x, uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // CylinderGeometry: uv.y is 1 at the top, 0 at the bottom
    fragmentShader: `uniform float uT; uniform float uH; uniform float uPow; uniform float uGold; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main() {
        float v = vUv.y, u = vUv.x;
        float rag = 0.06 * (h21(vec2(floor(u * 18.0), floor(uT * 12.0))) - 0.5);
        if (v > uH + rag) discard;
        float strand = 0.5 + 0.5 * sin(u * 6.2832 * 3.0 + v * 7.0 - uT * 6.0);
        vec3 col = mix(${V(C.fireEdge)}, ${V(C.fireMid)}, step(0.45, strand));
        float A = step(0.88, 0.5 + 0.5 * sin(u * 12.566 + v * 5.0 - uT * 5.0));
        float B = step(0.88, 0.5 + 0.5 * sin(u * 12.566 + v * 5.0 - uT * 5.0 + 3.1416));
        vec3 ca = mix(${V(C.cyan)}, ${V(C.gold)}, uGold), cb = mix(${V(C.magenta)}, ${V(C.gold)}, uGold);
        col = mix(col, ca, A); col = mix(col, cb, B);
        float I = pow(max(1.0 - v, 0.0), 0.6) * smoothstep(0.0, 0.1, v) * 0.55 * uPow;
        gl_FragColor = vec4(col * I * 1.3, 0.0);
      }`,
  }));
  gey.position.set(CRATER.x, 0.05, CRATER.z); gey.userData.layer = 1; gey.frustumCulled = false; gey.renderOrder = 4; group.add(gey);

  const glow = glowSprite(C.fireEdge, 2.0); glow.scale.set(12, 12, 1); glow.position.set(CRATER.x, 2.2, CRATER.z); faceCamera(glow); group.add(glow);

  return {
    group,
    // tRise: the Nomu rises (geyser up), tSmash: the strike drains it, tGold: the two answers become one
    update(ts, tRise, tSmash, tGold) {
      const pulse = 0.5 + 0.5 * Math.sin(ts * 5.0 + Math.floor(ts * 12) * 0.7);
      const rise = sm(0, 0.9, ts - tRise), drain = sm(0, 0.5, ts - tSmash), regold = sm(0, 1.4, ts - tGold);
      const hUp = lerp(0.12, 1, rise);
      const H = ts < tSmash ? hUp * (0.88 + 0.12 * pulse) : lerp(hUp, 0.15, drain);
      const pow = (0.55 + 0.45 * pulse) * (ts < tSmash ? 1 : lerp(1, 0.4, drain)) + 0.6 * regold;
      pit.material.uniforms.uT.value = ts; pit.material.uniforms.uPow.value = Math.min(1, pow); pit.material.uniforms.uGold.value = regold;
      gey.material.uniforms.uT.value = ts; gey.material.uniforms.uH.value = H; gey.material.uniforms.uPow.value = Math.min(1, pow); gey.material.uniforms.uGold.value = regold;
      glow.material.uniforms.uA.value = 0.5 * Math.min(1, pow) * (0.8 + 0.4 * pulse);
    },
    dispose() { pit.geometry.dispose(); pit.material.dispose(); gey.geometry.dispose(); gey.material.dispose(); glow.geometry.dispose(); glow.material.dispose(); },
  };
}
