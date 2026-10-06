// CAST layer for pr-triton-kernels-22: Sukuna's Malevolent Shrine (PROTECTED look). Layer 1.
// Hero = the locked seal + Sukuna decals (hero.js). Victims = 12 SMALL costumed seals (L6b): 1 Jogo, 3 Mahoraga, 8 sorcerer students.
// No victim stands between lens and seal: all are in the right-front quadrant or the far field, beside the shrine axis.
//
// CUES READ (all optional: each falls back to the bible's time, so the layer works with or without the direction layer's beats):
//   crossing 2.0  victims pop in around the pup (back-out scale, staggered by distance)
//   shrine   2.7  the shrine rises: students turn (frame 0) and run, Mahoraga drop to the crouched guard
//   flick    7.5  flipper flick (hero eyes go wide slit)
//   barrage  8.1  18 slashes, interval 0.25 s easing to 0.5 s; students are thrown at their assigned slash
//   heavy   10.4  Jogo is hit (brace 6f, thrown 2 m in 8f, skid and kneel 10f at 24 fps)
//   cleave  16.3  Mahoraga halos shatter (4f), the seals fall flat (6f); the hero's four-eyed mark shows for one drawing
//   close   17.0  domain closed: every victim vanishes in ink flakes (scale to 0 over 0.8 s, 1 in 5 flakes red)
//   flex    18.0  hero calm
// Positions are pure functions of t (scrub = play). Nothing here emits light: every fill is capped by the kit's lit-luma 0.92.
import buildHero from "./hero.js";
import { JOGO, MAHORAGA, student } from "./costumes.js";

const FR = 1 / 24; // the bible's reaction frames are 24 fps
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const outBack = (x) => { const c = 1.70158, u = x - 1; return 1 + (c + 1) * u * u * u + c * u * u; }; // back.out
const outCubic = (x) => 1 - (1 - x) ** 3;

