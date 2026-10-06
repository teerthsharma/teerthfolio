// E2 CLASSROOM SHELL + Easter eggs 3 and 7. Floor, four walls (the west wall cut for four windows), ceiling, wainscot,
// the red and cream bands, light panels, the east lockers with the "Class D, 0 pt" tag and the porthole door.
//
// Every surface faces INTO the room and is single-sided: seen from outside (the dollhouse wide) the near wall and the
// ceiling cull away, so nothing ever blocks the seal.
//
// VALUE LAW (anime backgrounds carry light in gradients, not geometry):
//   warm(x)   = 0.55 (1 - S(-6, 3, x))                     window-side warmth, 0.55 at the glass falling to 0 inside
//   lit(x,y)  = mix(wall, #ffe0a8, 0.5 warm) * (1.04 - 0.12 y / 5.4)    airbrush: bottom 1.04, top 0.92
//   shade(x)  = mix(#b098c8, #c9a0b0, 0.4 warm)             the shade stays violet, never grey
//   floor     = plank jitter +-3% (grain amplitude 0.02 after the cut), 1px joints = a 0.012 m gap over a #7a4a50 underlay
import * as THREE from "three";
import { BoxGeometry, CircleGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { C, P, ROOM, WIN, grid, cel, varPaint, hash, texMat, canvasTex } from "./kit.js";

const { x0: X0, x1: X1, z0: Z0, z1: Z1, h: H } = ROOM;
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildShell(ctx) {
  const g = new THREE.Group();
  const warmC = C("#ffe0a8"), warmS = C("#c9a0b0");
  const wallLit = C(P.wallLit), wallShade = C(P.wallShade);

  // wall paint: airbrush gradient + window-side warmth
  const wallFn = (x, y) => {
    const warm = 0.55 * (1 - s01(-6, 3, x)), v = 1.04 - 0.12 * Math.min(1, Math.max(0, y / H));
    return [wallLit.clone().lerp(warmC, 0.5 * warm).multiplyScalar(v), wallShade.clone().lerp(warmS, 0.4 * warm).multiplyScalar(v)];
  };
  const wall = (p0, u, v, nu, nv) => g.add(varPaint(ctx, grid(p0, u, v, nu, nv), (x, y) => wallFn(x, y)));

  // north (normal +z), south (-z), east (-x)
  wall([X0, 0, Z0], [X1 - X0, 0, 0], [0, H, 0], 24, 8);
  wall([X1, 0, Z1], [X0 - X1, 0, 0], [0, H, 0], 24, 8);
  wall([X1, 0, Z0], [0, 0, Z1 - Z0], [0, H, 0], 32, 8);
  // west wall (normal +x): sill strip, header strip and the pillars between the four windows
  const zs = WIN.zc;
  wall([X0, 0, Z1], [0, 0, Z0 - Z1], [0, WIN.y0, 0], 32, 2);                     // below the sills
  wall([X0, WIN.y1, Z1], [0, 0, Z0 - Z1], [0, H - WIN.y1, 0], 32, 2);            // above the heads
  const piers = [[Z0, zs[0] - WIN.hw], [zs[0] + WIN.hw, zs[1] - WIN.hw], [zs[1] + WIN.hw, zs[2] - WIN.hw], [zs[2] + WIN.hw, zs[3] - WIN.hw], [zs[3] + WIN.hw, Z1]];
  for (const [a, b] of piers) wall([X0, WIN.y0, b], [0, 0, a - b], [0, WIN.y1 - WIN.y0, 0], Math.max(1, Math.round((b - a) * 2)), 4);

  // ceiling (normal -y): warm ivory, the shade slightly violet so the underside is never grey
  g.add(varPaint(ctx, grid([X0, H, Z0], [X1 - X0, 0, 0], [0, 0, Z1 - Z0], 12, 16), (x) => {
    const warm = 0.55 * (1 - s01(-6, 3, x));
    return [C(P.ceil).lerp(warmC, 0.3 * warm), C("#d9c3b4").lerp(warmS, 0.3 * warm)];
  }));
  // light panels: 3 x 2 flush panels, mildly emissive
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const m = cel(ctx, new BoxGeometry(2.6, 0.04, 1.5), P.panel, "#f1e0b4", { emit: [0.12, 0.11, 0.07] });
    m.position.set(-3.4 + i * 3.4 + 0.6, H - 0.03, -2.6 + j * 8.0 + 0.5); g.add(m);
  }

  // floor: planks 0.55 m wide along z, joints every 3.3 m (staggered), 5% -> 3% brightness jitter
  g.add(varPaint(ctx, grid([X0, -0.003, Z0], [0, 0, Z1 - Z0], [X1 - X0, 0, 0]), () => [C(P.floorShade), C("#5a3640")], { line: 0 }));
  {
    const planks = [], PW = 0.55 - 0.012;
    let ix = 0;
    for (let x = X0; x < X1 - 0.01; x += 0.55, ix++) {
      let z = Z0, first = true;
      while (z < Z1 - 0.01) {
        const len = first ? 0.3 + ((ix * 1.37) % 3.3) : 3.3; first = false;
        const z1 = Math.min(Z1, z + len - 0.012);
        const gg = grid([x + 0.006, 0, z], [0, 0, z1 - z], [PW, 0, 0], 1, 1).toNonIndexed();
        gg.userData.jit = (hash(ix, Math.floor(z * 3.3)) - 0.5) * 0.06;
        planks.push(gg); z += len;
      }
    }
    // one merged mesh: concatenate attributes by hand so the per-plank jitter survives
    let n = 0; for (const p of planks) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), jit = new Float32Array(n);
    let o = 0; for (const p of planks) { pos.set(p.attributes.position.array, o * 3); nrm.set(p.attributes.normal.array, o * 3); jit.fill(p.userData.jit, o, o + p.attributes.position.count); o += p.attributes.position.count; }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); fg.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    const lit = C(P.floorLit), shade = C(P.floorShade);
    const mesh = varPaint(ctx, fg, (x, y, z, i) => {
      const warm = 0.55 * (1 - s01(-6, 3, x)), v = 1.0 - 0.14 * s01(-6, 6, x) + jit[i];
      return [lit.clone().lerp(warmC, 0.25 * warm).multiplyScalar(v), shade.clone().lerp(warmS, 0.3 * warm).multiplyScalar(1 + jit[i])];
    }, { line: 0 });
    g.add(mesh);
  }

  // wainscot (0..0.5 m wood), red band (0.5-0.66), cream band (0.66-0.74): flat strips slightly proud of the walls
  const strip = (y0, y1, col, shade, depth) => {
    const dy = y1 - y0, ym = (y0 + y1) / 2, e = depth / 2;
    const add = (geo, x, z) => { const m = cel(ctx, geo, col, shade, { line: 0.6 }); m.position.set(x, ym, z); g.add(m); };
    add(new BoxGeometry(X1 - X0, dy, depth), 0, Z0 + e);
    add(new BoxGeometry(X1 - X0, dy, depth), 0, Z1 - e);
    add(new BoxGeometry(depth, dy, Z1 - Z0), X1 - e, (Z0 + Z1) / 2);
    add(new BoxGeometry(depth, dy, Z1 - Z0), X0 + e, (Z0 + Z1) / 2);
  };
  strip(0, 0.5, P.wood, P.woodShade, 0.03);
  strip(0.5, 0.66, P.red, "#7a1620", 0.034);
  strip(0.66, 0.74, P.cream, "#d9c8a8", 0.036);

  // EASTER EGG 3: shoe lockers on the east wall, one carries the tag "Class D, 0 pt"
  for (let i = 0; i < 6; i++) {
    const zc = 1.2 + i * 0.74;
    const m = cel(ctx, new BoxGeometry(0.45, 1.9, 0.7), "#8a95a6", "#4c5666"); m.position.set(X1 - 0.3, 0.95 + 0.5, zc); g.add(m);
    const slat = cel(ctx, new BoxGeometry(0.02, 0.28, 0.5), "#5a6676", "#3a4252", { line: 0.4 }); slat.position.set(X1 - 0.535, 1.95, zc); g.add(slat);
  }
  const tag = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = "#fbf6ea"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#b8232f"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = "#1a1323"; c.font = "bold 34px 'Segoe UI', Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("Class D, 0 pt", w / 2, h / 2 + 2);
  });
  const tagM = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.17), texMat(tag.tex));
  tagM.position.set(X1 - 0.54, 1.5, 1.2 + 0.74); tagM.rotation.y = -Math.PI / 2; g.add(tagM);

  // EASTER EGG 7: the bronze porthole door (02-ep008-071), east wall, near the south end
  const dz = 9.6;
  const door = varPaint(ctx, grid([X1 - 0.05, 0, dz - 0.65], [0, 0, 1.3], [0, 2.5, 0], 1, 6), (x, y) => {
    const v = 1.08 - 0.28 * (y / 2.5);                                  // smooth airbrush gradient, no texture
    return [C(P.doorWall).multiplyScalar(v), C(P.doorShade).multiplyScalar(v)];
  });
  g.add(door);
  const frameBox = (w, h, d, x, y, z) => { const m = cel(ctx, new BoxGeometry(w, h, d), "#c9b48a", "#8a7050", { line: 0.8 }); m.position.set(x, y, z); g.add(m); };
  frameBox(0.08, 2.6, 0.08, X1 - 0.06, 1.3, dz - 0.69); frameBox(0.08, 2.6, 0.08, X1 - 0.06, 1.3, dz + 0.69); frameBox(0.08, 0.1, 1.46, X1 - 0.06, 2.55, dz);
  const pc = [X1 - 0.075, 1.75, dz];
  const ring = cel(ctx, new TorusGeometry(0.14, 0.025, 8, 28), P.bronze, P.bronzeShade, { line: 0.7 });
  ring.rotation.y = Math.PI / 2; ring.position.set(...pc); g.add(ring);
  const glassMesh = cel(ctx, new CircleGeometry(0.135, 28), P.hall, "#e0b83a", { id: 0.5, line: 0, emit: [0.34, 0.3, 0.08] });  // the golden corridor, near white-gold
  glassMesh.rotation.y = -Math.PI / 2; glassMesh.position.set(pc[0] + 0.004, pc[1], pc[2]); g.add(glassMesh);
  for (let k = 0; k < 8; k++) {                                          // rivets: tiny discs #e6c070
    const a = k / 8 * Math.PI * 2, r = 0.19;
    const rv = cel(ctx, new SphereGeometry(0.013, 6, 4), P.bronzeHi, P.bronze, { line: 0 });
    rv.position.set(pc[0] - 0.006, pc[1] + Math.sin(a) * r, pc[2] + Math.cos(a) * r); g.add(rv);
  }
  const handle = cel(ctx, new CylinderGeometry(0.018, 0.018, 0.16, 8), P.bronzeHi, P.bronze, { line: 0.5 });
  handle.position.set(X1 - 0.11, 1.0, dz - 0.5); g.add(handle);
  return { group: g };
}
