// E02 SEA + E03 COBBLED SQUARE + E16 FOOTPRINTS AND CRACKS: one painted ground plane, shaded per fragment. Layer 1 (the crack races,
// prints appear, the sea turns blue). It writes the set id 0.5 like the sky plate, so no set line is drawn at the horizon.
//
// MATHS (xz = world ground coords, dist = |P - camera|, fc = gl_FragCoord.xy)
//  land mask: r = |xz - (0,-150)| + 24 (fbm(xz/125) - .5);  land = 1 - smoothstep(392, 408, r)  (a ragged shore at ~400 m)
//  plain: mix(mean #423021, lit #7a5b3a, fbm) with craquelure  1 - smoothstep(0, .05, vor(xz * .11).y)  mixed to crater shade
//  square: |x| < 30, -30 < z < 40.  Cobbles 0.45 m, running bond: c = xz/.45; c.x += .5 mod(floor(c.y), 2); joint = 1 - smoothstep(jw/2, jw, min cell edge)
//          jw = clamp(dist * .0025, .04, .35) keeps the joints a minimum screen width; spolvero stipple: dots every 6 px on the shade side.
//  light: the sun is behind the Wall, so the square in front of it is in the Wall's shade, pushed toward ultramarine (x .58 .54 .85);
//         beyond the Wall the plain is gold-lit (x 1.15 1 .8). The shadow edge is soft over 4 m (the 0.16 sfumato).
//  crack race (f79-103): front zf = mix(3, -31, uCrack); corridor exp(-((x - wig)/cw)^2), cw = 2.5 + .16|z|;
//          Voronoi edges vor(xz * (.26,.2)).y: line < .04 is crater ink, the .04-.18 band is the ember glow #e96a2d, hottest at the tip.
//  footprints: 9 ellipses 9 m x 3.5 m; hatch = step(.8, fract((x cos a + z sin a)/.3)) at +-45 deg, only inside the print.
//  sea: ramp3(smoothstep(380, 2600, dist), near, mid, horizon); the copper sun path: lat = cross(rel, sunDir), width = along (.014 + .10 t)
//       tapering to a point at the camera; brush hatch 1 px every 6 px fading with distance; glint on threes (h21 of a cell + floor(8 t));
//       the blue wash: ring = floor(|xz - (0,-60)| / 90) * 90 (9 frames per ring), front = uSea * 2400.
//  haze: mix(col, #c77744, .55 (1 - e^{-dist/1100})): value compression of the far field.
import { V } from "../../../paint.js";
import { C, T, timing, smooth } from "./pal.js";

