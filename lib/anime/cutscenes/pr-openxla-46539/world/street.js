// STREET: the orange-tiled pavement lit from below, the red railings, bent lamps, the overturned truck, rubble, the PLUS ULTRA slab,
// the broken U.A. sign (bible 3 "Kamino ruined street", easter eggs 1 and 2). Layer 0 (static art).
//
// PAVEMENT (one painted card, 20 x 120 m, 34 px/m; m = (x, z) metres, z forward):
//   irradiance  L = 0.10 + sum_i k_i exp(-|m - c_i|^2 / r_i^2)    over every fire (layout.POOLS) and the crater, then
//               L *= 0.75 + 0.5 fbm(0.35 m)                       (ragged, so the cel edge wobbles)
//   tile        1.2 m tiles, v = L (0.82 + 0.36 h21(tile)) (0.9 + 0.1 g),  g = clamp(grunge2(0.6 m), .5, 1.2)
//               col = cel3(v, 0.26, 0.60, #4a1a1a, #a04a2a, #d86a3a)         (shadow / mid / lit, hard bands)
//   joints      e = (0.5 - max(|fract(m/1.2) - .5|)) 1.2 m;  inked where e < 0.035 (1 px at this scale ~ 0.03 m)
//   cracks      vor(0.45 m) ridge < 0.04, masked by fbm(0.2 m) > 0.55
//   road        dashed centre line #ffcf20, kerbs at |x| = 7.0..7.3 (#a37952 band, ink edges), dead black under the facades |x| > 9.3
//   crater      scorch ring #1a0a08 out to 8.5 m (noisy edge), eleven glowing radial cracks #ff8a20 in the first 3..9 m, warm #ffcf20 wash
//   puddles     12 ellipses: night-navy reflection #101831 / #162149 with hard orange fire strips (#ff8a20) where L > 0.45
//   splatter    near-black specks, hash > 0.985 on a 7 / m grid
import { BoxGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, Group, Mesh, TubeGeometry, Vector3 } from "three";
import { boulder, rng as krng } from "../../../kit3d.js";
import { C } from "./palette.js";
import { V, SEG, textGLSL, mergeSolid, solid } from "./lib.js";
import { CRATER, POOLS, TRUCK, SLAB, SIGN } from "./layout.js";

const TOOLS = ["noise", "cel", "grunge"];

