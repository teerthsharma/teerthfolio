// The two hand-lettered onomatopoeias of the court (PAKIIN! on the break, VERDICT VOID on the kneel), as screen quads in the upper left.
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector4 } from "three";
import { R } from "../clock.js";
import { letteringCanvas } from "../live/letters.js";
import { TONE } from "../tone.js";

const LETTERS = [
  { text: "PAKIIN!", color: "#f2b630", tilt: -0.1, at: [-0.45, 0.76], half: [0.2, 0.111], t: R.pakiin, jitter: true },
  { text: "VERDICT VOID", color: "#c98a1a", tilt: 0.05, at: [-0.42, 0.85], half: [0.2, 0.111], t: R.word, jitter: false },
];

function quad(l) {
  const lc = letteringCanvas(l.text, l.color, l.tilt);
  const uAt = { value: new Vector4(l.at[0], l.at[1], l.half[0], l.half[1]) };
  const mat = new ShaderMaterial({
    uniforms: { tMap: { value: lc.texture }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: TONE + "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(siteTone(c.rgb) * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1300; mesh.visible = false;
  return { ...l, lc, uAt, mesh, mat };
}

export function buildLetters() {
  const group = new Group();
  const items = LETTERS.map(quad);
  for (const q of items) group.add(q.mesh);
  return {
    group,
    update(t) {
      const odd = Math.floor(t * 12) % 2 ? 1 : -1;
      for (const q of items) {
        const on = t >= q.t[0] && t < q.t[1];
        q.mesh.visible = on;
        if (!on) continue;
        const age = t - q.t[0];
        const pop = Math.min(1, age / 0.08) * (1 + 0.25 * Math.max(0, 1 - age / 0.2));
        const jx = q.jitter ? 0.04 * odd : 0;
        q.uAt.value.set(q.at[0] + jx, q.at[1], q.half[0] * pop, q.half[1] * pop);
      }
    },
    dispose() {
      for (const q of items) { q.lc.texture.dispose(); q.mat.dispose(); q.mesh.geometry.dispose(); }
    },
  };
}