export default function build(ctx) {
  const { THREE, seal, kit, engine } = ctx;
  const group = new THREE.Group();
  const rng = ctx.rng("triton-cast");
  let evNow = (name, fb) => fb;
  // absolute start time of a named cue, else the bible's time
  const evOf = (cue) => (name, fb) => { const s = cue?.since?.(name); return Number.isFinite(s) ? cue.t - s : fb; };

  const hero = buildHero(ctx, (name, fb) => evNow(name, fb));
  group.add(hero.group);

  // slash schedule: 18 strokes from the barrage start, interval 0.25 -> 0.5 s (smoothstep)
  const slashes = []; { let s = 0; for (let j = 0; j < 18; j++) { slashes.push(s); const u = j / 17; s += 0.25 + 0.25 * u * u * (3 - 2 * u); } }

  // layout in seal-local metres (x right = negative, z forward toward the shrine), turned into world by seal.at / seal.yaw
  const cy = Math.cos(seal.yaw), sy = Math.sin(seal.yaw);
  const world = (lx, lz) => [seal.at[0] + lx * cy + lz * sy, seal.at[2] - lx * sy + lz * cy];
  const SPEC = [];
  const add = (role, spec, lx, lz, extra = {}) => SPEC.push({ role, spec, lx, lz, ...extra });
  add("jogo", JOGO, -3.2, 7.0, { hit: 10.4 });
  add("maho", MAHORAGA, -2.6, 4.6); add("maho", MAHORAGA, -4.4, 6.4); add("maho", MAHORAGA, -5.6, 9.0);
  const SL = [[-2.2, 3.4], [-3.8, 3.0], [-5.0, 5.2], [-6.4, 7.4], [-3.6, 10.2], [-7.2, 11.6], [4.4, 14.5], [6.2, 17.5]];
  const HITS = [3, 5, 7, 9, 11, 13, 14, 15];
  SL.forEach((p, i) => add("student", student(i), p[0], p[1], { hitIdx: HITS[i] }));

  const sweatGeo = new THREE.SphereGeometry(0.03, 10, 8).scale(0.8, 1.3, 0.8), sweatMat = new THREE.MeshBasicMaterial({ color: "#9fd6f0" });
  const emberGeo = new THREE.SphereGeometry(0.018, 6, 5), emberMat = new THREE.MeshBasicMaterial({ color: "#ff9a2a" }); // under 1: no bloom
  const haloGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 28), haloMat = new THREE.MeshBasicMaterial({ color: "#f4efe2" });
  const shardGeo = new THREE.BoxGeometry(0.07, 0.025, 0.012);

  const V = SPEC.map((s, i) => {
    const h = kit.costumedSeal(engine, s.spec);
    const [wx, wz] = world(s.lx, s.lz);
    const dl = Math.hypot(1, 0.35), dx = (s.lx < 0 ? -1 : 1) / dl, dz = -0.35 / dl; // flee outward and back, off the lens-to-seal line
    const v = {
      h, role: s.role, base: [wx, wz], dir: [dx * cy + dz * sy, -dx * sy + dz * cy], sc: s.spec.scale, i,
      tApp: 2.05 + 2.2 * clamp01(s.lz / 18) + rng() * 0.15,
      speed: s.role === "student" ? 3 : 0, hitIdx: s.hitIdx, hit: s.hit ?? 0, thrown: s.role === "student" ? 1.6 : 2.0,
      sweat: null, embers: null, halo: null, shards: null,
    };
    group.add(h.group);
    if (s.role !== "maho") { const d = new THREE.Mesh(sweatGeo, sweatMat); d.position.set(0.21, 0.72, 0.17); h.body.add(d); d.visible = false; v.sweat = d; }
    if (s.role === "jogo") { v.embers = []; for (let k = 0; k < 6; k++) { const e = new THREE.Mesh(emberGeo, emberMat); h.body.add(e); v.embers.push(e); } } // 6 ember sparks
    if (s.role === "maho") { // halo ring on the back, spinning on twos, 8 drawings (24 fps) per turn
      v.halo = new THREE.Mesh(haloGeo, haloMat); v.halo.position.set(0, 0.66, -0.3); h.body.add(v.halo);
      v.shards = []; for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(shardGeo, haloMat); m.visible = false; h.body.add(m); v.shards.push(m); }
    }
    return v;
  });

  // ink flakes: 8 per victim, instanced; fall 2 s, spin on twos, 1 in 5 red
  const NF = 8, flakes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), V.length * NF);
  flakes.frustumCulled = false;
  const fr = [];
  for (let n = 0; n < V.length * NF; n++) { fr.push([rng() - 0.5, rng() * 0.6, rng() - 0.5, rng() * 6.28]); flakes.setColorAt(n, new THREE.Color(n % 5 === 0 ? "#b3081c" : "#0e0b0d")); }
  flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(flakes);
  const tmp = new THREE.Object3D();
  ctx.setLayer(group, 1);

  function drive(v, t, T) {
    const { h, role } = v, [x0, z0] = v.base;
    const tHit = role === "jogo" ? v.hit : role === "student" ? T.slashes[v.hitIdx] : 1e9;
    const tFlee = T.shrine + 0.17 + v.i * 0.04; // frame 0 turn, then run
    const tVan = T.close + (v.i % 4) * 0.05;
    const s = Math.max(0, outBack(clamp01((t - v.tApp) / 0.5))) * (1 - clamp01((t - tVan) / 0.8));
    h.group.visible = s > 0.001;
    h.group.scale.setScalar(Math.max(1e-4, v.sc * s));
    // position: run away from the shrine, then thrown along the same line by the slash shockwave
    const u = clamp01((t - tHit) / (8 * FR));
    const thrown = v.thrown * outCubic(u) + 0.35 * outCubic(clamp01((t - tHit - 8 * FR) / (10 * FR)));
    const run = v.speed ? v.speed * Math.max(0, Math.min(t, tHit) - tFlee) : 0;
    const d = run + (t >= tHit ? thrown : 0);
    const bob = v.speed && t >= tFlee && t < tHit ? 0.05 * Math.abs(Math.sin(t * 12)) : 0; // run bob on twos
    const turn = role === "student" ? Math.PI * clamp01((t - tFlee) / (4 * FR)) : 0;
    h.place(x0 + v.dir[0] * d, bob, z0 + v.dir[1] * d, seal.yaw + turn);

    // reaction (react() sets pose + eye expression + tint for the frame)
    let kind = "terror", k = 0;
    const settle = clamp01((t - tHit - 8 * FR) / (10 * FR)); // skid and kneel
    if (role === "student") {
      if (t >= tHit) { kind = u < 1 ? "blown" : "kneel"; k = u < 1 ? u : settle; }
      else if (t >= tFlee) { kind = (v.i + Math.floor(t * 3)) % 3 === 0 ? "stagger" : "terror"; k = 0.7; } // fleeing, tripping, shielding eyes
      else if (t >= T.shrine) { kind = "terror"; k = 0.8 * clamp01((t - T.shrine) / 0.3); }
    } else if (role === "jogo") {
      if (t >= tHit) { kind = u < 1 ? "blown" : "kneel"; k = u < 1 ? u : settle; }
      else if (t >= tHit - 6 * FR) { kind = "recoil"; k = clamp01((t - (tHit - 6 * FR)) / (6 * FR)); } // frames 0-6 brace
      else if (t >= T.shrine) { kind = "terror"; k = 0.5 + 0.2 * clamp01((t - T.shrine) / 2); }       // stands braced
    } else if (t >= T.cleave + 4 * FR) { kind = "fallen"; k = clamp01((t - T.cleave - 4 * FR) / (6 * FR)); }
    else if (t >= T.shrine) { kind = "cower"; k = 0.55; } // crouched guard
    h.react(kind, k);
    h.update(t, 0);

    // props
    if (v.sweat) { v.sweat.visible = t >= T.shrine && t < tHit + 8 * FR; v.sweat.position.y = 0.72 - 0.04 * ((t * 6) % 1); }
    if (v.embers) v.embers.forEach((e, n) => { const ph = (t * 0.9 + n / 6) % 1; e.visible = t >= T.shrine; e.position.set(Math.sin(n * 2.1) * 0.3, 0.55 + ph * 0.5, Math.cos(n * 2.1) * 0.3 - 0.05); });
    if (v.halo) {
      const tc = t - T.cleave;
      v.halo.visible = tc < 0;
      v.halo.rotation.y = Math.floor(t * 12) / 12 * Math.PI * 6; // one turn per 1/3 s, held on twos
      v.shards.forEach((m, n) => { // shatter over frames 0-4: 8 shards fly out radially and shrink
        m.visible = tc >= 0 && tc < 0.7; if (!m.visible) return;
        const a = (n / 8) * 6.283, p = clamp01(tc / (4 * FR + 0.3)), r = 0.22 + 0.5 * outCubic(p);
        m.position.set(Math.cos(a) * r, 0.66 + Math.sin(a) * r, -0.3); m.rotation.z = a + p * 5; m.scale.setScalar(1 - 0.8 * p);
      });
    }
    // ink flakes when the domain closes
    for (let n = 0; n < NF; n++) {
      const idx = v.i * NF + n, q = fr[idx], p = (t - tVan) / 2;
      if (p <= 0 || p >= 1) { tmp.scale.setScalar(0); tmp.updateMatrix(); flakes.setMatrixAt(idx, tmp.matrix); continue; }
      const ts = Math.floor(p * 24) / 24;
      tmp.position.set(h.group.position.x + q[0] * (1 + ts), 0.2 + q[1] + 0.25 * ts - 0.45 * ts * ts, h.group.position.z + q[2] * (1 + ts));
      tmp.rotation.set(q[3] + ts * 9, q[3] * 2 + ts * 7, q[3]); tmp.scale.setScalar(1 - ts); tmp.updateMatrix(); flakes.setMatrixAt(idx, tmp.matrix);
    }
  }

  return {
    group,
    update(t, dt, cue) {
      evNow = evOf(cue);
      const b = evNow("barrage", 8.1);
      const T = { shrine: evNow("shrine", 2.7), cleave: evNow("cleave", 16.3), close: evNow("close", 17.0), slashes: slashes.map((s) => b + s) };
      hero.update(t, dt, cue);
      for (const v of V) drive(v, t, T);
      flakes.instanceMatrix.needsUpdate = true;
      if (flakes.instanceColor) flakes.instanceColor.needsUpdate = true;
    },
    dispose() {
      hero.dispose(); for (const v of V) v.h.dispose();
      for (const o of [sweatGeo, sweatMat, emberGeo, emberMat, haloGeo, haloMat, shardGeo, flakes.geometry, flakes.material]) o.dispose();
    },
  };
}
