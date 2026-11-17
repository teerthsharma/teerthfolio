// p-planimeter packet shaders: Classroom of the Elite, Lerche 2017 (cool daylight Class D, window glare, red rows, points board, S^2 sphere, blue-key checkmate).
import { defineCut as M } from "../kit.glsl.js";

const F = "p-planimeter";
const SUITS = ["p-planimeter"];
const v2 = (x, y) => ({ x, y });
const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `vec3(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(", ")})`;
};
const C = {
  skyHi: hx("#e1edf6"), skyLo: hx("#c6dbe0"), win: hx("#e6e3da"),
  wLit: hx("#eceef1"), wMid: hx("#b1b5c1"), wSh: hx("#5a6374"),
  fLit: hx("#929bab"), fSh: hx("#404350"),
  deskTop: hx("#8e373d"), apron: hx("#613134"), legs: hx("#535f73"),
  bLit: hx("#a04244"), bMid: hx("#8e373d"), bSh: hx("#613134"),
  ink: hx("#3b242a"), inkBlue: hx("#241518"), inkFloor: hx("#1a0e16"),
  board: hx("#b2afc0"), text: hx("#424148"), frame: hx("#8486a4"), strip: hx("#d6d2e0"),
  gBody: hx("#456c53"), gCore: hx("#548265"), gGlint: hx("#3ddc84"),
  back: hx("#86aad6"), backSh: hx("#7d9dc7"), belly: hx("#f8eee0"), flank: hx("#d3e2f1"), lineBelly: hx("#948c7a"),
  wine: hx("#8c4658"), navy: hx("#2a3358"), navyStripe: hx("#8a93b8"),
  hairBase: hx("#624839"), hairMid: hx("#926959"), hairHi: hx("#9d7664"), hairGap: hx("#3b2a22"),
  bkDark: hx("#101830"), bkMid: hx("#1a3a8a"), bkLight: hx("#8ab4f0"),
  splitSh: hx("#523944"), splitHi: hx("#edede9"),
  petal: hx("#e9c9d2"), skyline: hx("#8a9cac"),
  pieceInk: hx("#16122c"), pieceEdge: hx("#ffeec8"),
};

const N = (name, doc, glsl, demoExpr, meta, uniforms, deps = []) => ({
  ...M(name, F, doc, glsl, demoExpr),
  deps: ["cutKit", ...deps],
  ...(uniforms ? { uniforms: () => uniforms } : {}),
  suits: SUITS,
  ...meta,
});

export const plRoomPlate = N("plRoomPlate", "Class D by day: pale grey-blue walls and floor in hard bands, white ceiling with light panels, a flat warm-white window wall on the left with mullions and breathing curtains",
  `uniform float uPlWinX;
  vec3 plRoomPlate(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float lit = 1.0 - clamp((p.x - uPlWinX) / max(1.0 - uPlWinX, 0.2), 0.0, 1.0);
    float v = lit * 0.8 + p.y * 0.2;
    vec3 wall = cCel3(v, 0.42, 0.78, ${C.wSh}, ${C.wMid}, ${C.wLit});
    vec3 flo = cCel3(lit, 0.40, 0.74, ${C.fSh}, mix(${C.fSh}, ${C.fLit}, 0.5), ${C.fLit});
    vec3 c = mix(flo, wall, cAA(p.y, 0.34));
    c = mix(c, ${C.wLit}, cAA(p.y, 0.88));
    c = mix(c, ${C.ink}, cLine(p.y - 0.44, 1.6) * 0.45);
    vec2 pg = vec2(fract(p.x * 3.0) - 0.5, p.y - 0.94);
    c = mix(c, ${C.win}, cFill(max(abs(pg.x) - 0.30, abs(pg.y) - 0.012)) * 0.9);
    float inWin = (1.0 - cAA(p.x, uPlWinX)) * cAA(p.y, 0.20) * (1.0 - cAA(p.y, 0.90));
    float mull = max(cLine(p.x - uPlWinX * 0.36, 3.0), max(cLine(p.x - uPlWinX * 0.70, 3.0), cLine(p.y - 0.62, 3.0)));
    vec3 glass = mix(${C.win}, ${C.wSh}, mull);
    c = mix(c, glass, inWin);
    c = mix(c, ${C.ink}, cLine(p.x - uPlWinX, 2.4) * cAA(p.y, 0.20) * (1.0 - cAA(p.y, 0.90)) * 0.7);
    float cx = uPlWinX - 0.035 + 0.004 * sin(tt * 1.3);
    float fold = 0.5 + 0.5 * sin((p.x - cx) * 260.0);
    float curtain = (1.0 - cAA(abs(p.x - cx), 0.02)) * cAA(p.y, 0.20) * (1.0 - cAA(p.y, 0.90));
    c = mix(c, mix(${C.wSh}, ${C.wMid}, cAA(fold, 0.5)), curtain);
    return cCap(c);
  }`,
  "plRoomPlate(p, t)",
  {
    draws: "a pale grey-blue classroom with a flat warm-white window wall filling the left third, white ceiling light panels and soft curtains",
    use: "plate",
    params: "uPlWinX: right edge of the glass in screen width (0.34 wide shot, 0.50 for the calm window shot); curtains breathe on 12 fps drawings from t",
  },
  { uPlWinX: { value: 0.34 } });

