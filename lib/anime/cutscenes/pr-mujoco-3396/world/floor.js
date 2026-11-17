// The square of the deployed set, boosted in place: far setts fade to one value (no moire), a lighter lane runs to the gap, a warm pool of light lies round the hero, the floor floods gold-white as the gap opens, and the hero casts a contact shadow.
import { Group, Mesh, PlaneGeometry, Vector4 } from "three";
import { CUT, DOCK, R, SEAL, T, pupScale, smooth } from "../clock.js";
import { charcoal } from "../live/charcoal.js";
import { ORDER } from "./spec.js";

const FAR_FADE = "tone = mix(tone, 0.6, smoothstep(0.02, 0.12, px));";
const FAR_FADE_NEW = "tone = mix(tone, 0.6, smoothstep(0.008, 0.032, px));";
const RING = "tone = mix(tone, tone * 0.75, smoothstep(0.3, 0.0, abs(length(p) - 5.0)));";
const UNIFORMS = "uniform float uCrack, uIce, uQuake, uSea;";
const LANES = /* glsl */ `
          float road = 1.0 - smoothstep(1.6, 2.1, abs(p.x - 0.25 * (p.y + 6.0)));
          tone += road * 0.07 * (1.0 - mortar) * (1.0 - smoothstep(0.008, 0.03, px));
          float wear = iNoise(p * 0.45) * iNoise(p * 1.7 + 4.0);
          tone -= 0.12 * smoothstep(0.35, 0.8, wear);
          float pool = uPool.w * (1.0 - smoothstep(0.7 * uPool.z, uPool.z, length(p - uPool.xy)));
          tone += 0.24 * pool;
          wash += 0.4 * pool;`;
const FLOOD = "vec3 col = drawn(tone, wash + uQuake * 0.1, keep, keepK);";
const FLOOD_NEW = /* glsl */ `float blz = uSea * (1.0 - smoothstep(1.5, 25.0, dist));
          keep = mix(keep, vec3(1.0, 0.84, 0.45), blz);
          keepK = max(keepK, 1.0 * blz);
          tone = mix(tone, 1.0 - 0.14 * mortar, 0.9 * blz);
          vec3 col = drawn(tone, wash + uQuake * 0.1, keep, keepK);
          col = mix(col, vec3(1.0, 0.84, 0.6), 0.9 * blz) * (1.0 + 0.3 * blz);`;

const once = (src, from, to) => {
  if (src.split(from).length !== 2) throw new Error(`floor.js: patch target not found once: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};

export function buildFloor(k, ctx) {
  const m = k.ground.material;
  const uPool = new Vector4(0, 0, 1, 0);
  m.uniforms.uPool = { value: uPool };
  m.fragmentShader = once(once(once(once(m.fragmentShader, FAR_FADE, FAR_FADE_NEW), UNIFORMS, `${UNIFORMS}\n      uniform vec4 uPool;`), RING, `${RING}\n${LANES}`), FLOOD, FLOOD_NEW);
  m.needsUpdate = true;

  const shadow = new Mesh(new PlaneGeometry(1.7, 1.1).rotateX(-Math.PI / 2), charcoal({ tone: 0.05, transparent: true, opacity: 0.55 }));
  shadow.frustumCulled = false;
  shadow.renderOrder = ORDER.ground;
  shadow.position.y = 0.04;
  const group = new Group();
  group.add(shadow);

  return {
    group,
    tier: 2,
    update(t, s) {
      const a = ctx.seal?.at ?? DOCK, sc = SEAL.scale * pupScale(s);
      group.visible = t >= CUT && t < R.turnBack + 2 / 24;
      shadow.position.set(a[0] - DOCK[0], 0.04, a[2] - DOCK[2]);
      shadow.scale.set(sc, 1, sc);
      uPool.set(a[0] - DOCK[0], a[2] - DOCK[2], 1.2 + 1.1 * sc, 1 - smooth(T.shrink[0] - 0.2, T.shrink[0] + 0.3, s));
    },
    dispose() {
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
  };
}
