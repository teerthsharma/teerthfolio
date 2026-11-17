// HITS for pr-polychrom-79: each hit as a flat impact panel (negative frame, gold rings, spikes and a red ring at Ea's hilt or tip), the swap plates, the flash and its two ink frames,
// the back's closing rings, the rip's cracks, the volley streaks. Ea and the wind are 3D (cast/ea.js, world/wind.js); the tear is the one screen pull (polyTear).
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { hash } from "../live/parts.js";
import { BACK, DOCK, DOME, F, GATE_AT, HIT, T, smooth } from "../clock.js";
import { eaFrame } from "../cast/eaframe.js";
import { PAL } from "../pal.js";

await loadPack("cuts");
const TAU = Math.PI * 2, STAY = 7 / 24, RINGS = [0.08, 0.16, 0.25, 0.35, 0.46];
const SIL = rgb(PAL.sil), GOLD = rgb(PAL.goldHi), RED = rgb(PAL.redHot), FLASH = rgb(PAL.flash), CORE = PAL.core;
const PLATE = new Set(["turn", "back"]), AT = new Vector3(...DOCK);
const AIM = [-0.819, -0.574], PERP = [0.574, -0.819];
const fr = (x) => x - Math.floor(x);
const hash21 = (x, y) => { let px = fr(x * 123.34), py = fr(y * 456.21); const d = px * (px + 45.32) + py * (py + 45.32); px += d; py += d; return fr(px * py); };
const SEED = 79 * 0.137;
const plH = (x, y) => hash21(x + SEED, y + SEED);
const valueNoise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy), b = hash21(ix + 1, iy), c = hash21(ix, iy + 1), d = hash21(ix + 1, iy + 1);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
};
// the shader's tear edge at a (along the aim) for seed 79, so the ink lip sits on the void's edge
const tearJag = (a) => (plH(Math.floor(a * 22), 5) - 0.5) * 0.05 + (valueNoise(a * 9, 79) - 0.5) * 0.04;
const OVER_V = "varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const overFrag = (pull) => `${glslFor([pull])}
uniform float uT; varying vec2 vN;
void main() {
  vec3 c = ${pull}(vec3(0.0), vN * 0.5 + 0.5, uT);
  if (max(c.r, max(c.g, c.b)) < 0.004) discard;
  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
}`;

const circle = (cx, cy, R, n = 56) => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * TAU; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
const ring = (B, cx, cy, R, w, col) => { const p = circle(cx, cy, R); B.ribbon(p, p.map(() => w / 2), col); };
function spikes(B, cx, cy, n, r0, seed, col, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.8 * hash(i, seed)) / n) * TAU, r = r0 * (0.7 + 0.7 * hash(i, seed + 1)), w = (0.02 + 0.17 * hash(i, seed + 2) ** 2) * k, dx = Math.cos(a), dy = Math.sin(a);
    B.tri(cx + dx * r, cy + dy * r, cx + dx * 2.6 - dy * w / 2, cy + dy * 2.6 + dx * w / 2, cx + dx * 2.6 + dy * w / 2, cy + dy * 2.6 - dx * w / 2, col);
  }
}
// a blade from (x, y) along ang: a rim copy 1.22 times larger first, then the ink body (a fan of its outline)
function blade(B, x, y, ang, len, wid, rim) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const shape = (k) => [[0, 0.5], [0.62, 0.5], [1, 0], [0.62, -0.5], [0, -0.5]].map(([s, w]) => [x + ux * len * k * s + nx * wid * k * w, y + uy * len * k * s + ny * wid * k * w]);
  B.fan(x, y, shape(1.22), rim);
  B.fan(x, y, shape(1), SIL);
}

// does segment p (frame heights, y down) pass through the box b (frame fractions x0 y0 x1 y1)?
const crosses = (p, b, A) => Array.from({ length: 25 }, (_, i) => i / 24).some((u) => {
  const x = (p[0][0] + (p[1][0] - p[0][0]) * u) / A, y = p[0][1] + (p[1][1] - p[0][1]) * u;
  return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
});

export function buildHits(ctx) {
  const group = new Group(), V = new Vector3(), beats = ctx.scene?.beats ?? [];
  const panelsB = beats.filter((b) => b.name === "panel"), gathers = beats.filter((b) => b.name === "gather");
  const poofs = beats.filter((b) => b.name === "poof"), fores = beats.filter((b) => b.name === "fore");

  const toFrame = (w, A) => { const c = ctx.player?.camera; if (!c) return null; V.copy(w).project(c); return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * A, 0.5 - V.y * 0.5]; };
  const centre = (at, A, t) => {
    const cam = ctx.player?.camera;
    if ((at === "hilt" || at === "tip") && cam) {
      const f = eaFrame(t, cam.fov, cam.aspect), th = Math.tan((cam.fov * Math.PI) / 360);
      const n = at === "hilt" ? [f.hilt[0] / (f.hilt[2] * th * cam.aspect), f.hilt[1] / (f.hilt[2] * th)] : f.tipNdc;
      return [((n[0] + 1) / 2) * A, 1 - (n[1] + 1) / 2];
    }
    let w = null;
    if (at === "chest") w = ctx.seal.chest(new Vector3());
    else if (at === "hand") w = ctx.seal.named?.().handR ?? null;
    else if (at === "vault") w = new Vector3(...GATE_AT).multiplyScalar(DOME.k).add(AT);
    return (w && toFrame(w, A)) || (Array.isArray(at) ? [at[0] * A, at[1]] : [A / 2, 0.5]);
  };
  const box = () => ctx.player?.box ?? null;

  function impact(B, b, ts, A) {
    const age = ts - b.t;
    if (age < -1e-6 || age >= b.dur + STAY) return;
    const f = Math.floor(age * 24 + 1e-6), edge = b.kind === "ea" || b.kind === "blast" ? RED : GOLD;
    if (b.kind === "back") return closing(B, A, f);
    const [cx, cy] = centre(b.at, A, b.t), seed = Math.round(b.t * 10);
    if (age >= b.dur - 1e-6) {
      const k = 1 - (age - b.dur) / STAY;
      for (const [dx, dy, ang, len, wid] of b.strokes ?? []) blade(B, cx + dx, cy + dy, ang + 0.02, len, wid * (0.25 + 0.3 * k), edge);
      return;
    }
    if (f === 0) {
      if (b.kind !== "turn") B.rect(0, 0, A, 1, SIL);
      for (const R of RINGS) ring(B, cx, cy, R, 0.012, GOLD);
      B.fan(cx, cy, circle(cx, cy, 0.05, 16), CORE);
      spikes(B, cx, cy, 44, 0.24, seed, GOLD);
    } else if (b.kind === "blast") {
      spikes(B, cx, cy, 88, 0.24 + 0.07 * f, seed + f * 7, CORE);
      spikes(B, cx, cy, 44, 0.24 + 0.07 * f, seed + f * 7 + 3, GOLD);
      ring(B, cx, cy, 0.12 + 0.05 * f, 0.012, RED);
    } else if (b.fill === false) {
      spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, GOLD);
      if (b.kind === "ea") ring(B, cx, cy, 0.12 + 0.05 * f, 0.012, RED);
    } else {
      B.rect(0, 0, A, 1, GOLD);
      for (const R of RINGS) ring(B, cx, cy, R, 0.012, SIL);
      spikes(B, cx, cy, 44, 0.24 + 0.05 * f, seed + f * 7, SIL);
      blade(B, cx, cy, hash(seed, 3) * TAU, 0.35 + 0.25 * f, 0.09, edge);
    }
    for (const [dx, dy, ang, len, wid] of b.strokes ?? []) blade(B, cx + dx, cy + dy, ang + (f - 1) * 0.02, len, wid, edge);
  }

  // the back: opaque flash then ink plates (frames 0 and 1), then gold rings closing on the seal's box with flecks (frames 2 to 5), so the King's shrink reads
  function closing(B, A, f) {
    if (f < 0 || f > 5) return;
    const bx = box(), bh = bx ? bx[3] - bx[1] : 0.5, cx = bx ? ((bx[0] + bx[2]) / 2) * A : A / 2, cy = bx ? (bx[1] + bx[3]) / 2 : 0.5;
    if (f <= 1) {
      B.rect(0, 0, A, 1, f === 0 ? FLASH : SIL);
      if (f === 0) spikes(B, cx, cy, 36, bh * 0.5, 5, GOLD);
      for (const k of [1, 0.7, 0.4]) ring(B, cx, cy, bh * (0.9 - 0.5 * f) * k, 0.03, f === 0 ? SIL : GOLD);
      return;
    }
    const g = f - 2, R = bh * (0.8 - 0.1 * g);
    for (const k of [1, 0.7, 0.4]) ring(B, cx, cy, R * k, 0.03, GOLD);
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 71) * TAU, d = bh * (0.4 + 0.15 * g) * (0.6 + hash(i, 72));
      blade(B, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5, a, 0.05, 0.012, GOLD);
    }
  }

  // the rip's ink-and-gold lip: the two edges of polyTear's gap (same jag, same width) drawn as cel ribbons, a gold seam just inside each
  function tearLip(B, t, A) {
    const k = smooth(HIT.shatter, HIT.shatter + 0.6, t);
    if (t < HIT.shatter || t >= BACK || k <= 0) return;
    const hw = 0.5 * 0.06 * A * k, ox = 0.62 * A, oy = 0.45;
    const line = (off) => Array.from({ length: 161 }, (_, i) => {
      const a = (i - 80) * 0.02, s = tearJag(a) + off;
      return [ox + a * AIM[0] + s * PERP[0], 1 - (oy + a * AIM[1] + s * PERP[1])];
    });
    for (const side of [-1, 1]) {
      B.ribbon(line(side * hw), new Array(161).fill(0.006), SIL);
      B.ribbon(line(side * (hw - 0.004)), new Array(161).fill(0.002), GOLD);
    }
  }

  // the foreground blade: one ink blade with a gold rim, sliding in from a bottom corner on twos, behind the King's layer
  function fore(B, b, ts, A) {
    const age = ts - b.t;
    if (age < 0 || age >= b.dur) return;
    const q = Math.min(1, Math.floor(age * 12 + 1e-6) / 2), s = b.side, ang = Math.atan2(-1, s > 0 ? -1.6 : 1.6);
    const o = (1 - q) * 1.6, bx = s > 0 ? A + 0.4 : -0.4, by = 1.4;
    blade(B, bx - Math.cos(ang) * o, by - Math.sin(ang) * o, ang, 1.1, 0.3, GOLD);
  }

  function gather(B, b, ts, A) {
    const age = ts - b.t;
    if (age < 0 || age >= b.dur) return;
    const k0 = Math.floor(age * 12 + 1e-6) / 12 / b.dur, k = b.rev ? 1 - k0 : k0, [cx, cy] = centre(b.at, A, ts);
    const n = Math.round(12 + 44 * k), seed = Math.round(b.t * 10), rin = 0.2 + 0.9 * (1 - k);
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const p0 = [cx + ca * 1.3, cy + sa * 1.3], p1 = [cx + ca * rin, cy + sa * rin];
      B.ribbon([p0, p1], [0.0035, 0.0003], SIL);
      B.ribbon([p0, p1], [0.0022, 0.0002], GOLD);
    }
  }

  function streaks(B, ts, A) {
    const list = ctx.volleyAt?.(ts) ?? [];
    for (const s of list) {
      const pts = [], ws = [];
      for (let i = 0; i <= 10; i++) {
        const q = toFrame(V.set(s.x - s.vx * (i / 24), s.y - s.vy * (i / 24), s.z - s.vz * (i / 24)), A);
        if (!q) break;
        pts.push(q); ws.push(0.0005 + 0.0015 * (i / 10));
      }
      if (pts.length > 1) B.ribbon(pts, ws, GOLD);
    }
  }

  function poof(B, b, ts, A) {
    const landing = toFrame(AT, A);
    if (!landing) return;
    const [lx, ly] = landing, s0 = b.t + F(2), f = Math.floor((ts - s0) * 24 + 1e-6);
    if (f >= 0 && f < 4) for (let i = 0; i < 14; i++) {
      const a = hash(i, 61) * TAU, d = 0.05 + 0.1 * f * (0.6 + hash(i, 62));
      blade(B, lx + Math.cos(a) * d, ly + Math.sin(a) * d * 0.5, a, 0.05, 0.012, GOLD);
    }
    const g = Math.floor((ts - (b.t + 0.6 + F(2))) * 24 + 1e-6);
    if (g >= 0 && g < 4) for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU, r = 0.03 + 0.02 * g, x = lx + Math.cos(a) * r, y = ly + Math.sin(a) * r * 0.4, s = 0.006;
      B.fan(x, y, [[x + s, y], [x, y + s], [x - s, y], [x, y - s]], GOLD);
    }
  }

  // the blast's beam: a red ribbon from Ea's tip to the vault for four frames (0.05 wide, then 0.012), a cream core at 0.4 of its width
  function beam(B, ts, A) {
    const age = ts - HIT.blast; if (age < 0 || age >= F(4)) return;
    const [x0, y0] = centre("tip", A, ts), [x1, y1] = centre("vault", A, ts), w = age < F(2) ? 0.05 : 0.012, p = [[x0, y0], [x1, y1]];
    B.ribbon(p, [w / 2, w / 2], RED);
    B.ribbon(p, [w * 0.2, w * 0.2], rgb(PAL.beamCore));
  }

  // the rip's cracks: nine cel ribbons from the rip's centre (0.62A, 0.45), each growing over six grid steps on twos from the shatter to the back; a crack that crosses the King's box is skipped
  function cracks(B, t, A) {
    if (t < HIT.shatter || t >= BACK) return;
    const s = Math.floor((t - HIT.shatter) * 12 + 1e-6), k = Math.min(1, (s + 1) / 6), x0 = 0.62 * A, y0 = 0.45, bx = box();
    for (let i = 0; i < 9; i++) {
      const x1 = Math.max(0.5 * A, hash(i, 31) * A), y1 = hash(i, 32), p = [[x0, y0], [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]];
      if (bx && crosses(p, bx, A)) continue;
      B.ribbon(p, [0.006, 0.006], SIL);
      B.ribbon(p, [0.002, 0.002], GOLD);
    }
  }

  // a full-screen pull over the world: polyTear (the rip at the shatter)
  function overlay(pull, order) {
    const uniforms = { ...uniformsFor([pull]), uPlAsp: { value: 1.78 }, uPlSeed: { value: 79 }, uPlCloseT: { value: 0 }, uT: { value: 0 } };
    const mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: OVER_V, fragmentShader: overFrag(pull), depthTest: false, depthWrite: false, side: DoubleSide }));
    mesh.renderOrder = order; mesh.frustumCulled = false; mesh.visible = false;
    return { mesh, u: uniforms };
  }
  const rip = overlay("polyTear", 1240);

  function pulls(t, cam) {
    rip.u.uT.value = t; rip.u.uPlAsp.value = cam.aspect;
    rip.mesh.visible = t >= HIT.shatter && t < BACK;
    rip.u.uPlTear.value = smooth(HIT.shatter, HIT.shatter + 0.6, t); rip.u.uPlTx.value = 0.62; rip.u.uPlTy.value = 0.45;
  }

  const panels = makeCel(ctx.engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of gathers) gather(B, b, ts, A);
      for (const b of panelsB) if (!PLATE.has(b.kind)) impact(B, b, ts, A);
      for (const b of fores) fore(B, b, ts, A);
      beam(B, ts, A);
      streaks(B, ts, A);
    },
  });
  const plates = makeCel(ctx.engine, {
    max: 20000, order: 1250,
    draw(B, ts, A) {
      for (const b of panelsB) if (PLATE.has(b.kind)) impact(B, b, ts, A);
      const fl = Math.floor((ts - HIT.flash) * 24 + 1e-6);
      if (ts >= HIT.flash && fl < 3) {
        const [cx, cy] = centre("vault", A, ts);
        if (fl === 0) { B.rect(0, 0, A, 1, FLASH); spikes(B, cx, cy, 64, 0.3, 7, SIL); }
        else if (fl === 1) { B.rect(0, 0, A, 1, SIL); spikes(B, cx, cy, 64, 0.3, 7, GOLD); }
        else { B.rect(0, 0, A, 1, FLASH); spikes(B, cx, cy, 64, 0.3, 14, SIL); }
      }
      tearLip(B, ts, A);
      cracks(B, ts, A);
      for (const b of poofs) poof(B, b, ts, A);
    },
  });
  group.add(panels.group, plates.group, rip.mesh);

  return {
    group,
    update(t, cue) { const cam = ctx.player?.camera; if (cam) pulls(t, cam); panels.update(t, cue); plates.update(t, cue); },
    panelUp(t) { return panelsB.some((b) => t >= b.t && t < b.t + b.dur); },
    plateUp(t) { return (t >= HIT.flash && t < HIT.flash + F(3)) || (t >= BACK && t < BACK + F(2)); },
    dispose() {
      panels.dispose(); plates.dispose();
      rip.mesh.geometry.dispose(); rip.mesh.material.dispose();
    },
  };
}
