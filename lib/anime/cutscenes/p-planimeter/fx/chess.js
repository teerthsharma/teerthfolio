// The chess overlay and its lettering: board in perspective, king and pawn, the pawn takes the king, the extruded
// CHECKMATE, the CLACK mark and the ghost "50". Bible E13, E15, section 6 (Chess overlay), Easter egg 1.
// Everything hangs in WORLD space behind the seal (never over it, law L2): the planes sit at the chalkboard, the
// seal stands nearer the lens, and the keep-clear fade removes anything translucent that would cross it.
//
// Maths
//   board    a trapezoid (top edge x in [250, 774] at y 260, bottom edge x in [40, 984] at y 740 of a 1024 x 768
//            canvas). Square (r, c) has corners bilinear in (c/8, r/8):  P = lerp(lerp(TL, TR, c/8), lerp(BL, BR, c/8), r/8).
//            Light #f6f0e0 at 0.5, dark #1c1838 at 0.58 (the anime's translucent painted board).
//   pieces   ink #16122c with a 5 px #ffeec8 edge (stroke first, fill over): king 360 px tall, pawn 210 px tall of the
//            768 px board, so king = 360/768 H_board m = 1.62 m, pawn = 0.94 m for H_board = 3.45 m.
//   slam     board scale s(u) = 1.35 - 0.35 e(u) with an overshoot hold, alpha = e(u), u = (t - t0)/0.35; it draws away
//            over 0.4 s from 0.4 s before f213 with s growing 1.0 -> 1.06 and alpha falling to 0.
//   take     three key drawings on twos: i = floor((t - t0) 12). i=0 pawn winds (x 1.3, tilt +6 deg); i=1 lunge
//            (x .15, smear stretch 1.25, tilt -14); i=2 contact (x -.55, king tips 38 deg, board shakes 0.02 m);
//            i>=3 the king lies (78 deg) and the pawn holds the square.
//   pop      the lettering scale 0.7 -> 1.12 -> 1.0 over 10 frames: s = lerp(.7, 1.12, e(2u)) for u<.5, then
//            lerp(1.12, 1, e(2u - 1)); roll -0.04 rad.
import * as THREE from "three";
import { mat, canvasTex, prog, sstep, lerp, clamp01, boardK } from "./lib.js";

