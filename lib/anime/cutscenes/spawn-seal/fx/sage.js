// THE GREAT SAGE panel: the live sagePanel's own canvas (1100 x 280, the same drawing), as a flat screen-space quad in NDC, never a camera plane.
import { CanvasTexture, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector2 } from "three";
import { TONE } from "../tone.js";

const FONT = "'Segoe UI','Yu Gothic UI',Meiryo,sans-serif";
const VS = /* glsl */ `
  uniform vec2 uRes; varying vec2 vUv;
  void main() {
    vUv = uv;
    float A = uRes.x / uRes.y;
    vec2 hwh = vec2(0.55 * min(1.0, 1.78 / A), 0.14 * (16.0 / 9.0) / A);
    gl_Position = vec4(vec2(-0.39, 0.58) + position.xy * hwh, 0.0, 1.0);
  }`;
const FS = TONE + `
  uniform sampler2D tMap; uniform float uA; varying vec2 vUv;
  void main() {
    vec4 c = texture2D(tMap, vUv);
    float a = c.a * uA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(siteTone(c.rgb) * a, a);
  }`;

export function makeSage(text, res = { value: new Vector2(1280, 720) }) {
  const c = document.createElement("canvas");
  c.width = 1100; c.height = 280;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(6,24,70,0.82)";
    g.fillRect(8, 8, c.width - 16, c.height - 16);
    for (let y = 12; y < c.height - 12; y += 6) { g.fillStyle = "rgba(90,220,255,0.07)"; g.fillRect(8, y, c.width - 16, 2); }
    g.strokeStyle = "#5ff0ff"; g.lineWidth = 6; g.shadowColor = "#37d4ff"; g.shadowBlur = 22;
    g.strokeRect(8, 8, c.width - 16, c.height - 16);
    g.shadowBlur = 0;
    g.fillStyle = "#7fe8ff"; g.font = `700 34px ${FONT}`;
    g.fillText("GREAT SAGE", 44, 62); g.fillRect(44, 76, 230, 3);
    g.fillStyle = "#e9fdff"; g.shadowColor = "#37d4ff"; g.shadowBlur = 16;
    let px = 56;
    while (px > 40) { g.font = `700 ${px}px ${FONT}`; if (g.measureText(text).width < c.width - 88) break; px -= 2; }
    g.fillText(text, 44, 190);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready?.then(draw);
  const uA = { value: 0 };
  const mat = new ShaderMaterial({ uniforms: { tMap: { value: tex }, uRes: res, uA }, vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1300; mesh.visible = false;
  return {
    mesh,
    // k: the envelope (env.sage1 or env.sage2); the flicker and the fade step at 12 fps, as on twos
    set(k, t) {
      const q = Math.floor(t * 12 + 1e-6) / 12;
      uA.value = k * (0.9 + 0.1 * Math.sin(40 * q));
      mesh.visible = k > 0.002;
    },
    dispose() { tex.dispose(); mat.dispose(); mesh.geometry.dispose(); },
  };
}
