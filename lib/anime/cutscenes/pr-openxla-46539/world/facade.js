// FACADE painter: one painted card per building face (bible 3 "Kamino ruined street": black blocks with grid windows, lit from
// below by fire, hard shadows cast up the walls, windows #ffcf20 lit / #14121e dead). GLSL generated per variant.
//
// Maths, per texel (m = metres from the bottom-left of the face; the card's pixel aspect is W/H so m = (p.x/uAsp W, p.y H)):
//   silhouette  intact: the full rectangle. broken (amp > 0): top(m.x) = H - amp h21(floor(m.x/2.4)) - 2.5 vn(1.3 m.x) - 1 - 1.4|fract(.37 m.x + seed) - .5|
//               (stair-stepped slabs with a diagonal break); texels above top return alpha 0 (the card is a cutout).
//   fire reach  per 2.6 m bay: reach = 5 + 11 h21(bay); fireV = (1 - y/reach)(0.8 + 0.4 vn(2x, y/2))
//               wall = cel3(fireV, .18, .55, dark, #2f1418, #5a2214): hard fingers of firelight climbing the wall (shadows cast up it)
//   grid        floor 3.4 m from y0 = 3.8, bay 2.6 m, the bays centred in the face; window half size (0.62, 0.85)
//   window      d = max(|wx| - .62, |wy| - .85); frame ring where 0 < d < .07 (ink); lit if h21 < .30: #ffcf20 (or #ff8a20 one in three)
//               with a dead-black mullion cross; burning if < .36: #ff8a20 with #7a2a10 holes; broken if > .94: spot black
//               dead: #14121e with a #4a1a1a firelight triangle low and a lighter diagonal glint
//   details     pilasters (0.5 m, lighter, inked), floor ledges, ground-floor shutters, a cornice on intact faces, grunge on the wall
//   edge        a 0.09 m ink line round the silhouette (3 px at 34 px per metre)
import { C } from "./palette.js";
import { V } from "./lib.js";

export const VARIANTS = {
  A: { W: 14, H: 32, seed: 1.3 }, B: { W: 18, H: 24, seed: 2.7 }, C: { W: 12, H: 38, seed: 3.1 }, D: { W: 16, H: 18, seed: 4.9 }, E: { W: 20, H: 28, seed: 5.3 },
  F: { W: 15, H: 22, seed: 6.1, amp: 7 }, G: { W: 13, H: 30, seed: 7.7, amp: 8 },
  R1: { W: 12, H: 11, seed: 8.2, amp: 5, ruin: true }, R2: { W: 14, H: 10, seed: 9.4, amp: 4.5, ruin: true },
};
// the lowest the broken top can be (the 3D box behind the card is built to this height)
export const minTop = (v) => (v.amp ? Math.max(2.5, v.H - v.amp - 5) : v.H);