export const plWindowBleed = N("plWindowBleed", "window glare bleed C' = C + 0.35 exp(-d/0.08)(Cwin - C), cut into four flat steps so it reads as printed glare",
  `uniform float uPlBleedAmp;
  uniform float uPlBell;
  vec3 plWindowBleed(vec3 col, vec2 p, float t){
    float dx = max(p.x - uPlWinX, 0.0);
    float dy = max(max(0.20 - p.y, p.y - 0.90), 0.0);
    float d = length(vec2(dx, dy));
    float k = exp(-d / 0.08) * uPlBleedAmp * step(1e-4, d);
    float kq = floor(k * 12.0 + 0.5) / 12.0;
    kq = kq * (1.0 + 0.3 * uPlBell);
    return cCap(mix(col, ${C.win}, clamp(kq, 0.0, 0.6)));
  }`,
  "plWindowBleed(plRoomPlate(p, t), p, t)",
  {
    draws: "pale warm light spilling from the window edge into the room in four hard steps, strongest at the glass",
    use: "grade",
    params: "uPlBleedAmp: glare strength 0.35; uPlBell: 0 to 1 pulse that brightens the glare for the bell chime; glass edge comes from uPlWinX of plRoomPlate",
  },
  { uPlBleedAmp: { value: 0.35 }, uPlBell: { value: 0 } }, ["plRoomPlate"]);

export const plOutsidePlate = N("plOutsidePlate", "painted sky seen through the glass: two pale blue bands, a rooftop skyline card with a lit rim, 40 pale petals drifting on twos",
  `uniform float uPlWind;
  uniform float uPlPetalSeed;
  vec3 plOutsidePlate(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float y = clamp(p.y, 0.0, 1.0);
    vec3 c = mix(mix(${C.skyLo}, mix(${C.skyLo}, ${C.skyHi}, 0.5), cAA(y, 0.30)), ${C.skyHi}, cAA(y, 0.58));
    float cx = p.x * 22.0;
    float h = 0.16 + 0.10 * cH21(vec2(floor(cx), uPlPetalSeed + 5.0));
    float roof = cAA(h - p.y, 0.0);
    c = mix(c, ${C.skyline}, roof);
    c = mix(c, mix(${C.skyline}, ${C.win}, 0.6), cLine(p.y - h, 2.0) * roof);
    float acc = 0.0;
    for (int i = 0; i < 40; i++) {
      float fi = float(i);
      vec2 b = cH22(vec2(fi, uPlPetalSeed));
      vec2 pos = vec2(fract(b.x + tt * 0.02 * uPlWind * (0.6 + b.y)), fract(b.y - tt * 0.035 * (0.5 + b.x)));
      float a = fi + tt * 3.0;
      vec2 q = p - pos;
      q = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
      acc = max(acc, cFill((length(q / vec2(0.010, 0.0055)) - 1.0) * 0.0055));
    }
    c = mix(c, ${C.petal}, acc);
    return cCap(c);
  }`,
  "plOutsidePlate(p, t)",
  {
    draws: "a pale blue spring sky behind the glass with a muted grey-blue rooftop skyline and a few small pink petals drifting down",
    use: "plate",
    params: "uPlWind: drift speed multiplier (0.8 to 1.7 m/s in the packet); uPlPetalSeed: reshuffles the 40 petals and the roof heights; place it behind the window glass only",
  },
  { uPlWind: { value: 1.2 }, uPlPetalSeed: { value: 1 } });

export const plDeskRows = N("plDeskRows", "desk rows as red diagonals: #8e373d tops, dark apron, slate legs and chairs, gaps between desks, on the cool floor",
  `uniform float uPlRows;
  uniform float uPlSlope;
  vec3 plDeskRows(vec2 p, float t){
    vec3 flo = cCel3(p.y, 0.30, 0.66, ${C.fSh}, mix(${C.fSh}, ${C.fLit}, 0.5), ${C.fLit});
    float s = (p.y - uPlSlope * p.x) * uPlRows;
    float f = fract(s);
    float id = floor(s);
    float seg = fract(p.x * 3.0 + id * 0.37);
    float desk = 1.0 - cAA(abs(seg - 0.5), 0.44);
    float top = cAA(f, 0.55) * (1.0 - cAA(f, 0.80)) * desk;
    float apron = cAA(f, 0.40) * (1.0 - cAA(f, 0.55)) * desk;
    float leg = (1.0 - cAA(abs(fract(seg * 4.0) - 0.5), 0.10)) * cAA(f, 0.14) * (1.0 - cAA(f, 0.40)) * desk;
    float chair = (1.0 - cAA(abs(seg - 0.5), 0.12)) * cAA(f, 0.84) * (1.0 - cAA(f, 0.96));
    vec3 c = flo;
    c = mix(c, ${C.legs}, max(leg, chair));
    c = mix(c, ${C.apron}, apron);
    c = mix(c, ${C.deskTop}, top);
    c = mix(c, ${C.ink}, cLine(f - 0.80, 1.6) * desk * 0.8);
    return cCap(c);
  }`,
  "plDeskRows(p, t)",
  {
    draws: "diagonal rows of red-topped school desks with dark aprons and slate legs on a pale blue-grey floor, the only saturated mass in the room",
    use: "plate",
    params: "uPlRows: number of desk rows across the frame (5 wide shot); uPlSlope: row diagonal slope (0.55, tune so rows run toward the windows)",
  },
  { uPlRows: { value: 5 }, uPlSlope: { value: 0.55 } });

