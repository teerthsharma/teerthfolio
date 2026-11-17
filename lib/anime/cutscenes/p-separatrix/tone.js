// The site's last stage (components/world/Look.jsx neutral tone map). The live fresco writes hex/255 as is, so toned() reads raw hex, not a linearised three Color.
export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c *= 1.055;
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : 0.04;
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;

const rawRGB = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};

export function toned(hex) {
  let c = rawRGB(hex).map((v) => v * 1.055);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : 0.04));
  const peak = Math.max(...c);
  if (peak > 0.76) {
    const np = 1 - 0.0576 / (peak - 0.52);
    const g = 1 - 1 / (0.15 * (peak - np) + 1);
    c = c.map((v) => (v * np) / peak).map((v) => v + (np - v) * g);
  }
  return c;
}

const MAIN = /void\s+main\s*\(\s*\)/;
export function tone(material) {
  const f = material.fragmentShader;
  if (f.split(MAIN).length === 2) {
    material.fragmentShader = f.replace(MAIN, "void pageMain()") + TONE + "\n  void main() { pageMain(); gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }\n";
    material.needsUpdate = true;
  }
  return material;
}

export const PLASTER = "#EDC2AD";
export const OCHRE = "#99361F";
export const GOLD = "#FDCC57";
export const UMBER = "#3D2429";
export const VIOLET = "#6B4F99";
export const SKY = { low: "#FAB854", mid: "#DB768C", high: "#4D3085" };
export const CORAL = "#FF6654";
export const BAND = "#FFB89E";
export const TRAV = ["#d8bb82", "#cba873"];
export const GILT = "#ffcc33";
export const ARCH = { bay: "#d6247a", pier: "#a02a9a", lintel: ["#7a2290", "#5a1a8c"] };
export const BANNER = { cream: ["#fbf6e8", "#f3e8cd"], frame: "#6b4a2b", title: "#3a2430", sub: "#a8602a" };
export const INK = "#1c1b19";
export const CREAM = "#fbfaf7";