function boardTex() {
  return canvasTex(1024, 768, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const TL = [250, 260], TR = [774, 260], BL = [40, 740], BR = [984, 740];
    const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const P = (r, c) => L(L(TL, TR, c / 8), L(BL, BR, c / 8), r / 8);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const a = P(r, c), b = P(r, c + 1), d = P(r + 1, c + 1), e = P(r + 1, c);
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...d); g.lineTo(...e); g.closePath();
      g.fillStyle = (r + c) % 2 ? "rgba(28,24,56,0.58)" : "rgba(246,240,224,0.5)"; g.fill();
    }
    g.beginPath(); g.moveTo(...TL); g.lineTo(...TR); g.lineTo(...BR); g.lineTo(...BL); g.closePath();
    g.lineWidth = 5; g.strokeStyle = "rgba(255,238,200,0.9)"; g.stroke();   // gold edge of the end card
  });
}
function pieceTex(kind) {
  const W = 256, H = kind === "king" ? 512 : 384;
  return canvasTex(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    const draw = () => {
      g.beginPath();
      if (kind === "king") {
        g.moveTo(40, H - 14); g.lineTo(216, H - 14); g.lineTo(216, H - 44); g.lineTo(190, H - 60);
        g.bezierCurveTo(176, H - 150, 196, H - 250, 168, H - 300);        // flared body
        g.lineTo(186, H - 316); g.lineTo(186, H - 342); g.lineTo(70, H - 342); g.lineTo(70, H - 316); g.lineTo(88, H - 300);
        g.bezierCurveTo(60, H - 250, 80, H - 150, 66, H - 60); g.lineTo(40, H - 44); g.closePath();
        // crown and cross
        g.moveTo(88, H - 342); g.bezierCurveTo(70, H - 372, 96, H - 410, 128, H - 410); g.bezierCurveTo(160, H - 410, 186, H - 372, 168, H - 342);
        g.closePath();
        g.moveTo(116, H - 408); g.lineTo(116, H - 440); g.lineTo(98, H - 440); g.lineTo(98, H - 458); g.lineTo(116, H - 458);
        g.lineTo(116, H - 486); g.lineTo(140, H - 486); g.lineTo(140, H - 458); g.lineTo(158, H - 458); g.lineTo(158, H - 440);
        g.lineTo(140, H - 440); g.lineTo(140, H - 408); g.closePath();
      } else {
        g.moveTo(50, H - 12); g.lineTo(206, H - 12); g.lineTo(206, H - 40); g.lineTo(180, H - 56);
        g.bezierCurveTo(166, H - 110, 156, H - 150, 150, H - 200);        // stem
        g.lineTo(176, H - 214); g.lineTo(176, H - 236); g.lineTo(80, H - 236); g.lineTo(80, H - 214); g.lineTo(106, H - 200);
        g.bezierCurveTo(100, H - 150, 90, H - 110, 76, H - 56); g.lineTo(50, H - 40); g.closePath();
        g.moveTo(128 + 52, H - 290); g.arc(128, H - 290, 52, 0, Math.PI * 2);   // the head
      }
    };
    draw(); g.lineJoin = "round"; g.lineWidth = 12; g.strokeStyle = "#ffeec8"; g.stroke();   // 5 px edge (half hidden by the fill)
    draw(); g.fillStyle = "#16122c"; g.fill("nonzero");
    // one hard highlight cut, the anime's single slanted stroke
    g.beginPath(); g.moveTo(92, H - 80); g.lineTo(100, H - 230); g.lineWidth = 5; g.strokeStyle = "rgba(255,238,200,0.55)"; g.stroke();
  });
}
function letterTex(text, w, h, size, o = {}) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.font = `900 ${size}px "Times New Roman", Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle";
    const cx = w / 2, cy = h / 2 - 8;
    g.fillStyle = o.shadow ?? "#101018"; g.fillText(text, cx + (o.drop ?? 8), cy + (o.drop ?? 8));          // hard drop
    if (o.extrude) for (let i = o.extrude; i >= 1; i--) { g.fillStyle = o.deep ?? "#5e121b"; g.fillText(text, cx + i * 0.8, cy + i * 0.8); }  // extruded serif
    g.lineJoin = "round"; g.lineWidth = o.stroke ?? 0; if (o.stroke) { g.strokeStyle = o.rim ?? "#f1ebdc"; g.strokeText(text, cx, cy); }
    g.fillStyle = o.face ?? "#a8222f"; g.fillText(text, cx, cy);
  });
}
function chalkNoteTex(text, size, w, h) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.font = `700 ${size}px "Comic Sans MS", "Segoe Print", cursive`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#fffdf0"; g.fillText(text, w / 2, h / 2);
    // chalk dropout: erase a seeded speckle from the glyphs
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + 0.5 * ((i * 97) % 13) / 13})`; g.fillRect(((i * 7919) % w), ((i * 104729) % h), 2, 2); }
  });
}

