// The court's light, all gold: the low sun's glare (shinkai pull), five far shafts and gold dust motes (gold pack pulls). The haze is the
// materials' own uHaze, so no flat plane is drawn here. Overlays are additive and premultiplied; every program is built here, nothing links during playback.
import { AdditiveBlending, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { DOCK, T, smooth } from "../clock.js";
import { SUN } from "../live/toon.js";
import { tone } from "../tone.js";
import { stage } from "./mana.js";

await loadPack("shinkai");
await loadPack("gold");

const SHAFTS = `vec3 fiveShafts(vec2 p, float t) { vec3 c = vec3(0.0); for (int i = 0; i < 5; i++) c += max(goldAtticShaft(p + vec2(float(i) * 0.21 - uDrift, 0.0), t + float(i) * 1.3) - G_INK, vec3(0.0)) * 0.22; return c; }`;

function overlay(names, body, helpers = "") {
  const mat = new ShaderMaterial({
    uniforms: { uA: { value: 1.78 }, uK: { value: 0 }, uT: { value: 0 }, uDrift: { value: 0 }, ...uniformsFor(names) },
    vertexShader: "varying vec2 vP; void main() { vP = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `${glslFor(names)}\nuniform float uA, uK, uT, uDrift; varying vec2 vP;\n${helpers}\nvoid main() {\n  vec2 p = vec2(vP.x * uA, vP.y);\n  vec3 c = ${body};\n  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.0);\n}`,
    transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true,
  });
  tone(mat);
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1150; mesh.visible = false; mesh.userData.plateDepth = true;
  return mesh;
}

export function buildLight(ctx) {
  const group = new Group(), V = new Vector3();
  const SUN_P = new Vector3(...DOCK).addScaledVector(SUN, 900);
  const glare = overlay(["shinSunGlare"], "shnGlare(p, vec3(0.0)) * uK");
  glare.material.uniforms.uShinGlare = { value: 0.28 };
  glare.material.uniforms.uShinSun = { value: new Vector2() };
  const shafts = overlay(["goldAtticShaft"], "fiveShafts(p, uT) * uK", SHAFTS);
  const motes = overlay(["goldDustMote"], "max(goldDustMote(p, uT) - G_UMBER, vec3(0.0)) * uK * (1.0 - smoothstep(0.3, 0.4, vP.x))");
  for (const m of [glare, shafts, motes]) group.add(m);

  return {
    group,
    update(t) {
      const s = stage(t), tt = s.tt;
      const R = ctx.engine?.shared?.uRes?.value, A = R ? R.x / R.y : 1.78;
      const cam = ctx.player?.camera;
      glare.material.uniforms.uA.value = A; shafts.material.uniforms.uA.value = A; motes.material.uniforms.uA.value = A;
      let sunOn = false;
      if (cam) {
        V.copy(SUN_P).project(cam);
        if (V.z < 1) { sunOn = true; glare.material.uniforms.uShinSun.value.set((V.x * 0.5 + 0.5) * A, V.y * 0.5 + 0.5); }
      }
      const fade = (1 - 0.7 * smooth(T.release, T.release + 0.3, tt)) * (1 - smooth(0.4, 0.5, s.dis));
      const gK = s.court ? 0.35 * fade : 0;
      glare.visible = sunOn && gK > 0.003;
      glare.material.uniforms.uK.value = gK;
      const sK = s.court ? 0.2 * (1 - 0.6 * smooth(T.release, T.release + 0.3, tt)) : 0;
      shafts.visible = sK > 0.003;
      shafts.material.uniforms.uK.value = sK; shafts.material.uniforms.uT.value = t; shafts.material.uniforms.uDrift.value = 0.005 * t;
      motes.visible = s.court;
      motes.material.uniforms.uK.value = 0.5; motes.material.uniforms.uT.value = t;
    },
    dispose() {
      group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    },
  };
}
