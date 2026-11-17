// CAST for p-caustic: the seal turns into Madara at the turn and back into the pale playable seal at the break (the owner's condition).
// The character is printed in the war's sepia matte: the armour keeps its red, the mane and the undersuit go sepia-dark, the face is the lightest.
// The rig is not touched: each material's main() is wrapped once, here, at build (the swap and the squash are on the clock).
import { BackSide, Group, Vector4 } from "three";
import { sitePup } from "./pup.js";
import { DOCK, HIT, SEAL, standAt, warp } from "../clock.js";
import { PAINT } from "../live/parts.js";
import { TONE } from "../tone.js";

// the war paint: on the seal's own lit colour (its normal SK_NRM, its view vWP), a red kept where the colour is red, the rest sepia in three
// soft bands, a warm rim, and the film grain of the war
const WAR = /* glsl */ `
  ${PAINT} ${TONE} uniform vec4 uSk;
  void main() { skMain();
    if (uSk.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 n = normalize(SK_NRM), v = normalize(cameraPosition - vWP), c = pow(max(gl_FragColor.rgb, 0.0), vec3(1.0 / 2.2));
      float red = smoothstep(0.4, 0.6, (c.r - max(c.g, c.b)) / max(c.r, 1e-3)) * smoothstep(0.16, 0.34, c.r);
      float d = dot(n, normalize(vec3(-0.45, 0.75, 0.5))) * 0.5 + 0.5 + (brush() - 0.5) * 0.22;
      float band = 0.42 + 0.33 * smoothstep(0.38, 0.46, d) + 0.25 * smoothstep(0.66, 0.74, d);
      float face = smoothstep(0.55, 0.7, max(c.r, max(c.g, c.b)));
      vec3 base = mix(sepia(c, 0.12), c * vec3(1.04, 0.97, 0.86), face * 0.55);
      vec3 col = mix(base, c, red) * band + vec3(1.0, 0.86, 0.66) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.35 + grain(uSk.y) * 0.09;
      gl_FragColor.rgb = siteTone(pow(max(col, 0.0), vec3(2.2)));
    }
  }
`;
const MAIN = /void\s+main\s*\(\s*\)/;

export default function build(ctx) {
  const uSk = { value: new Vector4(0, 0, 1, 0) }, seen = new Set();
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2 || m.side === BackSide) return;
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void skMain()") + WAR.replace("SK_NRM", n);
    m.uniforms.uSk = uSk; m.needsUpdate = true;
  });
  const S = SEAL.scale, group = new Group(), stage = new Group();
  // the island's own pup (the playable seal the visitor sees on the site) opens and closes the cutscene, stood on the live lens ray
  const pup = sitePup({ yaw: 0, track: { sign: [0.45, 0.8, 0.3], hop: HIT.back, turn: 0, blink: [HIT.back + 3] } });
  const squash = (g, k, s = S) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
  stage.add(pup.group); group.add(stage);
  return {
    group,
    update(t) {
      // the swap: the pale pup becomes the character at the turn (squash on the drawings), and back at the break
      const on = t >= HIT.turn && t < HIT.back + 2 / 24;
      const into = Math.floor((t - HIT.turn) * 12 + 1e-6), out = Math.floor((t - HIT.back) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on;
      const s = standAt(t);
      stage.position.set(s.p[0] - DOCK[0], 0, s.p[2] - DOCK[2]); stage.rotation.y = s.yaw;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? 1);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96][out - 2] ?? 1 : 1, 1);
      uSk.value.set(on && t < HIT.back ? 1 : 0, warp(t), 0, 0);
    },
    dispose() { ctx.seal.group.visible = true; pup.dispose(); },
  };
}
