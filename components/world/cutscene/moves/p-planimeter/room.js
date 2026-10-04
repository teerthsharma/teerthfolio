// CLASS 1-D, Advanced Nurturing High School, at sunset: the room the planimeter scene plays in. One cel-shaded material
// paints every solid (vertex colour + a pattern kind: wood planks, wallpaper, chalkboard green, curtain folds, the glass,
// desk grain), three tones of light (warm gold lit, mid, cool violet shade) and a gold rim; the glass is the sunset itself.
// God-rays and the floor's window patches are additive sheets; cherry petals drift through on the wind. Rig frame
// (layout.js): the pup on its chair at the origin, the board on the north wall, the windows on the west wall.

import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FLOOR } from "./layout.js";

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const fam = () => (typeof document === "undefined" ? "sans-serif" : getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif");

// pattern kinds
export const K = { PLAIN: 0, FLOOR: 1, WALL: 2, BOARD: 3, CURTAIN: 4, GLASS: 5, WOOD: 6, GLOW: 7, SPINE: 8, SIL: 9 };

const T4 = new Matrix4();
const Q = new Quaternion();
const UP = new Vector3(0, 1, 0);
export class Mesher {
  constructor() {
    this.list = [];
  }
  add(geo, hex, k = 0, m) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute("uv");
    if (m) g.applyMatrix4(m);
    const n = g.attributes.position.count;
    const c = hx(hex);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set(c, i * 3);
    g.setAttribute("aCol", new BufferAttribute(col, 3));
    g.setAttribute("aK", new BufferAttribute(new Float32Array(n).fill(k), 1));
    this.list.push(g);
    return this;
  }
  box(x, y, z, w, h, d, hex, k = 0, ry = 0, rz = 0) {
    return this.add(new BoxGeometry(w, h, d), hex, k, T4.makeRotationFromQuaternion(Q.setFromAxisAngle(UP, ry)).multiply(new Matrix4().makeRotationZ(rz)).setPosition(x, y, z));
  }
  slab(x0, y0, z0, x1, y1, z1, hex, k = 0) {
    return this.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, hex, k);
  }
  cyl(x, y0, z, rt, rb, h, hex, k = 0, seg = 8) {
    return this.add(new CylinderGeometry(rt, rb, h, seg), hex, k, T4.makeTranslation(x, y0 + h / 2, z));
  }
  sph(x, y, z, rx, ry, rz, hex, k = 0) {
    return this.add(new SphereGeometry(1, 14, 10), hex, k, T4.makeScale(rx, ry, rz).setPosition(x, y, z));
  }
  // a limb from a to b
  limb(a, b, r, hex, k = 0) {
    const v = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = v.length();
    Q.setFromUnitVectors(UP, v.normalize());
    return this.add(new CylinderGeometry(r, r * 0.88, len, 7), hex, k, new Matrix4().makeRotationFromQuaternion(Q).setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
  }
  build() {
    const g = mergeGeometries(this.list);
    for (const p of this.list) p.dispose();
    this.list = [];
    return g;
  }
}

// the shared uniforms: the sun (toward it, rig frame), the lens in the rig frame, the clock
export function makeShared() {
  return { uSun: { value: new Vector3(-0.8, 0.32, 0.22).normalize() }, uCam: { value: new Vector3(0, 1, 8) }, uTime: { value: 0 } };
}