export function facadeGLSL(v) {
  const amp = v.amp ?? 0;
  return `
  vec4 paint(vec2 p) {
    const float W = ${v.W.toFixed(2)}, H = ${v.H.toFixed(2)}, SEED = ${v.seed.toFixed(2)};
    const float FL = 3.4, BAY = 2.6, Y0 = 3.8;
    vec2 m = vec2(p.x / uAsp * W, p.y * H);
    float top = H;
    ${amp > 0 ? `top = H - ${amp.toFixed(2)} * h21(vec2(floor(m.x / 2.4), SEED)) - 2.5 * vn(vec2(m.x * 1.3, SEED + 3.0)) - 1.0 - 1.4 * abs(fract(m.x * 0.37 + SEED) - 0.5);` : ""}
    if (m.y > top) return vec4(0.0);
    // ---- wall: firelight fingers climbing from the street
    float bay = floor(m.x / 2.6);
    float reach = 5.0 + 11.0 * h21(vec2(bay, SEED + 9.0));
    float fireV = (1.0 - m.y / reach) * (0.8 + 0.4 * vn(vec2(m.x * 2.0, m.y * 0.5)));
    vec3 dark = mix(${V(C.wall)}, ${V(C.wallD)}, smoothstep(0.0, H, m.y));
    vec3 wall = cel3(fireV, 0.18, 0.55, dark, ${V("#2f1418")}, ${V("#5a2214")});
    wall *= clamp(grunge2(m * 0.35, 0.7, 0.5), 0.55, 1.1);
    // ---- grid, bays centred in the face
    float nb = floor(W / BAY);
    float xo = m.x - (W - nb * BAY) * 0.5;
    vec2 cell = vec2(floor(xo / BAY), floor((m.y - Y0) / FL));
    vec2 f = vec2(fract(xo / BAY), fract((m.y - Y0) / FL));
    float rnd = h21(cell + SEED * 3.1), rnd2 = h21(cell * 1.7 + SEED + 11.0);
    vec3 col = wall;
    // pilasters (0.5 m) with an ink edge
    float dx = min(f.x, 1.0 - f.x) * BAY;
    float pilOn = step(0.0, xo) * step(xo, nb * BAY);
    col = mix(col, ${V(C.wallL)}, (1.0 - smoothstep(0.23, 0.27, dx)) * 0.55 * pilOn);
    col = mix(col, ${V(C.ink)}, (1.0 - smoothstep(0.0, 0.05, abs(dx - 0.25))) * 0.7 * pilOn);
    // floor ledges
    float dy = min(f.y, 1.0 - f.y) * FL;
    col = mix(col, ${V(C.wallD)}, (1.0 - smoothstep(0.04, 0.09, dy)) * step(Y0, m.y) * 0.85);
    // ground floor: dead shopfront with shutter slats
    float shop = 1.0 - smoothstep(Y0 - 0.06, Y0 + 0.06, m.y);
    vec3 shut = mix(${V(C.wallD)}, ${V("#1d1424")}, step(0.5, fract(m.y * 3.0)));
    col = mix(col, shut, shop);
    // windows
    float hasWin = step(Y0, m.y) * step(0.0, cell.x) * step(cell.x, nb - 1.0) * step(m.y, top - 1.6);
    float wx = (f.x - 0.5) * BAY, wy = (f.y - 0.5) * FL;
    float d = max(abs(wx) - 0.62, abs(wy) - 0.85);
    float inWin = (1.0 - smoothstep(-0.02, 0.02, d)) * hasWin;
    float frameM = smoothstep(-0.01, 0.02, d) * (1.0 - smoothstep(0.05, 0.09, d)) * hasWin;
    vec3 win = ${V(C.winDead)};
    float glint = step(wx + wy, -0.35) * (1.0 - smoothstep(0.3, 0.9, m.y / 14.0));
    win = mix(win, ${V("#4a1a1a")}, glint);
    win = mix(win, ${V("#2a2438")}, step(abs(wx - wy * 0.7 - 0.2), 0.07) * 0.8);
    vec3 lit = mix(${V(C.winLit)}, ${V(C.fireEdge)}, step(0.66, rnd2)) * 1.05;
    float mull = step(abs(wx), 0.045) + step(abs(wy + 0.1), 0.045);
    lit = mix(lit, ${V(C.winDead)}, clamp(mull, 0.0, 1.0));
    lit = mix(lit, ${V(C.fireEdge)}, step(wy, -0.55) * 0.5);
    vec3 burn = mix(${V(C.fireEdge)} * 1.2, ${V(C.fireHole)}, step(0.62, vn(vec2(wx * 3.0 + cell.x, wy * 3.0 + cell.y * 2.0))));
    vec3 hole = ${V("#05020a")};
    win = rnd < 0.30 ? lit : (rnd < 0.36 ? burn : (rnd > 0.94 ? hole : win));
    col = mix(col, ${V(C.ink)}, frameM * 0.9);
    col = mix(col, win, inWin);
    // cornice on intact faces
    ${amp > 0 ? "" : `float corn = step(H - 0.9, m.y); col = mix(col, ${V(C.wallL)}, corn * 0.8); col = mix(col, ${V(C.ink)}, (1.0 - smoothstep(0.0, 0.06, abs(m.y - (H - 0.9)))) * 0.8);`}
    // ink edge round the silhouette
    float edge = min(min(m.x, W - m.x), top - m.y);
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.05, 0.10, edge));
    return vec4(col, 1.0);
  }`;
}