function pavementGLSL(R) {
  const pools = POOLS.map(([x, z, r, k]) => `L += ${k.toFixed(2)} * exp(-dot(m - vec2(${x.toFixed(1)}, ${z.toFixed(1)}), m - vec2(${x.toFixed(1)}, ${z.toFixed(1)})) / ${(r * r).toFixed(1)});`).join("\n    ");
  const pud = [];
  for (let i = 0; i < 12; i++) pud.push([(R() - 0.5) * 13, -50 + R() * 100, 0.7 + R() * 1.6, 0.35 + R() * 0.6]);
  const puddles = pud.map(([x, z, rx, rz]) => `{ vec2 q = (m - vec2(${x.toFixed(2)}, ${z.toFixed(2)})) / vec2(${rx.toFixed(2)}, ${rz.toFixed(2)}); float dd = length(q) - 1.0 + 0.25 * (vn(m * 3.0) - 0.5); if (dd < 0.0) { pud = 1.0; pudDepth = -dd; } }`).join("\n    ");
  return `
  vec4 paint(vec2 p) {
    vec2 m = vec2(p.x / uAsp * 20.0 - 10.0, p.y * 120.0 - 60.0);
    float L = 0.10;
    ${pools}
    vec2 cr = m - vec2(${CRATER.x.toFixed(1)}, ${CRATER.z.toFixed(1)});
    float dc = length(cr);
    L += 1.6 * exp(-dc * dc / 36.0);
    L *= 0.75 + 0.5 * fbm(m * 0.35);
    float g = clamp(grunge2(m * 0.6, 0.8, 0.3), 0.5, 1.2);
    vec2 tid = floor(m / 1.2);
    float v = L * (0.82 + 0.36 * h21(tid)) * (0.9 + 0.1 * g);
    vec3 col = cel3(v, 0.26, 0.60, ${V(C.payShade)}, ${V(C.payMid)}, ${V(C.payLit)});
    // joints
    vec2 gq = abs(fract(m / 1.2) - 0.5);
    float e = (0.5 - max(gq.x, gq.y)) * 1.2;
    col = mix(col, ${V("#2a0f0f")}, (1.0 - smoothstep(0.02, 0.05, e)) * 0.9);
    // cracks
    vec2 vv = vor(m * 0.45 + 3.0);
    col = mix(col, ${V(C.ink)}, (1.0 - smoothstep(0.02, 0.05, vv.y)) * step(0.55, fbm(m * 0.2)) * 0.7);
    // road furniture
    float ax = abs(m.x);
    float dash = step(ax, 0.12) * step(fract(m.y / 5.0), 0.5);
    col = mix(col, mix(${V("#6a4a20")}, ${V(C.winLit)}, celStep(v, 0.6)), dash * 0.75);
    float kerb = step(7.0, ax) * step(ax, 7.3);
    col = mix(col, mix(${V("#6a3a2a")}, ${V(C.rubLit)}, celStep(v, 0.45)), kerb);
    col = mix(col, ${V(C.ink)}, (1.0 - smoothstep(0.0, 0.04, abs(ax - 7.0))) * 0.8 + (1.0 - smoothstep(0.0, 0.04, abs(ax - 7.3))) * 0.6);
    col *= 1.0 - 0.6 * smoothstep(9.2, 9.6, ax);
    // crater: scorch, glowing radial cracks, warm wash
    float scorch = (1.0 - smoothstep(3.2, 8.5, dc)) + 0.25 * (fbm(m * 0.7) - 0.5);
    col = mix(col, ${V("#1a0a08")}, celStep(scorch, 0.55) * 0.9);
    float a = atan(cr.x, cr.y) / 6.2832 * 11.0;
    float ci = floor(a), cf = fract(a);
    float within = step(3.0, dc) * step(dc, 3.0 + 6.0 * h21(vec2(ci, 1.0)));
    float line = (1.0 - smoothstep(0.0, 0.05 + 0.03 * h21(vec2(ci, 2.0)), min(cf, 1.0 - cf) * dc * 0.5)) * within;
    col = mix(col, ${V(C.fireEdge)} * 1.1, line);
    col = mix(col, ${V(C.fireMid)}, celStep(exp(-dc * dc / 14.0), 0.62) * 0.55 * step(CRATER_R, dc));
    // puddles
    float pud = 0.0, pudDepth = 0.0;
    ${puddles}
    vec3 pcol = mix(${V(C.navyD)}, ${V(C.navy)}, step(0.5, fbm(m * 1.7)));
    float strip = step(0.45, L) * step(0.55, 0.5 + 0.5 * sin(m.y * 3.1 + fbm(m) * 6.0));
    pcol = mix(pcol, ${V(C.fireEdge)}, strip * 0.85);
    pcol = mix(pcol, ${V(C.dayMid)}, (1.0 - smoothstep(0.0, 0.07, pudDepth)) * 0.5);   // pale rim
    col = mix(col, pcol, pud);
    // splatter
    col = mix(col, ${V("#1a0a08")}, step(0.985, h21(floor(m * 7.0))) * 0.8);
    return vec4(col, 1.0);
  }`.replace("CRATER_R", CRATER.r.toFixed(2));
}

const SLAB_GLSL = `${SEG}\n${textGLSL("txP", "PLUS")}\n${textGLSL("txU", "ULTRA")}
  // concrete slab face 3.0 x 1.7 m: two-tone cel, ink cracks, a torn top-right corner, spray-paint letters 0.2 m per glyph unit
  vec4 paint(vec2 p) {
    vec2 m = vec2(p.x / uAsp * 3.0, p.y * 1.7);
    float tear = (m.x - 2.2) + (m.y - 1.0) * 0.6 - (1.0 + 0.25 * vn(m * 6.0));
    if (tear > 0.0) return vec4(0.0);
    float g = clamp(grunge2(m * 3.0, 0.8, 0.4), 0.6, 1.15);
    vec3 col = mix(${V(C.rubShade)}, ${V(C.rubLit)}, celStep(fbm(m * 2.5) * g, 0.42));
    vec2 vv = vor(m * 2.2);
    col = mix(col, ${V(C.ink)}, (1.0 - smoothstep(0.02, 0.05, vv.y)) * step(0.5, fbm(m * 1.1)) * 0.7);
    float s = 0.2;
    float d = min(txP((m - vec2(0.35, 0.98)) / s) * s, txU((m - vec2(0.28, 0.22)) / s) * s);
    d += 0.012 * (vn(m * 18.0) - 0.5);
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.045, 0.085, d));
    col = mix(col, ${V("#f4f0e8")}, 1.0 - smoothstep(0.035, 0.05, d));
    float edge = min(min(m.x, 3.0 - m.x), min(m.y, 1.7 - m.y));
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.03, 0.08, min(edge, -tear * 0.3)));
    return vec4(col, 1.0);
  }`;