export const plPointsBoard = N("plPointsBoard", "lavender class-points board with printed point lists, a banner strip that drops in four steps, tally strokes and a one-frame ghost 50",
  `uniform float uPlBanner;
  uniform float uPlTally;
  uniform float uPlGhost;
  float plBox(vec2 q, vec2 c, vec2 h){
    vec2 d = abs(q - c) - h;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  float plSegD(vec2 q, vec2 a, vec2 b, float r){
    vec2 ab = b - a;
    float h = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(q - a - ab * h) - r;
  }
  float plDigit(vec2 q, float five){
    float r = 0.11;
    float d0 = min(min(plSegD(q, vec2(-0.3, 0.8), vec2(0.3, 0.8), r), plSegD(q, vec2(-0.3, -0.8), vec2(0.3, -0.8), r)),
                   min(plSegD(q, vec2(-0.3, 0.8), vec2(-0.3, -0.8), r), plSegD(q, vec2(0.3, 0.8), vec2(0.3, -0.8), r)));
    float d5 = min(min(plSegD(q, vec2(-0.3, 0.8), vec2(0.3, 0.8), r), plSegD(q, vec2(-0.3, 0.8), vec2(-0.3, 0.05), r)),
                   min(min(plSegD(q, vec2(-0.3, 0.05), vec2(0.3, 0.05), r), plSegD(q, vec2(0.3, 0.05), vec2(0.3, -0.8), r)),
                       plSegD(q, vec2(0.3, -0.8), vec2(-0.3, -0.8), r)));
    return mix(d0, d5, five);
  }
  vec3 plPointsBoard(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 c = plRoomPlate(p, t);
    vec2 ctr = vec2(0.56, 0.64);
    vec2 hs = vec2(0.36, 0.22);
    c = mix(c, ${C.frame}, cFill(plBox(p, ctr, hs + 0.012)));
    c = mix(c, ${C.board}, cFill(plBox(p, ctr, hs)));
    vec2 q = (p - (ctr - hs)) / (2.0 * hs);
    float ink = 0.0;
    for (int r = 0; r < 8; r++) {
      float fr = float(r);
      float y = 0.80 - fr * 0.085;
      for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float w = 0.16 + 0.18 * cH21(vec2(fr, fk + 3.0));
        float x0 = 0.05 + fk * 0.50;
        float hh = 0.014 + 0.008 * step(fr, 0.5);
        ink = max(ink, cFill(plBox(q, vec2(x0 + w * 0.5, y), vec2(w * 0.5, hh))));
        ink = max(ink, cFill(plBox(q, vec2(x0 + 0.34, y), vec2(0.035, hh))));
      }
    }
    c = mix(c, ${C.text}, ink * 0.85);
    float n = floor(clamp(uPlTally, 0.0, 1.0) * 10.0 + 1e-3);
    float tal = 0.0;
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      float g = floor(fi / 5.0);
      float k = fi - g * 5.0;
      vec2 o = vec2(0.58 + g * 0.20 + k * 0.032, 0.14);
      float vd = plSegD(q, o, o + vec2(0.0, 0.14), 0.004);
      float sd = plSegD(q, vec2(0.57 + g * 0.20, 0.17), vec2(0.72 + g * 0.20, 0.25), 0.004);
      float dd = mix(vd, sd, step(3.5, k));
      tal = max(tal, cFill(dd) * step(fi + 0.5, n));
    }
    c = mix(c, ${C.text}, tal * 0.55);
    float drop = floor(clamp(uPlBanner, 0.0, 1.0) * 4.0 + 1e-3) / 4.0;
    vec2 bc = vec2(ctr.x, ctr.y + hs.y + 0.036 - drop * 0.076);
    float bd = plBox(p, bc, vec2(0.15, 0.036));
    c = mix(c, ${C.strip}, cFill(bd) * step(0.01, drop));
    float gl = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 cell = (p - bc - vec2(-0.123 + fi * 0.041, 0.0)) / vec2(0.015, 0.022);
      float hs1 = cH21(vec2(fi, 9.0));
      float sTop = cFill(plBox(cell, vec2(0.0, 0.8), vec2(0.9, 0.18))) * step(0.3, hs1);
      float sMid = cFill(plBox(cell, vec2(0.0, 0.0), vec2(0.9, 0.18))) * step(0.5, cH21(vec2(fi, 4.0)));
      float sBot = cFill(plBox(cell, vec2(0.0, -0.8), vec2(0.9, 0.18))) * step(0.2, cH21(vec2(fi, 2.0)));
      float sL = cFill(plBox(cell, vec2(-0.75, 0.0), vec2(0.18, 0.9)));
      float sp = step(3.5, fi) * (1.0 - step(4.5, fi));
      gl = max(gl, max(max(sTop, sMid), max(sBot, sL)) * (1.0 - sp));
    }
    c = mix(c, ${C.text}, gl * step(0.01, drop) * cFill(bd));
    vec2 gq = (p - vec2(ctr.x, ctr.y)) / 0.08;
    float ghost = cFill(min(plDigit(gq - vec2(-0.6, 0.0), 1.0), plDigit(gq - vec2(0.6, 0.0), 0.0)) * 0.08);
    c = mix(c, ${C.text}, ghost * clamp(uPlGhost, 0.0, 1.0));
    return cCap(c);
  }`,
  "plPointsBoard(p, t)",
  {
    draws: "a pale lavender wall board in a grey-violet frame with two columns of printed point lines, a paper CLASS D banner dropping from its top edge and a ghost 50 for one frame",
    use: "card",
    params: "uPlBanner: 0 to 1 drop of the banner strip in four steps (letters are printed stroke blocks, not a font); uPlTally: 0 to 1 reveals ten tally strokes; uPlGhost: alpha of the faint 50 (0.08 for 8.9 s); board sits at (0.56, 0.64)",
  },
  { uPlBanner: { value: 1 }, uPlTally: { value: 0 }, uPlGhost: { value: 0 } }, ["plRoomPlate"]);