export default function chess(ctx, U, T, L, frame) {
  const grp = new THREE.Group();
  const own = [];
  const keep = (x) => { own.push(x); return x; };
  const [cx, cy, cz] = L.chess;
  const HB = 3.45, WB = 4.6;

  const texMat = (tex, extra = {}) => keep(mat(U, /* glsl */ `
    uniform sampler2D uMap; uniform float uA;
    void main(){ vec4 c = texture2D(uMap, vUv); gl_FragColor = vec4(c.rgb, c.a * uA * keepClear(vW)); }`,
    { uMap: { value: tex }, uA: { value: 0 }, ...extra }, { side: THREE.DoubleSide }));
  const plane = (w, h, m, order, pivotBottom = false) => {
    const geo = keep(new THREE.PlaneGeometry(w, h)); if (pivotBottom) geo.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = order; mesh.frustumCulled = false; mesh.visible = false; grp.add(mesh); return mesh;
  };

  const boardM = texMat(keep(boardTex()));
  const board = plane(WB, HB, boardM, 30);
  const kingM = texMat(keep(pieceTex("king"))), pawnM = texMat(keep(pieceTex("pawn")));
  const king = plane(0.81, 1.62, kingM, 32, true), pawn = plane(0.63, 0.94, pawnM, 33, true);

  const checkM = texMat(keep(letterTex("CHECKMATE", 1700, 340, 250, { extrude: 14, stroke: 6, drop: 10 })));
  const check = plane(4.6, 0.92, checkM, 40);
  const clackM = texMat(keep(letterTex("CLACK", 640, 256, 190, { face: "#f1ebdc", shadow: "#101018", drop: 6, deep: "#101018", extrude: 0 })));
  const clack = plane(1.5, 0.6, clackM, 41);
  const ghostM = texMat(keep(chalkNoteTex("50", 340, 512, 320)));
  const ghost = plane(0.8, 0.5, ghostM, 5);
  ghost.position.set(L.board[0] + 1.55, L.board[1] - 0.8, L.board[2] + 0.03);

  const home = { king: [cx - 1.25, cy - 1.45], pawn: [cx + 1.3, cy - 1.45] };
  const E = (x) => sstep(0, 1, clamp01(x));

  function update(t, dt, cue) {
    const bk = boardK(T, t);
    const u = prog(T.board, t), o = prog(T.boardOut, t);
    const vis = bk > 0.001;
    [board, king, pawn].forEach((m) => { m.visible = vis; });
    boardM.uniforms.uA.value = bk; kingM.uniforms.uA.value = bk; pawnM.uniforms.uA.value = bk;
    // slam in with overshoot, hold, draw away
    const slam = u < 1 ? 1.35 - 0.35 * E(u) - 0.04 * Math.sin(Math.PI * u) : 1;
    const s = slam * (1 + 0.06 * E(o));
    // the take: three key drawings on twos
    const i = t < T.pawn.t ? -1 : Math.floor((t - T.pawn.t) * 12);
    let px = home.pawn[0], pr = 0.1, ps = 1, kr = 0, kx = home.king[0], shake = 0;
    if (i === 0) { px = home.pawn[0] - 0.15; pr = 0.1; }
    else if (i === 1) { px = cx + 0.15; pr = -0.25; ps = 1.25; }
    else if (i === 2) { px = cx - 0.55; pr = 0.02; kr = 0.66; kx = home.king[0] - 0.1; shake = 0.02; }
    else if (i >= 3) { px = cx - 0.55; pr = 0; kr = 1.36; kx = home.king[0] - 0.35; }
    board.position.set(cx + (i === 2 ? shake : 0), cy, cz); board.scale.setScalar(s);
    king.position.set(cx + (kx - cx) * s, cy + (home.king[1] - cy) * s, cz + 0.05);
    king.rotation.z = kr; king.scale.setScalar(s);
    pawn.position.set(cx + (px - cx) * s, cy + (home.pawn[1] - cy) * s + (i === 1 ? 0.06 : 0), cz + 0.06);
    pawn.rotation.z = pr; pawn.scale.set(s, s * ps, s);

    // CHECKMATE: pop 0.7 -> 1.12 -> 1.0 over 10 frames, hold with the board, leave with it
    const pk = prog(T.checkmate, t);
    const pop = pk < 0.5 ? lerp(0.7, 1.12, E(pk * 2)) : lerp(1.12, 1.0, E(pk * 2 - 1));
    check.visible = t >= T.checkmate.t && bk > 0.001;
    checkM.uniforms.uA.value = (t >= T.checkmate.t ? 1 : 0) * bk;
    check.position.set(cx, cy + 1.25, cz + 0.35); check.scale.setScalar(pop * (1 + 0.04 * E(o))); check.rotation.z = -0.04;

    // CLACK: 4 frames at the contact
    const ck = t - T.pawn.t;
    clack.visible = ck >= 1 / 12 && ck < 1 / 12 + 4 / 24;
    clackM.uniforms.uA.value = clack.visible ? 1 : 0;
    clack.position.set(cx - 0.35, cy - 0.55, cz + 0.4); clack.rotation.z = 0.12; clack.scale.setScalar(1.05 + 0.1 * Math.sin(ck * 40));

    // ghost 50: 8% chalk on the board's lower right, after the board has gone
    const gk = t - T.ghost50.t;
    const gA = gk < 0 ? 0 : (E(gk / 0.4) * (1 - E((gk - T.ghost50.dur) / 1.0))) * 0.08;
    ghost.visible = gA > 0.001; ghostM.uniforms.uA.value = gA;
  }
  return { group: grp, update, dispose() { own.forEach((x) => x.dispose?.()); } };
}