export function classMaterial(shared) {
  return new ShaderMaterial({
    uniforms: shared,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aCol; attribute float aK;
      varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vK;
      void main() { vP = position; vN = normal; vC = aCol; vK = aK; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uCam; uniform float uTime;
      varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vK;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        int k = int(vK + 0.5);
        vec3 col = vC;
        vec3 an = abs(n);
        float s = an.x > an.z ? vP.z : vP.x;
        if (k == 5) { // the sunset in the glass
          float h = clamp((vP.y - 0.4) / 4.2, 0.0, 1.0);
          vec3 sky = mix(vec3(1.0, 0.72, 0.34), vec3(0.50, 0.58, 0.93), smoothstep(0.05, 0.95, h));
          sky = mix(sky, vec3(1.0, 0.94, 0.7), exp(-length(vec2((vP.z - 2.4) * 0.35, (vP.y - 1.3) * 0.9)) * 1.0));
          float bl = vn(vP.zy * vec2(1.2, 1.4) + 3.0);
          float pb = smoothstep(0.5, 0.66, bl) * smoothstep(1.6, 3.2, vP.y);
          sky = mix(sky, mix(vec3(1.0, 0.62, 0.76), vec3(1.0, 0.88, 0.92), vn(vP.zy * 8.0)), pb);
          float br = smoothstep(0.03, 0.0, abs(vP.y - (3.1 + 0.5 * sin(vP.z * 1.1)))) * smoothstep(0.4, 0.0, h - 0.7); // a bough
          sky = mix(sky, vec3(0.34, 0.2, 0.18), br * 0.8);
          gl_FragColor = vec4(pow(sky, vec3(2.2)), 1.0);
          return;
        }
        if (k == 7) { gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0); return; }
        if (k == 1) { // polished plank floor, planks along z, staggered joints
          float pw = 0.55;
          float pid = floor(vP.x / pw);
          float zz = vP.z + h21(vec2(pid, 1.0)) * 3.0;
          float jid = floor(zz / 3.3);
          vec2 f = vec2(fract(vP.x / pw), fract(zz / 3.3));
          float tone = h21(vec2(pid, jid));
          col *= 0.84 + 0.3 * tone;
          col *= 1.0 + 0.05 * sin(vP.x * 70.0 + tone * 40.0 + sin(vP.z * 1.7) * 3.0);
          col *= mix(0.5, 1.0, smoothstep(0.0, 0.05, f.x) * smoothstep(1.0, 0.95, f.x) * smoothstep(0.0, 0.012, f.y));
        } else if (k == 2) {
          col *= 1.0 - 0.045 * step(0.5, fract(s * 1.1)) + 0.02 * vn(vP.xy * 6.0 + vP.zz);
        } else if (k == 3) {
          col *= 0.85 + 0.35 * vn(vP.xy * 3.0) * vn(vP.zy * 3.0 + 4.0);
        } else if (k == 4) {
          float f = sin(s * 17.0 + sin(vP.y * 1.3) * 0.6) * 0.5 + 0.5;
          col *= 0.74 + 0.32 * f;
        } else if (k == 6) {
          col *= 0.9 + 0.2 * (sin(s * 46.0 + sin(vP.z * 4.0 + vP.y * 3.0) * 2.0) * 0.5 + 0.5) * (an.y > 0.5 ? 1.0 : 0.5);
        } else if (k == 8) {
          col *= 0.78 + 0.34 * step(0.5, fract(s * 7.0 + vP.y * 0.0));
        }
        float ndl = dot(n, uSun);
        float lit = smoothstep(0.0, 0.05, ndl);
        float mid = smoothstep(-0.5, -0.44, ndl);
        float light = 0.6 + 0.18 * mid + 0.22 * lit;
        vec3 tint = mix(vec3(0.7, 0.66, 0.94), vec3(1.1, 0.99, 0.84), clamp(lit * 0.85 + mid * 0.15, 0.0, 1.0));
        col *= light * tint;
        vec3 v = normalize(uCam - vP);
        float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
        if (k == 9) {
          col = vec3(0.07, 0.05, 0.12);
          col += vec3(0.62, 0.42, 0.95) * fr * (0.55 + 0.9 * lit);
        } else col += vec3(1.0, 0.78, 0.42) * fr * 0.34 * (0.35 + 0.65 * smoothstep(-0.4, 0.2, ndl));
        gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(2.2)), 1.0);
      }`,
  });
}

// ---------------------------------------------------------------- canvases
const plane = (w, h, c, extra = {}) => {
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ map: tex, toneMapped: false, fog: false, ...extra }));
  m.frustumCulled = false;
  return m;
};
// screen-held planes: `userData.hold` (poster.js holdOnScreen) or `userData.fill` (the whole screen) is applied with the camera that draws it
const held = (m) => {
  m.onBeforeRender = (r, sc, cam) => {
    if (!m.visible) return;
    if (m.userData.fill) {
      const hh = 2 * 3 * Math.tan((cam.fov * Math.PI) / 360);
      m.position.set(0, 0, -3).applyQuaternion(cam.quaternion).add(cam.position);
      m.quaternion.copy(cam.quaternion);
      m.scale.set(hh * cam.aspect * 1.02, hh * 1.02, 1);
      m.updateMatrixWorld(true);
    } else if (m.userData.hold) {
      m.userData.hold.apply(cam);
      m.updateMatrixWorld(true);
    }
  };
  m.visible = false;
  return m;
};
const redraw = (draw) => {
  draw();
  document.fonts?.load?.(`800 100px ${fam()}`).then(draw, () => {});
};
const chalk = (g, w, h, n = 1400) => {
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.4})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  g.globalCompositeOperation = "source-over";
};
function ring(g, cx, cy, rx, ry, col, lw) {
  g.strokeStyle = col;
  g.lineCap = "round";
  for (let p = 0; p < 3; p++) {
    g.lineWidth = lw * (1 - p * 0.22);
    g.beginPath();
    for (let a = 0; a <= 6.9; a += 0.1) {
      const j = 1 + 0.02 * Math.sin(a * 5 + p) + p * 0.012;
      const x = cx + Math.cos(a - 0.4 + p * 0.1) * rx * j;
      const y = cy + Math.sin(a - 0.4 + p * 0.1) * ry * j;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

// THE CHALKBOARD: the school banner above, the formulas down the left, the score "50" circled in red chalk
export function boardPlane() {
  const W = 1800;
  const H = 760;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const m = plane(7.2, 3.04, c);
  redraw(() => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#6b3f22"; // the wooden frame
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#c9a066";
    g.fillRect(8, 8, W - 16, H - 16);
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, "#2f6f55");
    gr.addColorStop(0.55, "#255e48");
    gr.addColorStop(1, "#1e4f3d");
    g.fillStyle = gr;
    g.fillRect(26, 26, W - 52, H - 52);
    g.fillStyle = "rgba(255,255,255,0.07)"; // old chalk dust
    for (let i = 0; i < 40; i++) g.fillRect(40 + Math.random() * (W - 400), 40 + Math.random() * (H - 140), 160 + Math.random() * 380, 22 + Math.random() * 40);
    g.fillStyle = "#b8232f"; // the school banner
    g.fillRect(26, 26, W - 52, 118);
    g.fillStyle = "#f6f1e3";
    g.fillRect(26, 138, W - 52, 8);
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillStyle = "#fbf6e8";
    g.font = `800 66px ${fam()}`;
    g.fillText("ADVANCED NURTURING HIGH SCHOOL", W / 2, 86);
    g.textAlign = "left";
    g.fillStyle = "#f4f0e0";
    g.font = `700 70px ${fam()}`;
    g.fillText("Class 1-D  /  Mathematics", 80, 222);
    g.font = `600 74px ${fam()}`;
    ["y = 2x + 6", "f(x) = x² - 4x", "Σ k = n(n + 1) / 2", "3 × 17 = 51 ?"].forEach((t, i) => g.fillText(t, 90, 330 + i * 98));
    g.textAlign = "center";
    g.fillStyle = "#fffdf0";
    g.font = `800 360px ${fam()}`;
    g.fillText("50", 1330, 450);
    ring(g, 1330, 440, 330, 250, "#ff7b7b", 15);
    g.strokeStyle = "#ff9d9d";
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(1050, 660);
    g.quadraticCurveTo(1330, 690, 1610, 650);
    g.stroke();
    chalk(g, W, H);
    m.material.map.needsUpdate = true;
  });
  return m;
}

// THE TEST PAPER on the desk: ruled, a name line, scribbled working, and the red "50"
export function paperPlane() {
  const W = 600;
  const H = 780;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const m = plane(0.9, 1.17, c, { side: DoubleSide });
  redraw(() => {
    const g = c.getContext("2d");
    g.fillStyle = "#fbf8ee";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#b8232f";
    g.fillRect(0, 0, W, 14);
    g.strokeStyle = "#cfd9e8";
    g.lineWidth = 2;
    for (let y = 250; y < H - 30; y += 44) {
      g.beginPath();
      g.moveTo(30, y);
      g.lineTo(W - 30, y);
      g.stroke();
    }
    g.fillStyle = "#33415c";
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.font = `800 40px ${fam()}`;
    g.fillText("MIDTERM  Mathematics", 34, 60);
    g.font = `600 30px ${fam()}`;
    g.fillText("Class 1-D   Ayanokoji K.", 34, 118);
    g.strokeStyle = "#445a87";
    g.lineWidth = 3;
    for (let r = 0; r < 8; r++) {
      g.beginPath();
      g.moveTo(40, 272 + r * 44);
      for (let x = 60; x < 150 + ((r * 53) % 330); x += 16) g.lineTo(x, 272 + r * 44 + ((x * 7 + r) % 9) - 4);
      g.stroke();
      g.strokeStyle = "#c62f3a";
      g.beginPath();
      g.moveTo(W - 86, 270 + r * 44);
      g.lineTo(W - 74, 284 + r * 44);
      g.lineTo(W - 46, 252 + r * 44);
      g.stroke();
      g.strokeStyle = "#445a87";
    }
    g.fillStyle = "#d3202f";
    g.textAlign = "center";
    g.font = `800 230px ${fam()}`;
    g.save();
    g.translate(W * 0.5, 190);
    g.rotate(-0.1);
    g.fillText("50", 0, 0);
    g.strokeStyle = "#d3202f";
    g.lineWidth = 11;
    g.beginPath();
    g.ellipse(0, -6, 175, 118, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    m.material.map.needsUpdate = true;
  });
  return m;
}

// THE CHESSBOARD OVER THE SHOT (screen-held: the move sets its pop): a dark veil, a board in perspective across the lower
// two thirds, and the king and a pawn standing on it in silhouette
export function chessOverlay() {
  const W = 1600;
  const H = 900;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const m = plane(1, 1, c, { transparent: true, depthTest: false, depthWrite: false });
  m.renderOrder = 48;
  m.userData.fill = true;
  held(m);
  redraw(() => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, W, H);
    const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.85);
    v.addColorStop(0, "rgba(20,16,40,0.05)");
    v.addColorStop(1, "rgba(20,16,40,0.7)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    const y0 = H * 0.42;
    const rows = 8;
    const yAt = (r) => y0 + (H - y0) * (1 - (1 - r / rows) ** 1.7);
    const wAt = (y) => W * (0.36 + 0.9 * ((y - y0) / (H - y0)));
    for (let r = 0; r < rows; r++) {
      const ya = yAt(r);
      const yb = yAt(r + 1);
      const wa = wAt(ya);
      const wb = wAt(yb);
      for (let i = 0; i < 8; i++) {
        const x = (side, y, w) => W / 2 - w / 2 + (w * side) / 8;
        g.fillStyle = (i + r) % 2 ? "rgba(246,240,224,0.5)" : "rgba(28,24,56,0.58)";
        g.beginPath();
        g.moveTo(x(i, ya, wa), ya);
        g.lineTo(x(i + 1, ya, wa), ya);
        g.lineTo(x(i + 1, yb, wb), yb);
        g.lineTo(x(i, yb, wb), yb);
        g.closePath();
        g.fill();
      }
    }
    // the king and a pawn, dark with a pale edge
    const piece = (cx, base, s, king) => {
      g.save();
      g.translate(cx, base);
      g.fillStyle = "rgba(22,18,44,0.92)";
      g.strokeStyle = "rgba(255,238,200,0.85)";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(-0.34 * s, 0);
      g.quadraticCurveTo(-0.3 * s, -0.22 * s, -0.12 * s, -0.5 * s);
      g.lineTo(-0.2 * s, -0.56 * s);
      g.lineTo(0.2 * s, -0.56 * s);
      g.lineTo(0.12 * s, -0.5 * s);
      g.quadraticCurveTo(0.3 * s, -0.22 * s, 0.34 * s, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(0, -0.74 * s, 0.17 * s, 0, 7);
      g.fill();
      g.stroke();
      if (king) {
        g.fillRect(-0.035 * s, -1.2 * s, 0.07 * s, 0.26 * s);
        g.fillRect(-0.12 * s, -1.12 * s, 0.24 * s, 0.07 * s);
      }
      g.restore();
    };
    piece(W * 0.2, H * 0.97, 360, true);
    piece(W * 0.82, H * 0.86, 210, false);
    m.material.map.needsUpdate = true;
  });
  m.userData.aspect = W / H;
  return m;
}

// THE EYE'S GLINT: a four-point star over a soft white core, screen-held at the pup's eye
export function glintPlane() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.1, "rgba(255,250,230,0.95)");
  r.addColorStop(0.3, "rgba(255,226,160,0.28)");
  r.addColorStop(1, "rgba(255,226,160,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, S, S);
  g.fillStyle = "#fffdf2";
  for (const [a, len, wd] of [[0, 1, 0.045], [Math.PI / 2, 0.8, 0.04], [Math.PI / 4, 0.4, 0.02], [-Math.PI / 4, 0.4, 0.02]]) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(a);
    g.beginPath();
    g.moveTo(-S * 0.5 * len, 0);
    g.quadraticCurveTo(0, -S * wd, S * 0.5 * len, 0);
    g.quadraticCurveTo(0, S * wd, -S * 0.5 * len, 0);
    g.fill();
    g.restore();
  }
  const m = plane(1, 1, c, { transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending });
  m.renderOrder = 52;
  m.userData.aspect = 1;
  held(m);
  return m;
}

// ---------------------------------------------------------------- the room
const WOOD = "#b9783f";
const WOOD_D = "#8a5430";
const RED = "#b8232f";
const CREAM = "#f6e7cf";
const WALL_X = [-6.2, 6.2];
const BACK_Z = -5.1;
const FRONT_Z = 11.5;
const CEIL = 5.4;
const WIN_Z = [-3.2, 0.6, 4.4, 8.2];
const BOOKS = ["#c62f3a", "#2f5fa8", "#f2e6c4", "#2f8f6a", "#e9a62c"];

function desk(m, x, z, ry = 0, pupDesk = false) {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const P = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  // top, front lip, legs, the shelf under
  const w = pupDesk ? 2.5 : 1.7;
  const d = pupDesk ? 1.5 : 1.1;
  const top = pupDesk ? 0.14 : 0.1;
  const put = (dx, y, dz, ww, h, dd, hex, k) => {
    const [px, pz] = P(dx, dz);
    m.box(px, y, pz, ww, h, dd, hex, k, ry);
  };
  put(0, top - 0.05, 0, w, 0.1, d, "#d9a05e", K.WOOD);
  put(0, top - 0.05, d / 2 - 0.02, w + 0.02, 0.1, 0.05, RED, K.PLAIN);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(sx * (w / 2 - 0.1), (top + FLOOR) / 2 - 0.05, sz * (d / 2 - 0.1), 0.08, top - FLOOR - 0.1, 0.08, "#7d8896", K.PLAIN);
  put(0, top - 0.5, -d / 2 + 0.12, w - 0.2, 0.55, 0.05, "#7d8896", K.PLAIN);
  put(0, top - 0.52, -0.05, w - 0.3, 0.05, d - 0.3, "#cf9a62", K.WOOD);
  // textbooks and a pencil case
  const bx = -w / 2 + 0.42;
  [[0, 0.34, 0.0], [0.03, 0.3, 0.14], [-0.02, 0.28, 0.26]].forEach(([dx, bw, dz], i) => {
    const [px, pz] = P(bx + dx, -0.2 + dz);
    m.box(px, top + 0.04 + i * 0.075, pz, bw + 0.28, 0.07, 0.4, BOOKS[(i + Math.round(x)) & 3 ? i : 4], K.PLAIN, ry + 0.06 * (i - 1));
    m.box(px - 0.0, top + 0.04 + i * 0.075, pz + 0.2, bw + 0.26, 0.055, 0.02, "#fbf3dc", K.PLAIN, ry);
  });
  const [qx, qz] = P(w / 2 - 0.38, -0.1);
  m.box(qx, top + 0.045, qz, 0.5, 0.09, 0.18, "#2f5fa8", K.PLAIN, ry);
}
function chair(m, x, z, ry = 0, s = 1) {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  const P = (dx, dz) => [x + dx * c * s + dz * sn * s, z - dx * sn * s + dz * c * s];
  const put = (dx, y, dz, w, h, d, hex, k = 0) => {
    const [px, pz] = P(dx, dz);
    m.box(px, y, pz, w * s, h * s, d * s, hex, k, ry);
  };
  put(0, -0.075, -0.2, 1.5, 0.1, 1.5, WOOD, K.WOOD);
  put(0, -0.02, -0.2, 1.4, 0.06, 1.4, RED);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(sx * 0.65, (FLOOR - 0.12) / 2, -0.2 + sz * 0.6, 0.07, -FLOOR - 0.12 + 0.0, 0.07, "#7d8896");
  put(0, 0.55, -0.92, 1.4, 1.0, 0.07, WOOD, K.WOOD);
  for (const sx of [-1, 1]) put(sx * 0.62, 0.0, -0.92, 0.08, 1.1, 0.1, "#7d8896");
}
function student(m, x, z, hair, ry = 0) {
  // seated, facing +z: a blazer, a white collar, dark trousers; the head turned toward the board
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const P = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  const sph = (dx, y, dz, a, b, d, hex) => {
    const [px, pz] = P(dx, dz);
    m.sph(px, y, pz, a, b, d, hex);
  };
  sph(0, 0.55, -0.4, 0.42, 0.62, 0.3, RED);
  sph(0, 0.88, -0.28, 0.2, 0.08, 0.14, "#f6f1e3");
  sph(0, 1.2, -0.2, 0.26, 0.28, 0.25, "#f1c8a8");
  sph(0, 1.28, -0.24, 0.28, 0.27, 0.27, hair);
  sph(0, 0.04, 0.3, 0.3, 0.14, 0.7, "#2c3347");
}

export function* buildRoom(shared) {
  const cm = classMaterial(shared);
  const mesh = (g) => {
    const o = new Mesh(g, cm);
    o.frustumCulled = false;
    return o;
  };
  const m = new Mesher();
  // shell: floor, ceiling, walls with a wainscot and the red-and-white band
  m.slab(WALL_X[0], FLOOR - 0.3, BACK_Z - 0.3, WALL_X[1], FLOOR, FRONT_Z, "#c98a52", K.FLOOR);
  m.slab(WALL_X[0], CEIL, BACK_Z, WALL_X[1], CEIL + 0.2, FRONT_Z, "#efe3cc", K.PLAIN);
  for (const z of [-3.5, 0.5, 4.5, 8.5]) m.slab(-4.2, CEIL - 0.04, z - 0.18, 4.2, CEIL, z + 0.18, "#fff6d6", K.GLOW);
  m.slab(WALL_X[0], FLOOR, BACK_Z - 0.2, WALL_X[1], CEIL, BACK_Z, CREAM, K.WALL);
  m.slab(WALL_X[0] - 0.2, FLOOR, BACK_Z, WALL_X[0], CEIL, FRONT_Z, CREAM, K.WALL);
  m.slab(WALL_X[1], FLOOR, BACK_Z, WALL_X[1] + 0.2, CEIL, FRONT_Z, CREAM, K.WALL);
  m.slab(WALL_X[0], FLOOR, FRONT_Z, WALL_X[1], CEIL, FRONT_Z + 0.2, CREAM, K.WALL);
  for (const [x0, x1, z0, z1] of [[-6.2, -6.12, BACK_Z, FRONT_Z], [6.12, 6.2, BACK_Z, FRONT_Z]]) {
    m.slab(x0, FLOOR, z0, x1, 0.5, z1, WOOD_D, K.WOOD);
    m.slab(x0 - 0.01, 0.5, z0, x1 + 0.01, 0.66, z1, RED);
    m.slab(x0 - 0.01, 0.66, z0, x1 + 0.01, 0.74, z1, "#fbf6ea");
  }
  m.slab(WALL_X[0], FLOOR, BACK_Z, WALL_X[1], 0.5, BACK_Z + 0.07, WOOD_D, K.WOOD);
  m.slab(WALL_X[0], 0.5, BACK_Z, WALL_X[1], 0.66, BACK_Z + 0.08, RED);
  m.slab(WALL_X[0], 0.66, BACK_Z, WALL_X[1], 0.74, BACK_Z + 0.08, "#fbf6ea");
  yield;
  // the west windows: sunset glass, white frames and mullions, sills, curtains tied back
  for (const z of WIN_Z) {
    const x = -6.12;
    m.slab(x - 0.02, 0.8, z - 1.4, x + 0.0, 4.5, z + 1.4, "#fff", K.GLASS);
    for (const zz of [z - 1.4, z, z + 1.4]) m.slab(x, 0.74, zz - 0.06, x + 0.12, 4.6, zz + 0.06, "#fbf6ea");
    for (const y of [0.8, 2.6, 4.55]) m.slab(x, y - 0.05, z - 1.45, x + 0.12, y + 0.06, z + 1.45, "#fbf6ea");
    m.slab(x, 0.3, z - 1.6, x + 0.42, 0.42, z + 1.6, "#e9dcc2");
    for (const sd of [-1, 1]) {
      m.slab(x + 0.1, 0.7, z + sd * 1.45 - 0.35, x + 0.46, 4.9, z + sd * 1.45 + 0.35, "#f1a9b9", K.CURTAIN);
      m.slab(x + 0.1, 0.7, z + sd * 1.45 - 0.2, x + 0.5, 1.7, z + sd * 1.45 + 0.2, "#e98ea4", K.CURTAIN);
      m.box(x + 0.34, 1.9, z + sd * 1.0, 0.1, 0.12, 0.9, "#fff1c8");
    }
    m.slab(x, 4.82, z - 1.7, x + 0.62, 4.98, z + 1.7, "#8a5430", K.WOOD);
  }
  // the east wall: lockers, a door, a bulletin board with pinned notices
  m.slab(6.2 - 0.6, FLOOR, -4.9, 6.2, 2.0, -1.4, "#6d89b3");
  for (let i = 0; i < 6; i++) {
    m.slab(6.2 - 0.62, FLOOR + 0.1, -4.85 + i * 0.58, 6.2 - 0.6, 1.9, -4.35 + i * 0.58, i % 2 ? "#7d98c0" : "#5f7ba6");
    m.slab(6.2 - 0.64, 0.5, -4.55 + i * 0.58, 6.2 - 0.62, 0.8, -4.5 + i * 0.58, "#2c3347");
  }
  m.slab(6.2 - 0.12, FLOOR, 3.0, 6.2, 3.1, 5.2, "#b9783f", K.WOOD);
  m.slab(6.2 - 0.16, 1.6, 3.4, 6.2 - 0.12, 2.5, 4.8, "#e9f1f5", K.GLASS);
  m.slab(6.2 - 0.12, 1.0, -0.8, 6.2 - 0.08, 3.4, 2.2, "#c9a066", K.WOOD);
  m.slab(6.2 - 0.2, 1.1, -0.7, 6.2 - 0.12, 3.3, 2.1, "#d9a05e", K.WOOD);
  ["#f1a9b9", "#fff1c8", "#9cc3e6", "#cdeac0", "#fff"].forEach((h, i) => m.slab(6.2 - 0.22, 1.5 + (i % 2) * 0.9, -0.5 + i * 0.5, 6.2 - 0.2, 2.1 + (i % 2) * 0.9, -0.1 + i * 0.5, h));
  yield;
  // the desks: ours in the middle, the class either side; chairs; students
  desk(m, 0, 1.55, 0, true);
  chair(m, 0, 0, 0, 1);
  for (const x of [-3.5, 3.5]) for (const z of [-2.2, 2.6, 6.0]) {
    desk(m, x, z, 0);
    chair(m, x, z - 1.0, 0, 0.7);
  }
  for (const [x, z] of [[-3.5, -2.2], [3.5, 2.6], [-3.5, 6.0]]) student(m, x, z - 1.0, ["#2a2020", "#7a5230", "#2b3a68"][(Math.round(x + z) + 9) % 3]);
  // a plant and the teacher's desk, a clock above the board
  m.box(-5.2, 0.0, -4.4, 0.7, 1.9, 0.7, "#8a5430", K.WOOD);
  m.sph(-5.2, 1.7, -4.4, 0.7, 0.85, 0.7, "#3f8f55");
  m.box(0.4, 3.9, BACK_Z + 0.06, 0.8, 0.8, 0.06, "#fbf6ea");
  m.box(0.4, 3.9, BACK_Z + 0.1, 0.62, 0.62, 0.04, "#fffdf2", K.GLOW);
  m.box(0.4, 3.97, BACK_Z + 0.13, 0.04, 0.26, 0.02, "#2c3347");
  m.box(0.47, 3.9, BACK_Z + 0.13, 0.2, 0.04, 0.02, "#2c3347");
  const room = mesh(m.build());
  yield;

  // the board and the paper
  const board = boardPlane();
  board.position.set(0.3, 1.7, BACK_Z + 0.06);
  const paper = paperPlane();
  paper.rotation.set(-Math.PI / 2, 0, 0);
  paper.rotateZ(0.2);
  paper.position.set(0.25, 0.158, 1.62);
  paper.scale.setScalar(0.92);
  yield;

  // Chabashira: a dark silhouette at the board, long purple hair
  const tb = new Mesher();
  const SIL = K.SIL;
  tb.cyl(-0.09, 0, 0, 0.075, 0.065, 0.82, "#111", SIL);
  tb.cyl(0.09, 0, 0, 0.075, 0.065, 0.82, "#111", SIL);
  tb.cyl(0, 0.78, 0, 0.2, 0.15, 0.55, "#111", SIL);
  tb.sph(0, 1.5, 0, 0.21, 0.32, 0.12, "#111", SIL);
  tb.sph(0, 1.38, 0, 0.19, 0.3, 0.12, "#111", SIL);
  tb.limb([0.2, 1.7, 0], [0.34, 1.98, -0.28], 0.05, "#111", SIL);
  tb.limb([-0.2, 1.7, 0], [-0.3, 1.2, 0.08], 0.05, "#111", SIL);
  tb.sph(0, 1.9, 0, 0.12, 0.14, 0.12, "#111", SIL);
  tb.cyl(0, 1.7, 0, 0.05, 0.06, 0.12, "#111", SIL);
  tb.box(0.34, 2.0, -0.3, 0.07, 0.025, 0.025, "#fff", K.GLOW);
  const teacher = mesh(tb.build());
  teacher.scale.setScalar(1.95);
  const hm = new Mesher();
  // the hair: a crown, and a long fall from the head's pivot (0 = the head's top)
  hm.sph(0, -0.02, 0.0, 0.15, 0.15, 0.15, "#7a49b8");
  hm.sph(0, -0.5, -0.05, 0.17, 0.52, 0.09, "#6a3fa6");
  hm.sph(0, -1.0, -0.06, 0.13, 0.52, 0.07, "#5c3597");
  hm.sph(-0.13, -0.38, 0.03, 0.05, 0.34, 0.05, "#8a58c8");
  hm.sph(0.13, -0.38, 0.03, 0.05, 0.34, 0.05, "#8a58c8");
  const hair = mesh(hm.build());
  hair.scale.setScalar(1.95);
  yield;

  // god-rays and the floor's window patches: additive sheets, the sun slanting in from the west
  const rayMat = new ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: "attribute vec2 aUv; varying vec2 vUv; void main(){ vUv = aUv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main() {
        float a = pow(1.0 - vUv.x, 1.2) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        a *= 0.55 + 0.45 * sin(vUv.y * 14.0 + uTime * 0.35 + vUv.x * 3.0);
        vec3 c = vec3(1.0, 0.78, 0.4) * a * 0.34;
        gl_FragColor = vec4(pow(c, vec3(1.6)), 1.0);
      }`,
  });
  const sheets = [];
  const pushQuad = (pts, uvs) => sheets.push([pts, uvs]);
  const dir = [8.4, -1.55];
  for (const z of WIN_Z.slice(0, 3)) {
    for (const dz of [-0.75, 0.7]) {
      const zz = z + dz;
      const T0 = [-6.1, 4.3, zz];
      const B0 = [-6.1, 0.6, zz];
      pushQuad([T0, B0, [B0[0] + dir[0], B0[1] + dir[1], zz + 0.5], [T0[0] + dir[0], T0[1] + dir[1], zz + 0.5]], [[0, 0], [0, 1], [1, 1], [1, 0]]);
    }
  }
  const rg = new Float32Array(sheets.length * 6 * 3);
  const ru = new Float32Array(sheets.length * 6 * 2);
  sheets.forEach(([p, u], i) => {
    [0, 1, 2, 0, 2, 3].forEach((v, j) => {
      rg.set(p[v], (i * 6 + j) * 3);
      ru.set(u[v], (i * 6 + j) * 2);
    });
  });
  const rayGeo = new BufferGeometry();
  rayGeo.setAttribute("position", new BufferAttribute(rg, 3));
  rayGeo.setAttribute("aUv", new BufferAttribute(ru, 2));
  const rays = new Mesh(rayGeo, rayMat);
  rays.frustumCulled = false;
  rays.renderOrder = 10;
  const patchGeo = new BufferGeometry();
  const pp = [];
  const pu = [];
  for (const z of WIN_Z.slice(0, 3)) {
    const q = [[-0.4, z - 1.6], [-0.4, z + 1.3], [5.9, z + 2.5], [5.9, z - 0.4]];
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    [0, 1, 2, 0, 2, 3].forEach((v) => {
      pp.push(q[v][0], FLOOR + 0.012, q[v][1]);
      pu.push(0.15 + uv[v][0] * 0.0, uv[v][1]);
    });
  }
  patchGeo.setAttribute("position", new BufferAttribute(new Float32Array(pp), 3));
  patchGeo.setAttribute("aUv", new BufferAttribute(new Float32Array(pu), 2));
  const patches = new Mesh(patchGeo, rayMat);
  patches.frustumCulled = false;
  patches.renderOrder = 9;
  yield;

  // cherry petals on the wind through the open windows
  const petalMat = new MeshBasicMaterial({ side: DoubleSide, toneMapped: false });
  const petals = new InstancedMesh(new PlaneGeometry(0.2, 0.13), petalMat, 110);
  petals.frustumCulled = false;
  for (let i = 0; i < 110; i++) petals.setColorAt(i, new Color(i % 3 ? "#ffb4c8" : "#ffe3ea"));
  return { room, board, paper, teacher, hair, rays, patches, petals, mats: [cm, rayMat, petalMat] };
}

// the sky shell: the bubble that swells out of the pup is the sunset
export function skyShell() {
  const mat = new ShaderMaterial({
    side: DoubleSide,
    depthWrite: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      varying vec3 vD;
      void main() {
        float h = clamp(vD.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(vec3(1.0, 0.8, 0.5), vec3(0.62, 0.62, 0.95), smoothstep(0.3, 0.85, h));
        c = mix(c, vec3(1.0, 0.96, 0.78), exp(-length(vec2(vD.x + 0.6, vD.y - 0.18)) * 2.4));
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
  const m = new Mesh(new SphereGeometry(1, 24, 14), mat);
  m.frustumCulled = false;
  m.renderOrder = -3;
  return m;
}