export const plChessOverlay = N("plChessOverlay", "translucent chess board in perspective over the points board, ink king and pawn with cream edge, pawn lunge, king tips 38 degrees, board slam scale",
  `uniform float uPlSlam;
  uniform float uPlTake;
  uniform float uPlBoardA;
  float plPiece(vec2 q, float ht, float kind, float ang){
    float cs = cos(ang), sn = sin(ang);
    vec2 r = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
    float y = clamp(r.y / ht, 0.0, 1.0);
    float body = max(abs(r.x) - mix(0.020, 0.010, y) * ht / 0.15, max(-r.y, r.y - ht));
    float cap = length(r - vec2(0.0, ht)) - 0.016 * ht / 0.15;
    float cross = min(max(abs(r.x) - 0.004, abs(r.y - ht - 0.02) - 0.018), max(abs(r.x) - 0.014, abs(r.y - ht - 0.024) - 0.004));
    float king = min(min(body, cap), cross);
    float pawn = min(body, length(r - vec2(0.0, ht * 0.92)) - 0.014 * ht / 0.09);
    return mix(pawn, king, kind);
  }
  vec3 plChessOverlay(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 base = plPointsBoard(p, t);
    vec2 ctr = vec2(0.56, 0.62);
    float shake = 0.02 * sin(tt * 80.0) * step(0.001, uPlTake) * (1.0 - uPlTake);
    vec2 p2 = (p - ctr) / max(uPlSlam, 0.1) + ctr + vec2(shake, 0.0);
    float v = (p2.y - 0.30) / 0.46;
    float w = mix(0.46, 0.26, v);
    float u = (p2.x - ctr.x) / (2.0 * w) + 0.5;
    float inside = step(0.0, u) * step(u, 1.0) * step(0.0, v) * step(v, 1.0);
    float sq = mod(floor(u * 8.0) + floor(v * 8.0), 2.0);
    vec3 boardCol = mix(vec3(0.353, 0.345, 0.463), vec3(0.839, 0.824, 0.878), sq);
    vec3 c = mix(base, boardCol, inside * uPlBoardA);
    float e = smoothstep(0.0, 1.0, uPlTake);
    vec2 kU = vec2(0.56, 0.62);
    vec2 pU = mix(vec2(0.30, 0.28), vec2(0.52, 0.58), e);
    vec2 kB = vec2(ctr.x + (kU.x - 0.5) * 2.0 * mix(0.46, 0.26, kU.y), 0.30 + kU.y * 0.46);
    vec2 pB = vec2(ctr.x + (pU.x - 0.5) * 2.0 * mix(0.46, 0.26, pU.y), 0.30 + pU.y * 0.46);
    float tip = radians(38.0) * smoothstep(0.5, 1.0, uPlTake);
    float dk = plPiece(p2 - kB, 0.15 * mix(1.0, 0.6, kU.y), 1.0, tip);
    float dp = plPiece(p2 - pB, 0.087 * mix(1.0, 0.6, pU.y), 0.0, 0.0);
    float d = min(dk, dp);
    c = mix(c, ${C.pieceInk}, cFill(d));
    c = mix(c, ${C.pieceEdge}, cLine(d, 1.6) * 0.9);
    return cCap(c);
  }`,
  "plChessOverlay(p, t)",
  {
    draws: "a see-through chess board seen at an angle over the lavender board, with a dark king and a smaller dark pawn edged in cream, the pawn lunging onto the king",
    use: "card",
    params: "uPlSlam: board scale 1.35 down to 1.0; uPlTake: 0 to 1 pawn lunge and king tip (shakes the board while it runs); uPlBoardA: board opacity 0.72; pieces fixed at squares (0.56,0.62) king and (0.30,0.28) pawn start",
  },
  { uPlSlam: { value: 1 }, uPlTake: { value: 0 }, uPlBoardA: { value: 0.72 } }, ["plPointsBoard"]);