const FRAG = (tools) => /* glsl */ `
  uniform float uStep; uniform float uCrack; uniform float uGlowAmt; uniform float uSea; uniform float uDark; uniform vec4 uPrint[9];
  varying vec3 vWP;
  ${tools}
  const vec3 MEAN = ${V(C.groundMean)}; const vec3 PLIT = ${V(C.groundLit)}; const vec3 CRATER = ${V(C.crater)};
  const vec3 SLIT = ${V(C.stoneLit)}; const vec3 SMID = ${V(C.stoneMid)}; const vec3 SSHD = ${V(C.violetShade)}; const vec3 JOINT = ${V(C.joint)};
  const vec3 EMBER = ${V(C.crack)}; const vec3 HAZE = ${V(C.haze)}; const vec3 GLINT = ${V(C.glint)}; const vec3 COPPER = ${V(C.gold)};
  const vec3 SNEAR = ${V(C.seaNear)}; const vec3 SMIDC = ${V(C.seaMid)}; const vec3 SHOR = ${V(C.seaHor)};
  const vec3 BN = ${V(C.blueNear)}; const vec3 BF = ${V(C.blueFar)}; const vec3 FOAM = ${V(C.bone)};
  float hatch(vec2 p, float sp, float a) { return step(0.8, fract((p.x * cos(a) + p.y * sin(a)) / sp)); }
  void main() {
    vec2 xz = vWP.xz; vec2 fc = gl_FragCoord.xy;
    float dist = length(vWP - cameraPosition);
    float rl = length(xz - vec2(0.0, -150.0)) + 24.0 * (fbm(xz * 0.008) - 0.5);
    float land = 1.0 - smoothstep(392.0, 408.0, rl);

    // ---- gold-ground plaster plain (not a brown banner field). Near field lifts to charcoal paper.
    float n1 = fbm(xz * 0.07);
    vec3 col = mix(MEAN, PLIT, smoothstep(0.3, 0.75, n1) * 0.8 + vn(xz * 1.3) * 0.15);
    col = mix(col, COPPER, 0.18 * smoothstep(0.35, 0.8, fbm(xz * 0.04)));
    vec2 v = vor(xz * 0.11);
    float cr = 1.0 - smoothstep(0.0, max(0.04, fwidth(v.y) * 1.6), v.y);
    col = mix(col, CRATER, cr * 0.35);
    col = mix(col, PLIT, step(0.9, h21(floor(xz * 9.0))) * 0.16 * (1.0 - smoothstep(40.0, 200.0, dist)));
    col = mix(col, COPPER, step(0.97, h21(floor(xz * 14.0))) * 0.45 * (1.0 - smoothstep(20.0, 90.0, dist))); // gold-leaf flecks

    // ---- the cobbled square (E03)
    float sq = (1.0 - smoothstep(28.0, 30.5, abs(xz.x))) * smoothstep(-31.0, -29.5, xz.y) * (1.0 - smoothstep(38.0, 41.0, xz.y));
    vec2 c = xz / 0.45; c.x += mod(floor(c.y), 2.0) * 0.5;
    vec2 cell = floor(c), f = fract(c);
    float jd = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float jw = clamp(dist * 0.0025, 0.04, 0.35);
    float joint = 1.0 - smoothstep(jw * 0.5, jw, jd);
    float tone = h21(cell);
    vec3 cob = mix(SMID, SLIT, smoothstep(0.35, 0.95, tone) * 0.7);
    cob = mix(cob, SSHD, step(0.8, h21(cell + 3.7)) * 0.5);
    cob = mix(cob, JOINT, joint * 0.9);
    vec2 g = fract(fc / 6.0) - 0.5;                                              // spolvero stipple at 6 px
    cob = mix(cob, SSHD, (1.0 - smoothstep(0.17, 0.22, length(g))) * 0.35 * (1.0 - tone) * (1.0 - smoothstep(60.0, 160.0, dist)));
    cob = mix(cob, mix(SMID, JOINT, 0.12), smoothstep(40.0, 140.0, dist));      // far cobbles average out (no aliasing)
    col = mix(col, cob, sq);

    // ---- light: the sun is behind the Wall
    float zw = -30.0 - xz.x * xz.x / 900.0;
    float inFront = smoothstep(zw - 2.0, zw + 2.0, xz.y) * (1.0 - smoothstep(240.0, 340.0, abs(xz.x)));
    col *= mix(vec3(1.15, 1.0, 0.8), vec3(0.58, 0.54, 0.85) * mix(0.9, 1.25, smoothstep(-30.0, 60.0, xz.y)), inFront);

    // ---- footprints (E16): hatched craters, one per footfall
    for (int i = 0; i < 9; i++) {
      vec4 pr = uPrint[i];
      if (pr.w <= 0.0) continue;
      vec2 d = xz - pr.xy; float cs = cos(pr.z), sn = sin(pr.z);
      d = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
      float e = length(d / (vec2(1.75, 4.5) * (0.6 + 0.4 * pr.w)));
      float inside = 1.0 - smoothstep(0.9, 1.0, e);
      float rim = smoothstep(0.9, 1.0, e) * (1.0 - smoothstep(1.0, 1.2, e));
      float hh = max(hatch(xz, 0.3, 0.785), hatch(xz, 0.3, -0.785) * step(0.0, d.x));
      col = mix(col, CRATER, inside * 0.7);
      col = mix(col, vec3(0.05, 0.02, 0.015), inside * hh * 0.85);
      col = mix(col, PLIT * 1.2, rim * 0.45);
    }

    // ---- the crack race (f79-103): from the square to the Wall
    float zf = mix(3.0, -31.0, uCrack);
    float wig = 6.0 * (fbm(vec2(xz.y * 0.07, 2.3)) - 0.5);
    float cw = 2.5 + 0.16 * abs(xz.y);
    float corr = exp(-pow((xz.x - wig) / cw, 2.0));
    float vis = step(zf, xz.y) * step(xz.y, 6.0) * corr * step(0.001, uCrack);
    vec2 vc = vor(xz * vec2(0.26, 0.2) + vec2(0.0, 11.0));
    float line = 1.0 - smoothstep(0.012, 0.04, vc.y);
    float glw = 1.0 - smoothstep(0.04, 0.18, vc.y);
    float tip = 1.0 - smoothstep(0.0, 6.0, xz.y - zf);
    col = mix(col, CRATER, line * vis * 0.9);
    col += EMBER * (0.55 + 0.9 * tip) * glw * vis * uGlowAmt * (1.0 - 0.5 * line);

    // ---- the sea (E02): copper at the horizon fading to cold violet, a sun path, glints on threes
    float tt = smoothstep(380.0, 2600.0, dist);
    vec3 sea = ramp3(tt, SNEAR, SMIDC, SHOR);
    vec2 sd = vec2(0.2085, -0.978);
    vec2 rel = xz - cameraPosition.xz;
    float along = dot(rel, sd), lat = rel.x * sd.y - rel.y * sd.x;
    float wp = max(along, 1.0) * (0.014 + 0.10 * tt);
    float path = exp(-lat * lat / (wp * wp)) * step(0.0, along);
    sea = mix(sea, COPPER, path * 0.65);
    sea *= 1.0 - step(fract(fc.y / 6.0), 0.17) * 0.16 * (1.0 - smoothstep(500.0, 3000.0, dist));   // brush hatch, 1 px every 6
    vec2 gc = floor(vec2(xz.x / (1.5 + dist * 0.012), xz.y / (0.6 + dist * 0.004)));
    sea += GLINT * step(0.965, h21(gc + floor(uStep * 8.0) * 3.17)) * path * 1.2;
    float dg = length(xz - vec2(0.0, -60.0));
    float front = uSea * 2400.0, ring = floor(dg / 90.0) * 90.0;
    float wash = (1.0 - smoothstep(front - 90.0, front, ring)) * step(0.001, uSea);
    sea = mix(sea, mix(BN, BF, smoothstep(300.0, 2200.0, dist)), wash * 0.92);
    float foam = (1.0 - smoothstep(0.0, 5.0, abs(rl - 400.0))) * hatch(xz, 1.4, 0.0);
    sea = mix(sea, FOAM, foam * 0.55);

    // ---- compose, haze, strike-dark
    col = mix(sea, col, land);
    col = mix(col, HAZE, 0.48 * (1.0 - exp(-dist / 900.0)));
    col = mix(col, COPPER, 0.12 * (1.0 - exp(-dist / 1400.0)));
    float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= min(1.0, 0.92 / max(Y, 1e-4));
    col = mix(col, col * vec3(0.5, 0.54, 0.78), uDark);
    gl_FragColor = vec4(col, 0.5);
  }`;