const SIGN_GLSL = `${SEG}\n${textGLSL("txUA", "U A")}
  // the U.A. board 3.2 x 2.4 m: navy board, white border, a gold hexagon crest with the letters, torn bottom-right and scorched
  vec4 paint(vec2 p) {
    vec2 m = vec2(p.x / uAsp * 3.2, p.y * 2.4);
    float tear = (m.x - 1.9) * 0.9 - (1.2 - m.y) - 0.35 * vn(m * 5.0);
    if (tear > 0.0 && m.y < 1.2) return vec4(0.0);
    vec3 col = ${V(C.navyL)};
    float edge = min(min(m.x, 3.2 - m.x), min(m.y, 2.4 - m.y));
    col = mix(col, ${V("#f4f0e8")}, 1.0 - smoothstep(0.10, 0.13, edge));
    vec2 q = m - vec2(1.6, 1.2);
    float hex = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    col = mix(col, ${V(C.gold)}, 1.0 - smoothstep(0.78, 0.82, hex));
    col = mix(col, ${V(C.navyD)}, 1.0 - smoothstep(0.62, 0.66, hex));
    float d = txUA((m - vec2(1.21, 0.99)) / 0.14) * 0.14;
    col = mix(col, ${V("#f4f0e8")}, 1.0 - smoothstep(0.035, 0.055, d));
    col = mix(col, ${V("#1a0a08")}, smoothstep(0.35, 0.9, (1.0 - m.y / 2.4) + 0.4 * (fbm(m * 2.0) - 0.5)) * 0.7);
    float te = (m.y < 1.2) ? -tear * 0.4 : 1e3;
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.02, 0.06, min(edge, te)));
    return vec4(col, 1.0);
  }`;

