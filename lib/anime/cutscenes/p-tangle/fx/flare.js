// The sun's glare, the lens ghosts and the four-point flare as light added over the picture: the cuts pack's screen shaders minus their sky, so the live sky stays.
// The seal occludes the sun (the live glare sits behind the pup), and the summed light is capped so the flare never greys the violet.
import { AdditiveBlending, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { DOCK, T, smooth, warp } from "../clock.js";

await loadPack("cuts");
const NAMES = ["tgSunGlare", "tgLensGhosts", "tgFlareCross"];

const VS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const FS = `
uniform float uSunK;
varying vec2 vUv;
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  vec3 base = tgSkyRamp(p);
  vec3 sun = max(tgSunGlare(p, 0.0) - base, 0.0) * uSunK;
  vec3 ghosts = max(tgLensGhosts(p, 0.0) - base, 0.0) * 0.6;
  vec3 cross = max(tgFlareCross(p, 0.0) - base, 0.0);
  gl_FragColor = vec4(min(sun + ghosts + cross, vec3(0.55)), 0.0);
}`;

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const SUNV = new Vector3(), SUNW = new Vector3(), FWD = new Vector3(), V = new Vector3();
const proj = (cam, w) => { V.copy(w).project(cam); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };

export function makeFlare(ctx) {
  const mat = new ShaderMaterial({
    uniforms: {
      uSunK: { value: 0 }, uTgGlare: { value: 0 }, uTgSun: { value: new Vector2(0.5, 0.69) }, uTgGhost: { value: 0 },
      uTgNight: { value: 0 }, uTgDrain: { value: 0 }, uTgCrossAt: { value: new Vector2(0.5, 0.5) }, uTgCross: { value: 0 },
      uTgCrossSize: { value: 0.12 }, uTgCrossCol: { value: new Vector3(1, 0.839, 0.627) },
    },
    vertexShader: VS, fragmentShader: glslFor(NAMES) + FS,
    blending: AdditiveBlending, premultipliedAlpha: true, transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1150;
  const group = new Group(); group.name = "p-tangle-flare"; group.add(mesh);
  const U = mat.uniforms;
  ctx.tg = ctx.tg ?? {};
  // the glints of a hit: a flare at frame point (u, v), `size` in frame heights, strength k (0 hides it)
  ctx.tg.flare = (u, v, size, hex, k) => {
    U.uTgCrossAt.value.set(u, v); U.uTgCross.value = k; U.uTgCrossSize.value = size; U.uTgCrossCol.value.set(...rgbOf(hex));
  };
  return {
    group,
    update(t) {
      const tt = warp(t), dusk = smooth(T.dusk[0], T.dusk[1], tt), cam = ctx.player?.camera, box = ctx.player?.box;
      SUNV.set(0.17, 0.012 + (-0.3 - 0.012) * smooth(T.dusk[0], 16.2, tt), -0.98).normalize();
      U.uTgGlare.value = 0.55 * (1 - dusk);
      if (!cam) { U.uSunK.value = 1 - dusk; return; }
      SUNW.set(DOCK[0] + 400 * SUNV.x, DOCK[1] + 400 * SUNV.y, DOCK[2] + 400 * SUNV.z);
      const s = proj(cam, SUNW);
      if (s) U.uTgSun.value.set(s[0], s[1]);
      const hidden = s && box && s[0] >= box[0] - 0.04 && s[0] <= box[2] + 0.04 && s[1] >= box[1] - 0.04 && s[1] <= box[3] + 0.04;
      const k = hidden ? 0.2 : 1;
      cam.getWorldDirection(FWD);
      U.uSunK.value = (1 - dusk) * k;
      U.uTgGhost.value = (1 - dusk) ** 2 * Math.max(0, FWD.dot(SUNV)) * smooth(1.9, 3.2, t) * (1 - smooth(T.dis[0], T.dis[0] + 0.5, tt)) * k;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
