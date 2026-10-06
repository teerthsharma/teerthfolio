// pr-pyrefly-4180 FX helpers (promotable: canvas textures, additive mats, stage anchors, beat-start lookup).
// All motion is a pure function of the clock so a scrub equals a play.
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const ph = (t, a, b) => clamp01((t - a) / Math.max(1e-6, b - a)); // 0..1 across [a,b]
export const sm = (x) => x * x * (3 - 2 * x);

// Start time of a beat: the scene's beat if it has fired, else the bible default (seconds).
export function startOf(cue, name, def) {
  const s = cue && cue.since ? cue.since(name) : Infinity;
  return Number.isFinite(s) ? cue.t - s : def;
}

// Stage anchors. Seal at scene.seal.at, fox 14 m ahead of the seal (seal-local +z). scene.stage may override
// { fox:[x,y,z] base, kunai:[[x,y,z] x3] } in world metres so cast and fx agree.
export function stage(ctx) {
  const { THREE, scene } = ctx;
  const sl = scene.seal || {};
  const at = new THREE.Vector3(...(sl.at || [0, 0, 0]));
  const yaw = sl.yaw || 0;
  const Y = new THREE.Vector3(0, 1, 0);
  const loc = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(Y, yaw).add(at);
  const st = scene.stage || {};
  const F = st.fox ? new THREE.Vector3(...st.fox) : loc(0, 0, 14);
  const toSeal = at.clone().sub(F); toSeal.y = 0; toSeal.normalize();
  const side = new THREE.Vector3().crossVectors(Y, toSeal);
  const K = st.kunai
    ? st.kunai.map((p) => new THREE.Vector3(...p))
    : [[-6, 3.5, -1], [5, 7, -2], [0, 10.5, 0]].map((p) =>
        F.clone().addScaledVector(side, p[0]).addScaledVector(toSeal, p[2] + 3).add(new THREE.Vector3(0, p[1], 0)));
  return {
    at, yaw, F, toSeal, side, K, loc,
    mouth: F.clone().addScaledVector(toSeal, 5).add(new THREE.Vector3(0, 7.2, 0)),
    belly: F.clone().addScaledVector(toSeal, 5.6).add(new THREE.Vector3(0, 3.2, 0)),
    chest: () => ctx.seal.chest(new THREE.Vector3()),
  };
}

export function addMat(THREE, o = {}) {
  return new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
}
export function spriteMat(THREE, map, o = {}) {
  return new THREE.SpriteMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
}

function cv(n) { const c = document.createElement("canvas"); c.width = c.height = n; return [c, c.getContext("2d")]; }
function tex(THREE, c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// radial glow: I(r) = (1-r)^p, white core to transparent.
export function glowTex(THREE, p = 2.2, col = "255,255,255") {
  const [c, g] = cv(128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, `rgba(${col},${Math.pow(1 - i / 8, p).toFixed(3)})`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(THREE, c);
}

// FTG sealing array (target frame 3): dotted circles, runes between two rings, two triangles; fine blue-white lines.
export function glyphTex(THREE, rng) {
  const N = 512, [c, g] = cv(N); g.translate(N / 2, N / 2);
  g.strokeStyle = "#cfe6f8"; g.fillStyle = "#cfe6f8"; g.shadowColor = "#9fcaf0"; g.shadowBlur = 6; g.lineCap = "round";
  const ring = (r, w, dash) => { g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.stroke(); };
  ring(238, 3); ring(226, 1.5, [2, 7]); ring(160, 2.5); ring(150, 1.2, [1, 5]); ring(74, 2);
  g.setLineDash([]); g.lineWidth = 1.6;
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.2832 + k * Math.PI / 3 + 0.5; g[i ? "lineTo" : "moveTo"](Math.cos(a) * 150, Math.sin(a) * 150); }
    g.closePath(); g.stroke();
  }
  for (let i = 0; i < 36; i++) { // rune cells in the 160..226 band
    g.save(); g.rotate((i / 36) * 6.2832); g.translate(193, 0); g.lineWidth = 2;
    g.beginPath(); const n = 3 + ((rng() * 3) | 0);
    for (let s = 0; s < n; s++) { const x = (rng() - 0.5) * 30, y = (rng() - 0.5) * 44; g[s ? "lineTo" : "moveTo"](x, y); }
    g.stroke(); g.restore();
  }
  for (let i = 0; i < 12; i++) { g.save(); g.rotate((i / 12) * 6.2832); g.translate(112, 0); g.beginPath(); g.moveTo(-14, -10); g.lineTo(10, 0); g.lineTo(-14, 10); g.stroke(); g.restore(); }
  return tex(THREE, c);
}

// Eight Trigrams seal (the seal on Naruto's belly): 8 trigrams on a ring, spiral at the centre.
export function trigramTex(THREE) {
  const N = 512, [c, g] = cv(N); g.translate(N / 2, N / 2);
  g.strokeStyle = "#fdf8e0"; g.shadowColor = "#ffd54a"; g.shadowBlur = 8;
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 236, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, 0, 130, 0, 6.2832); g.stroke();
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * 6.2832); g.translate(184, 0); g.rotate(Math.PI / 2); g.lineWidth = 9;
    for (let l = 0; l < 3; l++) {
      const y = (l - 1) * 20, broken = (i >> l) & 1; g.beginPath();
      if (broken) { g.moveTo(-30, y); g.lineTo(-7, y); g.moveTo(7, y); g.lineTo(30, y); } else { g.moveTo(-30, y); g.lineTo(30, y); }
      g.stroke();
    }
    g.restore();
  }
  g.lineWidth = 3; g.beginPath();
  for (let a = 0; a < 18; a += 0.15) { const r = 6 + a * 6.5; g[a ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
  g.stroke(); return tex(THREE, c);
}

export function disposeTree(o) {
  o.traverse((m) => {
    if (m.geometry) m.geometry.dispose();
    const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    ms.forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); });
  });
}