export function buildStreet(ctx) {
  const { engine } = ctx;
  const R = ctx.rng(7);
  const group = new Group(), own = [];

  // ground under everything, and the pavement card
  group.add(solid(engine, new CircleGeometry(520, 48).rotateX(-Math.PI / 2).translate(0, -0.12, 0), C.wallD, "#05020a", 0.5));
  const pave = ctx.bake.card(pavementGLSL(R), { w: 1024, h: 6144, size: [20, 120], tools: TOOLS, id: 0.5 });
  pave.rotation.x = Math.PI / 2; pave.position.y = 0.02; group.add(pave); own.push(pave);

  // red railings: posts every 2 m, two rails, broken near the crater
  const posts = [], rails = [];
  for (const side of [-1, 1]) {
    const x = side * 7.15;
    for (let z = -58; z <= 58; z += 2) {
      const brokenZone = Math.abs(z - CRATER.z) < 5.5 || Math.abs(z) < 0.1;
      if (brokenZone && R() > 0.45) continue;
      const lean = R() < 0.12 ? (R() - 0.5) * 0.5 : 0;
      posts.push(new BoxGeometry(0.14, 1.1, 0.14).translate(0, 0.55, 0).rotateZ(lean).translate(x, 0, z));
      if (R() > 0.1 && !(brokenZone && R() > 0.5)) {
        rails.push(new BoxGeometry(0.08, 0.08, 1.9).translate(x, 1.02, z + 1));
        rails.push(new BoxGeometry(0.08, 0.08, 1.9).translate(x, 0.55, z + 1));
      }
    }
  }
  group.add(mergeSolid(engine, [...posts, ...rails], C.rail, C.railD, 0.6, "rails"));

  // bent lamps: tube from the kerb, bent over the road; four heads still lit
  const tubes = [], heads = [], lit = [];
  let li = 0;
  for (const side of [-1, 1]) for (let z = -52; z <= 52; z += 16) {
    const zz = z + side * 3 + (R() - 0.5) * 3, x = side * 8.3, ok = R() > 0.35;
    const pts = [[x, 0, zz], [x, 3.4, zz], [x - side * 0.1, 5.4, zz], [x - side * (ok ? 1.0 : 1.6), ok ? 6.1 : 5.4, zz], [x - side * (ok ? 2.4 : 2.2), ok ? 5.9 : 4.2, zz]].map((a) => new Vector3(...a));
    tubes.push(new TubeGeometry(new CatmullRomCurve3(pts), 14, 0.11, 6, false));
    const hp = pts[4], hg = new BoxGeometry(0.7, 0.2, 0.35).rotateZ(ok ? 0 : side * 0.9).translate(hp.x, hp.y - 0.05, hp.z);
    (li++ % 5 === 0 ? lit : heads).push(hg);
  }
  group.add(mergeSolid(engine, tubes, "#3a3a46", C.ink, 0.58, "lamps"));
  group.add(mergeSolid(engine, heads, "#5a5a66", "#1a1a24", 0.58, "heads"));
  const lampLit = mergeSolid(engine, lit, C.winLit, C.fireEdge, 0.58, "lit");
  lampLit.material.uniforms.uEmit?.value.set(0.9, 0.65, 0.2);
  group.add(lampLit);

  // rubble heaps (kept low near the seal: nothing between the lens and the pup)
  const heapsMid = [], slabs = [];
  const heap = (cx, cz, n, s, top) => { for (let i = 0; i < n; i++) { const r = s * (0.5 + R() * 0.8); heapsMid.push(boulder([r * 1.4, r * 0.8, r], [cx + (R() - 0.5) * s * 2.2, r * 0.3, cz + (R() - 0.5) * s * 1.6], Math.floor(R() * 999), top)); } };
  for (const side of [-1, 1]) for (let z = -54; z < 56; z += 9 + R() * 7) {
    if (Math.abs(z) < 3) continue;
    heap(side * (8.0 + R() * 1.0), z, 4, 1.1 + R() * 0.9, 2.0);
  }
  for (let i = 0; i < 9; i++) { const a = R() * 6.2832, d = CRATER.r + 0.6 + R() * 1.4; heap(CRATER.x + Math.cos(a) * d, CRATER.z + Math.sin(a) * d, 2, 0.7 + R() * 0.5, 1.3); }
  for (let i = 0; i < 10; i++) { const x = (R() - 0.5) * 11, z = -45 + R() * 90; if (Math.hypot(x, z) < 3.5 || Math.hypot(x - CRATER.x, z - CRATER.z) < 5) continue; heap(x, z, 2, 0.5 + R() * 0.4, 0.55); }
  for (let i = 0; i < 12; i++) {
    const x = (R() - 0.5) * 13, z = -50 + R() * 100;
    if (Math.hypot(x, z) < 3.5) continue;
    slabs.push(new BoxGeometry(1 + R() * 1.6, 0.18 + R() * 0.2, 0.8 + R() * 1.2).rotateY(R() * 3).rotateZ((R() - 0.5) * 0.3).translate(x, 0.2, z));
  }
  group.add(mergeSolid(engine, heapsMid, C.rubMid, C.rubShade, 0.52, "heaps"));
  group.add(mergeSolid(engine, slabs, C.rubLit, C.rubShade, 0.53, "slabs"));

  // the overturned truck: lying on its right side, wheels in the air
  const T = new Group(), Ti = new Group();
  Ti.add(mergeSolid(engine, [new BoxGeometry(2.6, 2.6, 4.2).translate(0, 0, -1.2)], "#cfc8c0", "#4a3a4a", 0.65, "cargo"));
  Ti.add(mergeSolid(engine, [new BoxGeometry(2.4, 2.3, 1.8).translate(0, -0.15, 1.9)], "#2f6ab0", C.navy, 0.65, "cab"));
  Ti.add(mergeSolid(engine, [new BoxGeometry(2.2, 0.35, 6.2).translate(0, -1.4, 0.2)], "#1a1a24", C.ink, 0.65, "chassis"));
  const wheels = [];
  for (const wz of [-2.3, -0.4, 2.2]) for (const wx of [-1.35, 1.35]) wheels.push(new CylinderGeometry(0.55, 0.55, 0.34, 14).rotateZ(Math.PI / 2).translate(wx, -1.35, wz));
  Ti.add(mergeSolid(engine, wheels, "#1a1a24", C.ink, 0.66, "wheels"));
  Ti.rotation.z = Math.PI / 2; Ti.position.y = 1.3;
  T.add(Ti); T.position.set(TRUCK.x, 0, TRUCK.z); T.rotation.y = TRUCK.yaw;
  group.add(T);

  // the PLUS ULTRA slab (easter egg 1): a concrete slab leaning against rubble, the scrawl as a painted face card
  const slabBody = solid(engine, new BoxGeometry(3.0, 1.7, 0.28), C.rubLit, C.rubShade, 0.54);
  slabBody.position.set(SLAB.x, 0.82, SLAB.z); slabBody.rotation.set(-0.22, Math.PI / 4, 0.05, "YXZ");
  const face = ctx.bake.card(SLAB_GLSL, { w: 1024, h: 580, size: [3.0, 1.7], tools: TOOLS, id: 0.54 }); face.position.z = 0.145; own.push(face);
  slabBody.add(face); group.add(slabBody);

  // the broken U.A. sign (easter egg 2): hangs by one bracket, tilted, on the left block
  const pivot = new Group(); pivot.position.set(SIGN.x, SIGN.y, SIGN.z); pivot.rotation.set(0.32, 0, 0); pivot.rotation.order = "YXZ";
  const board = ctx.bake.card(SIGN_GLSL, { w: 640, h: 480, size: [3.2, 2.4], tools: TOOLS, id: 0.56 });
  board.rotation.y = Math.PI / 2; board.position.set(0, -1.2, 0); pivot.add(board); own.push(board);
  const bracket = solid(engine, new BoxGeometry(1.0, 0.14, 0.14), "#3a3a46", C.ink, 0.58); bracket.position.set(-0.45, 0.05, 0); pivot.add(bracket);
  group.add(pivot);

  return { group, update() {}, dispose() { for (const o of own) o.userData?.dispose?.(); } };
}
