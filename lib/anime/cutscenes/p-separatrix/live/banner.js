
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace } from "three";

const BAR = 0.09;
export const BANNER = { unfurl: 0.35, hold: 1e9 };

export function bannerRect(W) {
  const phone = W <= 600;
  const w = phone ? (W - 32) / W : 0.8;
  const hFrac = Math.min(0.3, Math.max(0.135, phone ? 0.135 : 0.14));
  return { w, h: hFrac, top: BAR + 0.004 };
}

function draw(c, tex, aspect) {
  const g = c.getContext("2d");
  const W = c.width;
  const H = c.height;
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fbf6e8");
  bg.addColorStop(1, "#f3e8cd");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.06;
  g.fillStyle = "#6b4a2b";
  for (let i = 0; i < 9; i++) g.fillRect(((i + 0.5) / 9) * W - 3, 0, 6, H);
  g.globalAlpha = 1;
  const sh = H * 0.15;
  const gold = g.createLinearGradient(0, H - sh, 0, H);
  gold.addColorStop(0, "#fff0a8");
  gold.addColorStop(0.35, "#f2bd45");
  gold.addColorStop(0.75, "#c88a1c");
  gold.addColorStop(1, "#8a5a12");
  g.fillStyle = gold;
  g.fillRect(0, H - sh, W, sh);
  g.fillStyle = "#5e3a0a";
  const step = sh * 0.62;
  for (let x = step / 2; x < W; x += step) {
    g.beginPath();
    g.arc(x, H - sh * 0.5, sh * 0.13, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#3a2430";
  g.fillRect(0, H - sh - 3, W, 3);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const area = H - sh;
  const fit = (text, wt, px, maxW) => {
    let s = px;
    g.font = `${wt} ${s}px ${fam}`;
    while (g.measureText(text).width > maxW && s > 20) g.font = `${wt} ${(s -= 4)}px ${fam}`;
    return s;
  };
  const line = (text, y, px, wt, fill, maxW) => {
    const s = fit(text, wt, px, maxW);
    g.lineWidth = s * 0.07;
    g.strokeStyle = "#fffaf0";
    g.strokeText(text, W / 2, y);
    g.fillStyle = fill;
    g.fillText(text, W / 2, y);
    return s;
  };
  if (aspect > 6) {
    line("JoJo: Gold Experience Requiem", area * 0.45, area * 0.62, "800", "#3a2430", W * 0.93);
    g.letterSpacing = `${area * 0.05}px`;
    line("separatrix", area * 0.84, area * 0.24, "600", "#a8602a", W * 0.5);
  } else {
    line("JoJo:", area * 0.2, area * 0.34, "800", "#a8602a", W * 0.5);
    line("Gold Experience Requiem", area * 0.52, area * 0.4, "800", "#3a2430", W * 0.93);
    g.letterSpacing = `${area * 0.04}px`;
    line("separatrix", area * 0.86, area * 0.17, "600", "#a8602a", W * 0.5);
  }
  g.letterSpacing = "0px";
  tex.needsUpdate = true;
}

export function makeBanner(W, H) {
  const r = bannerRect(W);
  const aspect = (r.w * W) / (r.h * H);
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = Math.max(160, Math.round(1800 / aspect));
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  draw(c, tex, aspect);
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(() => draw(c, tex, aspect), () => {});
  const geo = new PlaneGeometry(1, 1.2);
  const mat = new ShaderMaterial({
    uniforms: { uMap: { value: tex }, uRect: { value: [0.1, 0.8, 1.6, 0.28] }, uU: { value: 0 }, uT: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform vec4 uRect;
      uniform float uT, uU;
      varying vec2 vF;
      void main() {
        vec2 f = vec2(position.x + 0.5, 0.6 - position.y);
        vF = f;
        float sway = sin(f.x * 9.0 + uT * 6.0) * 0.012 * (1.0 - clamp(uU, 0.0, 1.0)) * f.y;
        gl_Position = vec4(uRect.x + (f.x - 0.5) * uRect.z, uRect.y - f.y * uRect.w + sway, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uU, uT;
      varying vec2 vF;
      void main() {
        float edge = uU + 0.012 * sin(vF.x * 9.0 + uT * 6.0) * (1.0 - clamp(uU, 0.0, 1.0));
        if (vF.y > edge || uU <= 0.001) discard;
        vec4 c = texture2D(uMap, vec2(vF.x, 1.0 - min(vF.y, 1.0)));
        c.rgb *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.1, edge - vF.y)) * step(uU, 0.995);
        gl_FragColor = vec4(c.rgb, 0.99);
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 60;
  mesh.frustumCulled = false;
  mesh.visible = false;
  const setRect = () => {
    const rr = bannerRect(innerWidth);
    mat.uniforms.uRect.value = [0, 1 - 2 * rr.top, 2 * rr.w, 2 * rr.h];
  };
  setRect();
  return { mesh, mat, geo, tex, setRect, dispose: () => (geo.dispose(), mat.dispose(), tex.dispose()) };
}

export function unfurlAt(t) {
  const { unfurl, hold } = BANNER;
  if (t < 0) return 0;
  if (t < unfurl) {
    const p = t / unfurl;
    return 1 - (1 - p) ** 3 + 0.12 * Math.sin(Math.PI * p) ** 2;
  }
  if (t < unfurl + hold) return 1;
  const q = (t - unfurl - hold) / 0.4;
  return q >= 1 ? 0 : 1 - q * q * (3 - 2 * q);
}