export const plSphereGraph = N("plSphereGraph", "S^2 of graphs: 60 Fibonacci nodes joined by about 150 near-neighbour edges, hard two-tone sphere, edges draw up from the south pole, green rim nodes",
  `uniform vec2 uPlSphC;
  uniform float uPlSphR;
  uniform float uPlGrow;
  uniform float uPlSpin;
  vec3 plSphNode(float i, float ang){
    float y = 1.0 - 2.0 * (i + 0.5) / 60.0;
    float r = sqrt(max(1.0 - y * y, 0.0));
    float ph = i * 2.39996 + ang;
    return vec3(r * cos(ph), y, r * sin(ph));
  }
  vec3 plSphereGraph(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float ang = radians(20.0) * tt + uPlSpin;
    vec3 c = plRoomPlate(p, t);
    vec2 q = (p - uPlSphC) / uPlSphR;
    float nz = sqrt(max(1.0 - dot(q, q), 0.0));
    float dl = dot(normalize(vec3(q, nz + 1e-4)), normalize(vec3(-0.45, 0.55, 0.7)));
    c = mix(c, mix(${C.frame}, ${C.strip}, cAA(dl, 0.15)), cFill((length(q) - 1.0) * uPlSphR));
    float reach = -1.0 + 2.0 * uPlGrow;
    float eF = 0.0;
    float eB = 0.0;
    float nodeF = 0.0;
    float nodeG = 0.0;
    for (int i = 0; i < 60; i++) {
      float fi = float(i);
      vec3 a = plSphNode(fi, ang);
      float seen = step(a.y, reach + 0.08);
      float nd = (length(q - a.xy) - 0.035) * uPlSphR;
      float fr = step(0.0, a.z);
      float rim = 1.0 - step(0.16, abs(a.z));
      nodeF = max(nodeF, cFill(nd) * fr * seen * (1.0 - rim));
      nodeG = max(nodeG, cFill(nd) * seen * rim);
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float off = 5.0 + 3.0 * fk + 2.0 * step(1.5, fk);
        vec3 b = plSphNode(fi + off, ang);
        float ok = step(fi + off, 59.5) * step(length(a - b), 0.62) * step(min(a.y, b.y), reach);
        float l = cLine(plSegD(q, a.xy, b.xy, 0.0) * uPlSphR, 1.4) * ok;
        float front = step(0.0, a.z + b.z);
        eF = max(eF, l * front);
        eB = max(eB, l * (1.0 - front));
      }
    }
    c = mix(c, ${C.wSh}, eB * 0.45);
    c = mix(c, ${C.win}, eF);
    c = mix(c, ${C.win}, nodeF);
    c = mix(c, ${C.gBody}, nodeG);
    return cCap(c);
  }`,
  "plSphereGraph(p, t)",
  {
    draws: "a lavender ball of fine light lines and small dots, a sphere of connected graph nodes with a few green dots on its rim, the lines growing up from the bottom",
    use: "card",
    params: "uPlSphC/uPlSphR: centre and radius in screen units (bloom 0 to 1.12 to 1.0 by scaling uPlSphR); uPlGrow: 0 to 1 draw-in from the south pole; uPlSpin: extra spin in radians on top of 20 degrees per second",
  },
  { uPlSphC: { value: v2(0.36, 0.52) }, uPlSphR: { value: 0.20 }, uPlGrow: { value: 1 }, uPlSpin: { value: 0 } }, ["plRoomPlate", "plPointsBoard"]);

