// Gilded SFX lettering + the To Be Continued arrow card for p-separatrix. Canvas-painted art on screen-space sprites.
// Lettering recipe (bible "gilded-mesh-lettering"): hand-brush wobble per glyph (jitter in size, rotation, offset), gold
// gradient #fff0a0 -> #f2bd45 -> #b9803a, a 3D bevel (light stroke upper-left + dark stroke lower-right, clipped to the fill
// with source-atop), a 4 px #1a1020 outline and an offset shadow (sinopia #b9573a, or magenta #e82ac0 for DON/MUDA).
// Sprites are placed in SCREEN space (no depth) and pushed off the seal's screen box (owner law: the seal is never covered).
import { GLSL } from "./util.js";

const FONT = '900 {S}px "Noto Sans JP","Yu Gothic","Hiragino Sans","Meiryo",Impact,"Arial Black",sans-serif';
export const CELLS = { gogogo: 0, muda: 1, don: 2, zzzt: 3, shing: 4, tink: 5, ting: 6 };
const S = 512;

function gilded(g, x0, y0, text, o, rnd) {
  const tmp = document.createElement("canvas"); tmp.width = tmp.height = S;
  const c = tmp.getContext("2d");
  const chars = [...text];
  // layout: stack (column) or a single fitted line
  const items = [];
  if (o.stack) {
    chars.forEach((ch, i) => items.push({ ch, x: S / 2 + (rnd() - .5) * 14, y: S * (.2 + .3 * i) + (rnd() - .5) * 10, f: S * (.3 + .035 * i) * (.94 + rnd() * .12), r: (rnd() - .5) * .16 }));
  } else {
    let f = S * .62; c.font = FONT.replace("{S}", f);
    const w = chars.reduce((s, ch) => s + c.measureText(ch).width, 0);
    f = Math.min(f, f * (S * .9) / Math.max(1, w));
    c.font = FONT.replace("{S}", f);
    let x = (S - chars.reduce((s, ch) => s + c.measureText(ch).width, 0)) / 2;
    for (const ch of chars) {
      const cw = c.measureText(ch).width;
      items.push({ ch, x: x + cw / 2 + (rnd() - .5) * 6, y: S / 2 + (rnd() - .5) * 18, f: f * (.9 + rnd() * .2), r: (rnd() - .5) * .14 });
      x += cw;
    }
  }
  const each = (fn) => { for (const it of items) { c.save(); c.translate(it.x, it.y); c.rotate(it.r); c.font = FONT.replace("{S}", it.f); c.textAlign = "center"; c.textBaseline = "middle"; fn(it); c.restore(); } };
  // 1 gold fill, vertical gradient across the whole cell
  const gr = c.createLinearGradient(0, S * .15, 0, S * .85);
  gr.addColorStop(0, "#fff0a0"); gr.addColorStop(.45, "#f2bd45"); gr.addColorStop(1, "#b9803a");
  c.fillStyle = gr; each((it) => c.fillText(it.ch, 0, 0));
  // 2 bevel, kept inside the fill
  c.globalCompositeOperation = "source-atop"; c.lineJoin = "round";
  c.strokeStyle = "rgba(255,250,210,.9)"; c.lineWidth = 6; each((it) => { c.translate(-3, -3); c.strokeText(it.ch, 0, 0); });
  c.strokeStyle = "rgba(106,58,16,.85)"; c.lineWidth = 6; each((it) => { c.translate(3, 3); c.strokeText(it.ch, 0, 0); });
  // 3 outline and offset shadow go BEHIND
  c.globalCompositeOperation = "destination-over"; c.lineJoin = "round";
  c.strokeStyle = "#1a1020"; c.lineWidth = 18; each((it) => c.strokeText(it.ch, 0, 0));
  c.fillStyle = o.shadow || "#b9573a"; c.strokeStyle = o.shadow || "#b9573a"; c.lineWidth = 18;
  each((it) => { c.translate(11, 11); c.fillText(it.ch, 0, 0); c.strokeText(it.ch, 0, 0); });
  g.drawImage(tmp, x0, y0);
}

