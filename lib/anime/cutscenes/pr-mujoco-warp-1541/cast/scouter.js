// SCOUTER prop (bible 3.13): green lens #7be07a, gold frame #b8741a, cream rim, number strip.
// Digits tick 1.0 -> 1.4 (f72-f168) as a 12 fps strip, blur at f144-f168, then a cracked glyph; the crack overlay and
// a 4-point sparkle star share one canvas atlas. No new shader programs after build: lens/frame are engine.figure
// (the shared anime program); the digit planes are MeshBasicMaterial with alphaTest (no blending, no transparency).
//
// ATLAS (4 x 3 cells of 128 px): 0 "1.0" 1 "1.1" 2 "1.2" 3 "1.3" 4 "1.4" 5 blur "8.8.8" 6 "ERR" 7 "484" 8 crack 9 star
export function makeAtlas(THREE) {
  if (typeof document === "undefined") return null;
  const S = 128, cv = document.createElement("canvas");
  cv.width = S * 4; cv.height = S * 3;
  const g = cv.getContext("2d");
  const cell = (n) => [(n % 4) * S, Math.floor(n / 4) * S];
  const txt = (n, s, col = "#0f3a22", size = 54) => {
    const [x, y] = cell(n);
    g.fillStyle = col; g.font = `bold ${size}px monospace`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(s, x + S / 2, y + S / 2);
  };
  ["1.0", "1.1", "1.2", "1.3", "1.4"].forEach((s, i) => txt(i, s));
  txt(5, "8.8.8", "#1f6a3a", 40); txt(6, "ERR", "#8f2230", 54); txt(7, "484", "#0f3a22", 58);
  { // crack: a cream zigzag with a branch
    const [x, y] = cell(8); g.strokeStyle = "#fbfaf7"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath();
    g.moveTo(x + 14, y + 20); g.lineTo(x + 52, y + 56); g.lineTo(x + 40, y + 74); g.lineTo(x + 84, y + 100); g.lineTo(x + 112, y + 112);
    g.moveTo(x + 52, y + 56); g.lineTo(x + 100, y + 38); g.stroke();
  }
  { // star: 4-point sparkle with thin concave points
    const [x, y] = cell(9), c = S / 2; g.fillStyle = "#fbfaf7"; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, r = i % 2 ? 11 : 60; g.lineTo(x + c + Math.cos(a) * r, y + c + Math.sin(a) * r); }
    g.closePath(); g.fill();
  }
  const tex = (n) => {
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.repeat.set(0.25, 1 / 3); t.colorSpace = THREE.SRGBColorSpace;
    setCell(t, n); t.needsUpdate = true; return t;
  };
  return { tex, cv };
}
export function setCell(t, n) { t.offset.set((n % 4) * 0.25, 1 - (Math.floor(n / 4) + 1) / 3); }

// builds the scouter on a costumed seal; returns { group, lensG, digit(n), crack(on), star(on,k), pop(), unpop() }
// side: +1 eye on +x. size: 1 soldier, 1.25 commander. digitTex: this scouter's own digit texture (or null)
export function addScouter(ctx, seal, atlas, { size = 1, side = 1, digitTex, crackTex, starTex }) {
  const { THREE, engine, sdf } = ctx;
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade, { line: 1 })), { lineMul: 0.7, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };
  const g = new THREE.Group(), R = 0.085 * size, x0 = 0.125 * side, y0 = 0.585, z0 = 0.3, ry = 0.3 * side;
  g.userData.layer = 1;
  const lens = fig(new THREE.CylinderGeometry(R, R, 0.014, 20).rotateX(Math.PI / 2), "#7be07a", "#3fb870", { pos: [x0, y0, z0], rot: [0, ry, 0] });
  const frame = fig(new THREE.TorusGeometry(R * 1.04, 0.012, 6, 22), "#b8741a", "#7a4a10", { pos: [x0, y0, z0], rot: [0, ry, 0] });
  const rim = fig(new THREE.TorusGeometry(R * 0.9, 0.004, 4, 20), "#fbfaf7", "#e8e4d8", { pos: [x0, y0, z0 + 0.008], rot: [0, ry, 0] });
  const arm = fig(new THREE.BoxGeometry(0.02, 0.02, 0.26), "#b8741a", "#7a4a10", { pos: [x0 + 0.075 * side, y0, z0 - 0.12], rot: [0, -0.5 * side, 0] });
  const lensG = new THREE.Group();
  lensG.add(lens, frame, rim);
  g.add(lensG, arm);
  let crackM = null, starM = null;
  if (atlas && digitTex) {
    const mk = (tex, w, h, dz) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(x0, y0, z0 + dz); m.rotation.y = ry; m.layers.set(1); lensG.add(m); return m;
    };
    mk(digitTex, R * 1.7, R * 1.7, 0.012);
    crackM = mk(crackTex, R * 2.0, R * 2.0, 0.013); crackM.visible = false;
    starM = mk(starTex, R * 3.2, R * 3.2, 0.018); starM.visible = false;
  }
  seal.props.add(g);
  const c = {
    group: g, lensG, popped: false,
    digit(n) { if (digitTex) setCell(digitTex, n); },
    crack(on) { if (crackM) crackM.visible = on; },
    star(on, k = 1) { if (starM) { starM.visible = on; starM.scale.setScalar(0.4 + k); } },
    pop() { c.popped = true; lensG.visible = false; },
    unpop() { c.popped = false; lensG.visible = true; },
  };
  return c;
}