export function buildTerrain(ctx) {
  const { THREE } = ctx;
  const H = timing(ctx);
  const tools = ctx.tools.glslFor(["noise"]);
  const prints = Array.from({ length: 9 }, () => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uStep: { value: 0 }, uCrack: { value: 0 }, uGlowAmt: { value: 1 }, uSea: { value: 0 }, uDark: { value: 0 }, uPrint: { value: prints },
    },
    vertexShader: "varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${FRAG(tools)}`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), mat);
  mesh.position.y = -0.02; mesh.frustumCulled = false; mesh.renderOrder = -15;
  mesh.userData.layer = 1;
  const group = new THREE.Group(); group.add(mesh);
  return {
    group,
    update(t, dt, cue) {
      const u = mat.uniforms;
      u.uStep.value = t;
      u.uCrack.value = H.prog("crack", T.crack[0], T.crack[1], t, cue);
      // the glow fades once the gap has opened and the sea takes the light
      u.uGlowAmt.value = 1 - 0.8 * smooth(T.gap[0], T.gap[1], t);
      u.uSea.value = H.prog("gap", T.gap[0], T.gap[1], t, cue);
      u.uDark.value = 0.55 * (t >= T.dark[0] ? 1 : 0) * (1 - smooth(7.1, 8.0, t));
      // one footprint per footfall, 9 m x 3.5 m, one per 3.3 m of z from z = -41
      const { n, s } = H.foot(t, cue);
      for (let i = 0; i < 9; i++) {
        const p = prints[i];
        if (i <= n) p.set(i % 2 ? 9 : -9, -41 - 3.3 * i, 0.15 * (i % 2 ? 1 : -1), i === n ? Math.min(1, s / 0.25) : 1);
        else p.set(0, 0, 0, 0);
      }
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