export function lettersCanvas(rng) {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 1024;
  const g = cv.getContext("2d");
  const rnd = rng("letters");
  const cell = (i, text, o) => gilded(g, (i % 4) * S, Math.floor(i / 4) * S, text, o, rnd);
  cell(0, "ゴゴゴ", { stack: true, shadow: "#b9573a" });
  cell(1, "MUDA", { shadow: "#e82ac0" });
  cell(2, "DON!", { shadow: "#e82ac0" });
  cell(3, "ZZZT", { shadow: "#b9573a" });
  cell(4, "SHING", { shadow: "#b9573a" });
  cell(5, "tink", { shadow: "#b9573a" });
  cell(6, "TING", { shadow: "#b9573a" });
  return cv;
}

// To Be Continued: yellow pointed arrow, 3 px #1a1020 outline (x4 canvas scale = 12), italic ink text, a lighter top band.
export function tbcCanvas() {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 384;
  const g = cv.getContext("2d");
  g.beginPath();
  g.moveTo(24, 100); g.lineTo(690, 100); g.lineTo(690, 24); g.lineTo(1000, 192); g.lineTo(690, 360); g.lineTo(690, 284); g.lineTo(24, 284); g.closePath();
  g.fillStyle = "#f2bd45"; g.fill();
  g.save(); g.clip(); g.fillStyle = "#fff0a0"; g.fillRect(0, 100, 1024, 26); g.fillStyle = "rgba(185,128,58,.55)"; g.fillRect(0, 262, 1024, 22); g.restore();
  g.lineJoin = "miter"; g.lineWidth = 12; g.strokeStyle = "#1a1020"; g.stroke();
  g.fillStyle = "#1a1020"; g.font = 'italic 900 78px "Arial Black",Impact,sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("TO BE CONTINUED", 350, 194);
  return cv;
}

const VERT = /* glsl */ `
uniform vec2 uC; uniform float uH, uAR, uRot, uAsp;
varying vec2 vUv, vN;
void main(){
  vUv=position.xy*.5+.5;
  vec2 q=position.xy*vec2(uAR,1.)*uH; float c=cos(uRot), s=sin(uRot);
  vec2 r=vec2(c*q.x-s*q.y, s*q.x+c*q.y);
  vec2 ndc=uC+vec2(r.x/uAsp,r.y); vN=ndc; gl_Position=vec4(ndc,0.,1.);
}`;
const FRAG = /* glsl */ `
varying vec2 vUv, vN;
uniform sampler2D uMap; uniform vec2 uOff, uScl; uniform float uA, uBoost, uAsp, uMaskS; uniform vec3 uTint; uniform vec4 uSeal;
${GLSL}
void main(){
  vec4 tx=texture2D(uMap,uOff+vUv*uScl);
  vec2 p=vN*vec2(uAsp,1.); float m=sealMask(p,uSeal);
  float a=tx.a*uA*mix(1.,.1+.9*m,uMaskS);
  gl_FragColor=vec4(tx.rgb*uTint*uBoost*a,a);
}`;

// a screen sprite: mesh + setter. Position is NDC, h is the HALF height in height units (frame height = 2).
export function makeSprite(THREE, U, tex, off, scl, ar) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
    uniforms: {
      uMap: { value: tex }, uOff: { value: new THREE.Vector2(...off) }, uScl: { value: new THREE.Vector2(...scl) },
      uC: { value: new THREE.Vector2() }, uH: { value: .2 }, uAR: { value: ar }, uRot: { value: 0 }, uA: { value: 0 }, uBoost: { value: 1.1 },
      uTint: { value: new THREE.Vector3(1, 1, 1) }, uMaskS: { value: 1 }, uAsp: U.uAsp, uSeal: U.uSeal,
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 95;
  return {
    mesh, mat,
    set(x, y, h, rot, a, tint) {
      const u = mat.uniforms; u.uC.value.set(x, y); u.uH.value = h; u.uRot.value = rot; u.uA.value = a;
      if (tint) u.uTint.value.set(tint[0], tint[1], tint[2]);
      mesh.visible = a > .003;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}

// push a half-extent box (p-space) off the seal's ellipse: stay on the side it is on, flip if that leaves the frame
export function placeAway(box, cx, cy, hx, hy, asp) {
  const ox = box.rx + hx * .6 + .04, oy = box.ry + hy * .6 + .04;
  if (Math.abs(cx - box.cx) < ox && Math.abs(cy - box.cy) < oy) {
    let side = cx < box.cx ? -1 : 1;
    let nx = box.cx + side * ox;
    if (Math.abs(nx) > asp - hx * .35) { side = -side; nx = box.cx + side * ox; }
    cx = nx;
  }
  return cx;
}
