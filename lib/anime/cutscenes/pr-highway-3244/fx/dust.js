// RACE DUST (Fate/Zero, Ufotable). Cel puffs streaming past the Gordius Wheel.
// Visible as idle heat-dust from t=0 so the still names; heavy after launch so the race holds at 8 s.
// TOOLKIT: engine/anime:lib/anime/fx/particle-cells.js  (local adapter: same hard-disc cel puff)
//
// MATHS
//   puff in point-sprite polar: R(a) = 0.74 + 0.11 sin(3a+s) + 0.06 sin(5a+2s)
//   discard r > R, and a swirl notch sin(2a - 5r + 1.7s) > 0.88 when r > 0.4
//   3-tone: lit #ffd8a8, shade #c08060 where p·(-0.5,0.8) < -0.15, rim #fff0d0 near the lit lip
//   ink #241a2a in the outer 0.09 of R. Cutoff, never a soft falloff. fwidth on the rim only.
//   spawn: 90 puffs, treadmill-scrolled, never inside 1.6 m of the seal axis.
import { points, hash } from "./lib.js";

export const meta = {
  name: "dust-plume-ring",
  params: {
    count: { default: 90 },
    ink: { default: "#241a2a" },
    lit: { default: "#ffd8a8" },
    shade: { default: "#c08060" },
  },
};

const FRAG = /* glsl */ `
void main(){
  vec2 p = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  float r = length(p), a = atan(p.y, p.x);
  float R = 0.74 + 0.11 * sin(3.0 * a + vSeed) + 0.06 * sin(5.0 * a + 2.0 * vSeed);
  if (r > R) discard;
  if (r > 0.40 && sin(2.0 * a - 5.0 * r + vSeed * 1.7) > 0.88) discard;
  vec3 INK = vec3(0.141, 0.102, 0.165), LIT = vec3(1.0, 0.847, 0.659), SH = vec3(0.753, 0.502, 0.376), RIM = vec3(1.0, 0.941, 0.816);
  vec3 c = LIT;
  float d = dot(p, normalize(vec2(-0.5, 0.8)));
  if (d < -0.15 + 0.1 * sin(a * 2.0 + vSeed)) c = SH;
  if (r > R - 0.16 && d > 0.25) c = RIM;
  float w = fwidth(r) * 1.2 + 1e-4;
  if (r > R - 0.09 - w) c = mix(c, INK, smoothstep(R - 0.09, R - 0.04, r));
  gl_FragColor = vec4(c, 1.0);
}`;

export function create(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "gordius-dust";
  const puff = points(90, { fragBody: FRAG, order: 23 });
  group.add(puff.pts);
  for (let i = 0; i < 90; i++) puff.seed.setX(i, hash(i, 11) * 6.283);
  const W = (x, y, z) => {
    const S = ctx.seal, s = Math.sin(S.yaw), c = Math.cos(S.yaw);
    return [S.at[0] + x * c + z * s, S.at[1] + y, S.at[2] - x * s + z * c];
  };
  const dbs = new THREE.Vector2();
  return {
    group,
    update(t, cue) {
      const launch = 8.25;
      const speed = Number(cue?.rig?.speed) || (t > launch ? 44 : 0);
      const heavy = t >= launch ? 1 : 0.35;
      try { ctx.engine.renderer.getDrawingBufferSize(dbs); } catch { dbs.set(1280, 720); }
      puff.mat.uniforms.uH.value = dbs.y || 720;
      for (let i = 0; i < 90; i++) {
        const life = 1.1 + hash(i, 2) * 0.9;
        const phase = (t * (0.35 + heavy * 0.8) + hash(i, 1) * life) % life;
        const u = phase / life;
        const side = hash(i, 3) < 0.5 ? -1 : 1;
        const x = side * (1.8 + hash(i, 4) * 6.5);
        const z = -2.2 - hash(i, 5) * 14 - u * (4 + speed * 0.12);
        const y = 0.12 + 0.55 * u * (1 - 0.3 * u);
        if (Math.hypot(x, z) < 1.6) { puff.size.setX(i, 0); continue; }
        const p = W(x, y, z);
        puff.pos.setXYZ(i, p[0], p[1], p[2]);
        puff.size.setX(i, (0.22 + 1.1 * (1 - (1 - u) * (1 - u))) * (1 - Math.max(0, u - 0.75) / 0.25) * heavy);
      }
      puff.flush();
    },
    dispose() { puff.dispose(); },
  };
}

export function buildDust(ctx) { return create(ctx); }
