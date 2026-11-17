// FX layer for pr-tensorflow-128930: the tower's board and map, the breath, rain, spray, splash, steam and smoke.
// Threads: gzBrackets (map card), gzBreathBeam (beam card), kit makeParticles (rain, spray, splash), makeFlame (steam, smoke). Written new: the board canvas and the card mounts.
import { DoubleSide, Group, Mesh, NoBlending, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { makeParticles } from "../../../kit/fx/particles.js";
import { makeFlame } from "../../../kit/fx/flame.js";
import { cameras, depthOf, onPlane, rectAt, shotAt, toBand, bandHeight } from "../stage.js";
import { SHOTS } from "../layout.js";
import { makeBoard } from "./board.js";

await loadPack("cuts");

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const V = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const LIN = "vec3 gzLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }";

// a flat card parallel to the image plane; solid = an opaque set card (id 0.995, no line art), else a premultiplied overlay
function card(frag, uniforms, tools, solid) {
  const m = new ShaderMaterial({
    uniforms, vertexShader: V, side: DoubleSide, depthTest: true, depthWrite: solid, transparent: !solid, premultipliedAlpha: true, blending: solid ? NoBlending : NormalBlending,
    fragmentShader: `uniform float uEx; varying vec2 vUv; ${tools ? glslFor(tools) : ""} ${LIN} ${frag}`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false; mesh.userData.layer = 1; mesh.visible = false;
  return mesh;
}
const mount = (m, cam, a, rect, z) => { const g = rectAt(cam, a, rect, z); m.position.copy(g.pos); m.quaternion.copy(cam.q); m.scale.set(g.w, g.h, 1); };

export default function build(ctx) {
  const { engine } = ctx, group = new Group(), seal = ctx.seal;
  const board = makeBoard();

  const boardCard = card("uniform sampler2D tB; void main() { vec4 c = texture2D(tB, vec2(vUv.x, vUv.y)); gl_FragColor = vec4(c.rgb * (1.0 + 0.8 * smoothstep(0.55, 0.9, dot(c.rgb, vec3(0.33)))), 0.995); }", { tB: { value: board.tex } }, null, true);
  const mapU = { ...uniformsFor(["gzKit", "gzBrackets"]), uEx: { value: 0 } };
  const mapCard = card("void main() { gl_FragColor = vec4(gzLin(gzBrackets(vUv, 0.0)), 0.995); }", mapU, ["gzKit", "gzBrackets"], true);
  // the breath: the table's beam over the whole image band, isotropic in band heights
  const beamU = { ...uniformsFor(["gzKit", "gzBreathBeam"]), uGzMouth: { value: new Vector2() }, uGzTarget: { value: new Vector2() } };
  const beamCard = card(`void main() {
      vec2 p = vec2(vUv.x * 2.39, vUv.y);
      vec3 c = gzBreathBeam(p, uEx), b = gzBack(p);
      float a = step(0.004, length(c - b));
      c = gzLin(c) * (1.0 + 1.4 * smoothstep(0.6, 0.95, dot(c, vec3(0.33))));
      gl_FragColor = vec4(c * a, a);
    }`, { ...beamU, uEx: { value: 0 } }, ["gzKit", "gzBreathBeam"], false);
  group.add(boardCard, mapCard, beamCard);

  const rain = makeParticles(engine, { count: 700, kind: "streak", size: 1.5, sizeMode: "px", length: 46, sizeJitter: 0.35, colours: ["#cfe4ff"], alpha: 0.55, motion: { mode: "rain", speed: 14, spread: 0, slant: 0.18 }, volume: { shape: "box", size: [90, 36, 60], at: [0, 12, 0] }, splash: 1, splashSize: [0.1, 0.3], fps: 12, seed: 12 });
  const spray = makeParticles(engine, { count: 40, kind: "disc", size: 3, sizeMode: "px", colours: ["#cfe4ff", "#e8eef4"], motion: { mode: "fall", speed: 1.2, spread: 0.5, gravity: -6 }, volume: { shape: "sphere", size: [4, 2, 4], at: [0, 3, 0] }, life: 0.8, once: true, stagger: 0.3, fps: 12, seed: 9 });
  const splash = makeParticles(engine, { count: 24, kind: "disc", size: 4, sizeMode: "px", colours: ["#e8eef4", "#9aa8b4"], motion: { mode: "burst", speed: 6, spread: 0.7, gravity: -6 }, volume: { shape: "disc", size: [3, 0.4, 3], at: [0, 0.3, 0] }, once: true, life: 0.6, splash: 1, fps: 12, seed: 33 });
  const tips = Array.from({ length: 9 }, (_, c) => [0, 0.13 + 0.035 * c + 0.1 + 0.11 * Math.sin((Math.PI * (c + 0.5)) / 9), c < 3 ? -0.76 + 0.19 * c : -0.04 + 0.01 * (c - 3)]);
  const steam = makeFlame(engine, { mode: "steam", at: tips.map(([x, y, z]) => [x * 6, y * 6, z * 6, 0.9]), size: [2.6, 5.2], bands: 3, colours: ["#e8eef4", "#b4bcc4", "#7a828a"], alpha: 0.7, scallop: 1, rise: 0.25, fps: 12, blend: "normal", seed: 34, k: 0 });
  const smokes = [0, 1, 2].map((k) => makeFlame(engine, { mode: "steam", at: [[0, 0, 0]], size: [6, 34], bands: 3, colours: ["#9a9ea2", "#7a7e82", "#5a5e62"], alpha: 0.6, scallop: 1, rise: 0.4, fps: 12, seed: 36 + k, k: 0 }));
  group.add(rain.group, spray.group, splash.group, ...smokes.map((s) => s.group));
  seal.attach(steam.group, 1, "body");

  let cams = null, asp = 0;
  return {
    group,
    update(t, dt, cue) {
      const a = ctx.aspect();
      if (!cams || Math.abs(a - asp) > 1e-3) { asp = a; cams = cameras(ctx, a); }
      const f = Math.floor(t * 12 + 0.02), i = cue.shot?.i ?? shotAt(cams, t), cam = cams[i], L = SHOTS[i], zh = depthOf(cam, cam.hero);
      const T2 = ctx.atTier(2);
      // the board and the map ride the tower's face
      boardCard.visible = !!L.board && t >= 2; mapCard.visible = !!L.map && t >= 2;
      if (boardCard.visible) { board.draw(f); mount(boardCard, cam, a, L.board, zh * 1.04); }
      if (mapCard.visible) { mapU.uGzFrame.value = clamp(f, 24, 53); mount(mapCard, cam, a, L.map, zh * 1.04); }
      // rain: steady to f126, then clean; tier 2 and up (below that the plate carries a painted still)
      rain.group.visible = T2 && t < 10.5 && !L.room;
      rain.set({ k: t < 10.5 && !L.room ? 1 : 0, volume: { at: [cam.eye.x + cam.F.x * 30, 12, cam.eye.z + cam.F.z * 30] } });
      rain.update(t);
      // spray off the rising hide (f12..f23) and the fake's splash
      spray.group.visible = T2 && t >= 1 && t < 2;
      spray.set({ k: clamp((t - 1) / 1), volume: { at: [seal.at[0], 3.5, seal.at[2]] } }); spray.update(t);
      const g = ctx.gz?.fake;
      splash.group.visible = T2 && !!g && t >= 8.917 && t < 9.6;
      if (splash.group.visible) { splash.set({ k: clamp((t - 8.917) / 0.683), volume: { at: [g.x, 0.3, g.z] } }); splash.update(t); }
      // the breath, from the hero's mouth to the fake's chest (k8 to k11), thin at k11, fading after
      const bk = Math.floor((t - 8) * 24 + 0.02), mouth = seal.named().mouth;
      beamCard.visible = !!g && bk >= 8 && t < 8.6;
      if (beamCard.visible) {
        const tz = Math.max(zh * 0.98, 1), m = toBand(cam, mouth, a), c = toBand(cam, g, a);
        beamU.uGzMouth.value.set(m[0] * 2.39 + 0.03, 1 - m[1]); beamU.uGzTarget.value.set(c[0] * 2.39, 1 - c[1]);
        beamU.uGzThin.value = bk >= 11 ? 1 : 0;
        mount(beamCard, cam, a, [0, 1, 0, 1], tz);
        beamCard.material.uniforms.uEx.value = t;
      }
      // steam from the fin tips after the breath; smoke columns over the dawn city
      steam.group.visible = T2 && t >= 8.5 && t < 10.5;
      steam.set({ k: clamp((t - 8.5) / 1.2) * (t < 10.5 ? 1 : 0) }); steam.update(t);
      // smoke columns rise from the shore line left and right of the hero, never in front of it
      smokes.forEach((s, k) => {
        s.group.visible = T2 && t >= 9.167;
        if (!s.group.visible) return;
        const z = zh * 1.7, h = bandHeight(cam, a, z), p = onPlane(cam, [0.16, 0.7, 0.9][k], 0.66, a, z);
        s.group.position.copy(p); s.set({ k: clamp((t - 9.167) / 1.4), size: [h * 0.1, h * 0.55] }); s.update(t);
      });
    },
    dispose() { board.dispose(); rain.dispose(); spray.dispose(); splash.dispose(); steam.dispose(); smokes.forEach((s) => s.dispose()); },
  };
}