export const plCardFrame = N("plCardFrame", "floating green card frame: pale mono frame bobbing 0.03 m, four green corner points, corners lift toward #3ddc84 when lit",
  `uniform vec2 uPlCardC;
  uniform float uPlCardLit;
  vec3 plCardFrame(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 c = plRoomPlate(p, t);
    vec2 q = p - (uPlCardC + vec2(0.0, 0.006 * sin(tt * 2.6)));
    vec2 hs = vec2(0.07, 0.10);
    float d = plBox(q, vec2(0.0), hs);
    c = mix(c, ${C.strip}, cFill(abs(d + 0.006) - 0.006) * 0.92);
    vec3 gc = mix(${C.gBody}, ${C.gGlint}, clamp(uPlCardLit, 0.0, 1.0));
    float pts = 0.0;
    float core = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 o = vec2(mix(-hs.x, hs.x, mod(fi, 2.0)), mix(-hs.y, hs.y, step(1.5, fi)));
      pts = max(pts, cFill(length(q - o) - 0.012));
      core = max(core, cFill(length(q - o) - 0.005));
    }
    c = mix(c, gc, pts);
    c = mix(c, ${C.gCore}, core);
    return cCap(c);
  }`,
  "plCardFrame(p, t)",
  {
    draws: "a thin pale rectangular frame floating in the room with a small green dot at each corner and nothing inside it",
    use: "card",
    params: "uPlCardC: frame centre (0.30, 0.56); uPlCardLit: 0 to 1 lifts the corner green toward bright mint (the 0.4 s cardframe flash); bob 0.006 on twos",
  },
  { uPlCardC: { value: v2(0.30, 0.56) }, uPlCardLit: { value: 0 } }, ["plRoomPlate", "plPointsBoard"]);

export const plEyeHalfLid = N("plEyeHalfLid", "Ayanokoji's half-lidded seal eye: flat wine iris, ink pupil, lid line at 25 percent or 50 percent, 4-point glint star with one green point",
  `uniform float uPlLid;
  uniform float uPlGlint;
  vec3 plEyeHalfLid(vec2 p, float t){
    vec2 e = p - vec2(0.5, 0.5);
    vec3 c = ${C.back};
    float ball = (length(e / vec2(0.34, 0.24)) - 1.0) * 0.24;
    c = mix(c, ${C.wLit} * 0.96, cFill(ball));
    float iris = (length((e - vec2(0.02, -0.01)) / vec2(0.15, 0.17)) - 1.0) * 0.15;
    c = mix(c, ${C.wine}, cFill(iris));
    c = mix(c, ${C.inkFloor}, cFill(length(e - vec2(0.02, -0.01)) - 0.055));
    float lidY = 0.24 * (1.0 - 2.0 * uPlLid);
    float lid = cAA(e.y, lidY) * cFill((length(e / vec2(0.40, 0.31)) - 1.0) * 0.28);
    c = mix(c, ${C.backSh}, lid);
    float lidLine = cLine(e.y - lidY, 2.4) * cFill(ball * 1.15);
    c = mix(c, ${C.inkFloor}, lidLine);
    vec2 g = (e - vec2(0.06, 0.02)) * 4.0;
    float star = max(exp(-18.0 * dot(g, g)), exp(-90.0 * min(abs(g.x), abs(g.y))) * exp(-3.0 * length(g)) * 0.8);
    float on = clamp(uPlGlint, 0.0, 1.0) * (1.0 - lid);
    c = mix(c, ${C.win}, cAA(star, 0.35) * on);
    float lobe = cFill(length(e - vec2(0.13, -0.07)) - 0.026) * on;
    c = mix(c, ${C.gBody}, lobe);
    c = mix(c, ${C.gCore}, cFill(length(e - vec2(0.13, -0.07)) - 0.011) * on);
    return cCap(c);
  }`,
  "plEyeHalfLid(p, t)",
  {
    draws: "one big calm eye on grey-blue fur, a wine-red flat iris under a heavy lid line, a white four-point star glint and one tiny green dot beside it",
    use: "card",
    params: "p: eye-local uv, centre (0.5, 0.5); uPlLid: 0.25 calm, 0.5 half-lid (the lid drops from 0 open to 0.5); uPlGlint: 0 to 1 shows the star and the green point (the 0.75 s glint)",
  },
  { uPlLid: { value: 0.5 }, uPlGlint: { value: 1 } });

export const plRikuSeal = N("plRikuSeal", "Riku-style seal body: pale-blue back, cream belly, one hard cel step at N.L 0.2 shifted toward violet, window-side rim band, soft fur clumps and ragged cuts on the contour",
  `uniform float uPlFurK;
  uniform float uPlRimOn;
  vec3 plRikuSeal(vec2 p, float t){
    vec3 bg = plRoomPlate(p, t);
    vec2 c0 = cN(p);
    float R = sqrt(0.22);
    float ang = atan(c0.y, c0.x);
    float d = length(c0) - R;
    d -= 0.007 * abs(sin(0.5 * uPlFurK * ang + 1.5 * cVn(6.0 * p)));
    d += step(0.5, cH21(vec2(floor(ang * 1.4), 3.0))) * 0.018 * cH21(vec2(floor(ang * 9.0), 7.0)) * step(c0.y, 0.12);
    float h = cNdL(p);
    float lit = cAA(h, 0.6);
    float belly = 1.0 - cAA(c0.y, -0.06 - 0.02 * c0.x);
    float flank = (1.0 - cAA(c0.y, 0.05)) * (1.0 - belly);
    vec3 col = mix(${C.back}, ${C.flank}, flank);
    col = mix(col, ${C.belly}, belly);
    col = mix(col * vec3(0.93, 0.91, 1.02), col, lit);
    float nz = sqrt(max(0.22 - dot(c0, c0), 0.0)) / R;
    float rim = cAA(pow(max(1.0 - nz, 0.0), 5.0), 0.5) * cAA(-c0.x, 0.0);
    col = mix(col, ${C.win}, rim * uPlRimOn);
    col = mix(col, ${C.lineBelly}, cLine(d + 0.006, 1.2) * belly * 0.7);
    col = mix(col, ${C.ink}, cLine(d, 1.6));
    return cCap(mix(bg, col, cFill(d)));
  }`,
  "plRikuSeal(p, t)",
  {
    draws: "a chubby pale-blue seal with a cream belly, one hard shadow step, a thin warm outline, small ragged fur tufts on its edge and a pale light rim on the window side",
    use: "surface",
    params: "uPlFurK: fur clump count around the contour (22 hero, 18 Reviewer); uPlRimOn: 0 or 1 turns the window-side rim band on; body fixed at (0.72, 0.50) like the kit's seal",
  },
  { uPlFurK: { value: 22 }, uPlRimOn: { value: 1 } }, ["plRoomPlate"]);

