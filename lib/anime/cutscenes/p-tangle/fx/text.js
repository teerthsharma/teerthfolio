// SKY LETTERING (bible 3.15, egg 3 and 7): the thin-serif title card "誰そ彼 / kataware-doki" in the sky (shot 8, the credit wide), and the
// faint sound-text "kimi no na wa?" in the glare at 19.4 s. Both are painted in a canvas once (thin lowercase serif, white-cream, soft
// glow, per the poster title lockup), then sampled by a full-frame quad pushed behind the seal, so the seal is never covered.
// The credit sentence itself belongs to the overlay (the pocket); this is the in-sky card only.
//   glow     5 taps: c + (+-1.5, 0)/res.x and (0, +-1.5)/res.y scaled by 2.5 px of 1280; final = .55 c + .1125 sum(taps)
//   title    centred at ndc (0, .42), half size (.9, .28) height units: above the horizon and above the lower-half bubbles
//   kimi     centred on the sun glare (vSun + (0, .1)) when the sun is in frame, else (.42, .22); alpha peak .22
import { billboard, sstep } from "./lib.js";

function paint(w, h, draw) {
  try {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.clearRect(0, 0, w, h); draw(g, w, h); return c;
  } catch { return null; }
}

export default function makeText(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "text";
  const serif = '"Noto Serif JP","Yu Mincho","Hiragino Mincho ProN","Cormorant Garamond","Times New Roman",serif';
  const titleCv = paint(1024, 320, (g, w, h) => {
    g.fillStyle = "#fff6e6"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(255,214,160,.85)"; g.shadowBlur = 18;
    g.font = `300 150px ${serif}`; g.fillText("誰そ彼", w / 2, h * 0.38);   // 誰そ彼 (tasokare)
    g.shadowBlur = 10; g.font = `300 58px ${serif}`; g.fillText("kataware-doki", w / 2, h * 0.82);
  });
  const kimiCv = paint(1024, 128, (g, w, h) => {
    g.fillStyle = "#fff6e6"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(255,230,200,.9)"; g.shadowBlur = 12;
    g.font = `300 64px ${serif}`; g.fillText("kimi no na wa?", w / 2, h / 2);
  });
  const tex = (cv) => {
    const t = new THREE.CanvasTexture(cv ?? paint(2, 2, () => {}));
    t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t;
  };
  const titleTex = tex(titleCv), kimiTex = tex(kimiCv);

  const fs = (centre) => /* glsl */ `
    uniform sampler2D uMap; uniform vec2 uHalf; uniform float uA; uniform vec3 uCol;
    void main() {
      vec2 asp = vec2(vAsp, 1.);
      vec2 p = vUv * asp;
      vec2 c = ${centre};
      vec2 uv = (p - c) / uHalf * .5 + .5;
      if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) discard;
      uv.y = 1. - uv.y;
      vec2 e = vec2(2.5 / 1280., 2.5 / 720.) * 1.5;
      float a = texture2D(uMap, uv).a * .55
              + (texture2D(uMap, uv + vec2(e.x, 0.)).a + texture2D(uMap, uv - vec2(e.x, 0.)).a
               + texture2D(uMap, uv + vec2(0., e.y)).a + texture2D(uMap, uv - vec2(0., e.y)).a) * .1125;
      gl_FragColor = vec4(uCol * 1.15, clamp(a, 0., 1.) * uA);
    }`;
  const title = billboard(THREE, sh, fs("vec2(0., .42)"), { uMap: { value: titleTex }, uHalf: { value: new THREE.Vector2(0.9 * 1.78, 0.28 * 1.78) }, uA: { value: 0 }, uCol: { value: new THREE.Color("#fff6e6") } }, { full: true, push: 0.7, order: 8, add: false });
  const kimi = billboard(THREE, sh, fs("(vSunOk > .5 ? clamp(vec2(vSun.x * vAsp + .05, vSun.y + .1), vec2(-.8, -.1), vec2(.8, .6)) : vec2(.42, .22))"),
    { uMap: { value: kimiTex }, uHalf: { value: new THREE.Vector2(0.55, 0.07) }, uA: { value: 0 }, uCol: { value: new THREE.Color("#fff6e6") } }, { full: true, push: 0.75, order: 8 });
  group.add(title, kimi);

  return {
    group,
    update(t) {
      const tk = T.env(t, "titleCard", 0.9, 0.9);
      title.userData.u.uA.value = tk * 0.95; title.visible = tk > 0.005;
      // egg 3: the sound-text breathes in the glare, peak .22
      const kk = T.env(t, "kimi", 0.6, 0.9) * (0.8 + 0.2 * Math.sin(t * 3.1));
      kimi.userData.u.uA.value = kk * 0.22; kimi.visible = kk > 0.005;
    },
    dispose() { titleTex.dispose(); kimiTex.dispose(); group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
