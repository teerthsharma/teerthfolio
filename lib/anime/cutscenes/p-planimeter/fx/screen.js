// The screen-held planes of the live move (components/world/cutscene/moves/p-planimeter.jsx): the title banner, the eye glint, the chessboard veil,
// CHECKMATE. and the return's amber wipe, as NDC quads placed with the live's own formulas (frame units: half-height 1 = half the frame height).
import { AdditiveBlending, Group, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { TONE, toned } from "../tone.js";
import { WASH } from "../palette.js";
import { S as SC, smooth } from "../clock.js";
import { chessOverlay, glintPlane } from "../live/room.js";
import { disposePlane, poster, titleBanner } from "../live/poster.js";

const VS = /* glsl */ `
  uniform vec2 uCen; uniform vec2 uHalf; uniform float uRoll; uniform float uA; varying vec2 vUv;
  void main() {
    vUv = uv;
    vec2 p = position.xy * uHalf;
    float c = cos(uRoll), s = sin(uRoll);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    gl_Position = vec4(uCen + vec2(p.x / uA, p.y), 0.0, 1.0);
  }`;
const fsMap = (add) => /* glsl */ `
  uniform sampler2D tMap; uniform float uK; varying vec2 vUv;
  ${TONE}
  void main() {
    vec4 c = texture2D(tMap, vUv);
    if (c.a < 0.004 || uK < 0.002) discard;
    gl_FragColor = vec4(siteTone(c.rgb) * c.a * uK, ${add ? "0.0" : "c.a * uK"});
  }`;
const FS_FLAT = /* glsl */ `
  uniform vec3 uCol; uniform float uK; varying vec2 vUv;
  void main() { if (uK < 0.002) discard; gl_FragColor = vec4(uCol * uK, uK); }`;

function quad({ map = null, col = null, add = false, order }) {
  const u = { uCen: { value: new Vector2() }, uHalf: { value: new Vector2(1, 1) }, uRoll: { value: 0 }, uA: { value: 1 }, uK: { value: 0 } };
  if (map) u.tMap = { value: map };
  if (col) u.uCol = { value: new Vector3(...col) };
  const mat = new ShaderMaterial({
    uniforms: u, vertexShader: VS, fragmentShader: map ? fsMap(add) : FS_FLAT,
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, blending: add ? AdditiveBlending : NormalBlending,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  return {
    mesh,
    set(cx, cy, hw, hh, roll, k, A) {
      u.uCen.value.set(cx, cy); u.uHalf.value.set(hw, hh); u.uRoll.value = roll; u.uA.value = A; u.uK.value = k;
      mesh.visible = k > 0.002;
    },
    setMap(m) { u.tMap.value = m; },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}

export function buildScreen(ctx) {
  const group = new Group(), V = new Vector3();
  let banner = titleBanner(), mate = poster("CHECKMATE.", "#ff3d52", 1700, 340);
  const chess = chessOverlay(), glint = glintPlane();
  const bannerQ = quad({ map: banner.mesh.material.map, order: 1330 });
  const mateQ = quad({ map: mate.material.map, order: 1320 });
  const chessQ = quad({ map: chess.material.map, order: 1300 });
  const glintQ = quad({ map: glint.material.map, add: true, order: 1310 });
  const wipeQ = quad({ col: toned(WASH), order: 1340 });
  const quads = [bannerQ, mateQ, chessQ, glintQ, wipeQ];
  for (const q of quads) group.add(q.mesh);

  return {
    group,
    // t: the layer's real seconds (the return's wipe runs on it); S: scene seconds; cam: the lens. Draws on twos in scene time, as the live does.
    step(t, S, cam) {
      const res = ctx.engine.shared.uRes.value, A = res.x / res.y, W = res.x, H = res.y;
      const tt = Math.floor(S * 12 + 1e-6) / 12;

      const [in1, hold, outT] = SC.banner;
      const wf = banner.narrow ? (W - 32) / W : 0.8;
      const hf = Math.max(0.126, (wf * W) / banner.aspect / H);
      const top = 0.112;
      const drop = smooth(0, 1, Math.min(1, S / in1)) + 0.07 * Math.sin(Math.PI * Math.min(1, Math.max(0, (S - in1 * 0.7) / (in1 * 0.8))));
      const roll = smooth(hold, outT, S);
      const ny = 1 - 2 * (top + hf / 2) + (1 - drop) * 2 * (hf + top + 0.02) + roll * 2 * (hf + top + 0.04);
      bannerQ.set(0, ny, wf * A, hf, 0, S < outT ? 1 : 0, A);

      const gk = tt - SC.glint, eye = ctx.seal.named?.()?.eyeR;
      if (gk >= 0 && gk < 1.6 && eye && cam) {
        V.copy(eye).project(cam);
        const pop = gk < 0.18 ? gk / 0.18 : 1 - smooth(0.7, 1.6, gk) * 0.9;
        const size = 0.95 * (0.4 + 0.6 * pop) * (gk < 0.18 ? 1.3 : 1);
        glintQ.set(V.x, V.y, size, size, gk * 0.6, 1, A);
      } else glintQ.set(0, 0, 0, 0, 0, 0, A);

      chessQ.set(0, 0, A, 1, 0, smooth(SC.board[0], SC.board[0] + 0.35, tt) * (1 - smooth(SC.board[1] - 0.4, SC.board[1], tt)), A);

      const mp = tt >= SC.mate && tt < SC.board[1] ? (tt < SC.mate + 0.17 ? 0.7 : tt < SC.mate + 0.33 ? 1.12 : 1) : 0;
      const mh = Math.min(0.2 * mp, (0.92 * A) / 5);
      mateQ.set(0, -0.34, mh * 5, mh, -0.04, mp > 0 ? 1 : 0, A);

      wipeQ.set(0, 0, A, 1, 0, smooth(19.843, 20.417, t) * (1 - smooth(20.5, 20.836, t)), A);
    },
    refont() {
      const build = () => {
        disposePlane(banner.mesh); disposePlane(mate);
        banner = titleBanner(); mate = poster("CHECKMATE.", "#ff3d52", 1700, 340);
        bannerQ.setMap(banner.mesh.material.map); mateQ.setMap(mate.material.map);
      };
      build();
      document.fonts?.load?.('800 100px "Shantell Sans"', "Classroom of the Elite: Exactly Fifty CHECKMATE.").then(build, () => {});
    },
    dispose() {
      for (const q of quads) q.dispose();
      disposePlane(banner.mesh); disposePlane(mate); disposePlane(chess); disposePlane(glint);
    },
  };
}