export const plBlazerTie = N("plBlazerTie", "red school blazer in three hard bands with lapel lines, white collar and shirt V, navy tie with pale diagonal stripes, over the seal body",
  `vec3 plBlazerTie(vec2 p, float t){
    vec3 base = plRikuSeal(p, t);
    vec2 c0 = cN(p);
    float h = cNdL(p);
    float below = 1.0 - cAA(c0.y, -0.02);
    float mask = cCover(p) * below;
    vec3 wool = cCel3(h, 0.40, 0.62, ${C.bSh}, ${C.bMid}, ${C.bLit});
    float vOpen = abs(c0.x) - 0.07 * (c0.y + 0.14) / 0.12;
    float open = cFill(vOpen) * cAA(c0.y, -0.14);
    vec3 c = mix(base, wool, mask);
    c = mix(c, ${C.ink}, cLine(vOpen - 0.012, 1.4) * mask * cAA(c0.y, -0.14) * 0.8);
    c = mix(c, ${C.wLit}, open * mask);
    float tieW = 0.018 * (1.0 - 0.3 * clamp((-c0.y - 0.02) / 0.15, 0.0, 1.0));
    float tie = cFill(max(abs(c0.x) - tieW, max(c0.y + 0.17, -0.02 - c0.y))) * mask;
    float stripe = cAA(fract((c0.y + c0.x) * 36.0), 0.55);
    c = mix(c, mix(${C.navy}, ${C.navyStripe}, stripe), tie);
    float collar = cFill(plBox(vec2(abs(c0.x), c0.y), vec2(0.075, -0.028), vec2(0.03, 0.012))) * mask;
    c = mix(c, ${C.wLit}, collar);
    return cCap(c);
  }`,
  "plBlazerTie(p, t)",
  {
    draws: "a deep red jacket on the seal's body with a white V shirt front, a small white collar and a dark blue tie striped in pale blue",
    use: "surface",
    params: "no uniforms; jacket covers the body below y 0.48; lit/mid/shade follow the kit's N.L from cNdL; tie navy #2a3358 stripe #8a93b8",
  },
  null, ["plRikuSeal", "plPointsBoard"]);

export const plAyaHair = N("plAyaHair", "Ayanokoji's tousled brown hair: 9 tapered fringe clumps swept right over the brow and 4 crown tufts, four browns, one gloss cut per clump",
  `uniform float uPlSweep;
  uniform float uPlGust;
  float plTaper(vec2 q, vec2 a, vec2 b, float w0){
    vec2 ab = b - a;
    float h = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(q - a - ab * h) - w0 * (1.0 - 0.85 * h);
  }
  vec3 plAyaHair(vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    vec3 c = plBlazerTie(p, t);
    for (int i = 0; i < 13; i++) {
      float fi = float(i);
      float fringe = 1.0 - step(8.5, fi);
      float tf = fi - 9.0;
      vec2 a = mix(vec2(0.62 + tf * 0.07, 0.84), vec2(0.60 + fi * 0.036, 0.80 - 0.006 * abs(fi - 4.0)), fringe);
      vec2 b = mix(vec2(0.64 + tf * 0.07 + 0.03 * uPlSweep, 0.97), vec2(0.60 + fi * 0.034 * uPlSweep + 0.04, 0.575 + 0.025 * cH21(vec2(fi, 5.0))), fringe);
      b.x += 0.004 * sin(tt * 3.0 + fi) * uPlGust;
      float w0 = mix(0.016, 0.022, fringe);
      float d = plTaper(p, a, b, w0);
      float tone = cH21(vec2(fi, 11.0));
      vec3 hc = mix(${C.hairBase}, ${C.hairMid}, cAA(tone, 0.5));
      float gloss = cLine(plTaper(p + vec2(0.006, -0.004), a, b, w0 * 0.55), 1.2) * step(0.45, cH21(vec2(fi, 13.0)));
      hc = mix(hc, ${C.hairHi}, gloss);
      c = mix(c, ${C.hairGap}, cLine(d, 2.0) * 0.9);
      c = mix(c, hc, cFill(d));
    }
    return cCap(c);
  }`,
  "plAyaHair(p, t)",
  {
    draws: "dark brown anime hair in hard-edged tapered clumps, a fringe sweeping across the forehead to the right and a few tufts standing up at the crown, each with a thin lighter gloss cut",
    use: "surface",
    params: "uPlSweep: how far the fringe sweeps right over the brow (1.0, 0 lays it flat); uPlGust: 0 to 1 stepped sway of the tips; hair sits at y 0.57 to 0.97 on the kit's seal",
  },
  { uPlSweep: { value: 1 }, uPlGust: { value: 0 } }, ["plBlazerTie"]);

export const plPrintGrade = N("plPrintGrade", "Lerche print grade: luma cap 0.92, ink floor #1a0e16 above luma 0.035, split-tone, cool day, grey-lavender mono that keeps green, or gold-low, with grain on twos",
  `uniform float uPlMode;
  vec3 plPrintGrade(vec3 col, vec2 p, float t){
    float tt = floor(t * 12.0 + 1e-4) / 12.0;
    float Y = cLuma(col);
    vec3 day = mix(col, col * vec3(0.92, 0.97, 1.10), 0.25);
    day = mix(day, ${C.splitSh}, (1.0 - smoothstep(0.0, 0.5, Y)) * 0.20);
    day = mix(day, ${C.splitHi}, smoothstep(0.55, 1.0, Y) * 0.18);
    float g = smoothstep(0.02, 0.10, col.g - max(col.r, col.b));
    vec3 mono = mix(mix(vec3(0.20, 0.19, 0.27), vec3(0.78, 0.76, 0.82), Y), col, g);
    vec3 gold = mix(col, mix(vec3(1.0, 0.604, 0.290), vec3(1.0, 0.851, 0.541), Y) * (0.5 + 0.5 * Y), 0.38);
    float m1 = step(0.5, uPlMode) * (1.0 - step(1.5, uPlMode));
    float m2 = step(1.5, uPlMode);
    vec3 c = mix(mix(day, mono, m1), gold, m2);
    float Y2 = cLuma(c);
    c += (cH21(floor(gl_FragCoord.xy) + tt * 37.0) - 0.5) * 0.02 * (1.0 - Y2) * smoothstep(0.06, 0.12, Y2);
    c *= cVig(p, 0.10);
    c = cCap(c);
    return mix(${C.inkFloor}, c, smoothstep(0.035, 0.08, cLuma(c)));
  }`,
  "plPrintGrade(plWindowBleed(plRoomPlate(p, t), p, t), p, t)",
  {
    draws: "the whole frame in cool soft daylight with warm-violet shadows, or grey-lavender with only green left bright, or warmed by low gold light; never pure white or pure black",
    use: "grade",
    params: "uPlMode: 0 day (shots 1-3, 6-8), 1 mono (6.92 to 8.04 s), 2 gold-low (18.0 s on); cap 0.92, floor luma 0.035 and vignette 0.10 fixed; grain 0.02 re-rolled on twos",
  },
  { uPlMode: { value: 0 } }, ["plWindowBleed"]);

export const plBlueKey = N("plBlueKey", "checkmate blue key: the frame cut into three flat blues #101830 / #1a3a8a / #8ab4f0 by luma, darkest lines turned to blue-night ink #241518",
  `uniform float uPlBlue;
  vec3 plBlueKey(vec3 col, vec2 p, float t){
    float Y = cLuma(col);
    vec3 key = cCel3(Y, 0.30, 0.62, ${C.bkDark}, ${C.bkMid}, ${C.bkLight});
    key = mix(key, ${C.inkBlue}, (1.0 - cAA(Y, 0.10)) * 0.8);
    vec3 c = cCap(mix(col, key, clamp(uPlBlue, 0.0, 1.0)));
    return mix(${C.inkFloor}, c, smoothstep(0.035, 0.08, cLuma(c)));
  }`,
  "plBlueKey(plRoomPlate(p, t), p, t)",
  {
    draws: "the whole picture turned into a cold three-tone blue, deep navy shadows, royal-blue middles and pale sky-blue lights, with the darkest lines in a brownish night ink",
    use: "grade",
    params: "uPlBlue: strength 0 to 1 (0.85 for 8.04 to 9.0 s, ramp over 2 frames by driving this); bands split at luma 0.30 and 0.62; feed it the finished frame colour",
  },
  { uPlBlue: { value: 0.85 } }, ["plRoomPlate"]);

export const CUT_PACKET = [
  plRoomPlate, plWindowBleed, plOutsidePlate, plDeskRows, plPointsBoard, plChessOverlay, plSphereGraph,
  plCardFrame, plEyeHalfLid, plRikuSeal, plBlazerTie, plAyaHair, plPrintGrade, plBlueKey,
];
export const CUT_PACKET_COUNT = 14;
export default CUT_PACKET;
