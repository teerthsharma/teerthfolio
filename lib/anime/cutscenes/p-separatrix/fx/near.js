// NEAR of p-separatrix: umber ruin pieces that frame the wide shots (hidden whenever they stand over the seal) and the gold step glow behind the seal in both holds.
// The mid and far layers come from the live set (world/index.js), so this layer only adds the foreground frame and the halo.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { archBay } from "../live/world.js";
import { column } from "../live/arena.js";
import { DOCK, HOLD1, HOLD2 } from "../clock.js";
import { GOLD, TONE, UMBER, tone } from "../tone.js";

await loadPack("araki");
const GLOW = glslFor(["arakiStepGlow"]);

const WIDE = new Set([3, 5, 11, 12, 14, 15]);
const PIECE_VS = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const PIECE_FS = /* glsl */ `
  uniform vec3 uU; uniform vec3 uG; varying vec3 vN;
  void main() {
    float d = dot(normalize(vN), normalize(vec3(0.5, 0.2, -0.84)));
    gl_FragColor = vec4(mix(uU, uG, smoothstep(0.55, 0.9, d) * 0.5), 0.99);
  }`;
const GLOW_FS = /* glsl */ `
  uniform vec2 uRes; uniform float uA; uniform float uT; uniform vec4 uHole;
  ${TONE}
  ${GLOW}
  void main() {
    vec3 g = clamp(arakiStepGlowC(vec3(0.0), gl_FragCoord.xy / uRes.y, uT), 0.0, 1.0);
    float a = clamp(max(g.r, max(g.g, g.b)), 0.0, 1.0) * uA;
    vec2 e = (gl_FragCoord.xy / uRes - uHole.xy) / uHole.zw;
    a *= smoothstep(0.85, 1.1, length(e));
    gl_FragColor = vec4(siteTone(g) * a, a);
  }`;
const FULL_VS = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const raw = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const U = (names) => Object.fromEntries(Object.entries(uniformsFor(names)).map(([k, v]) => [k, v && typeof v === "object" && "value" in v ? v : { value: v }]));

export default function buildNear(ctx) {
  const group = new Group(), V = new Vector3(), V0 = new Vector3();
  const uRes = ctx.engine?.shared?.uRes ?? { value: new Vector2(1280, 720) };
  const proj = (w, A) => { const c = ctx.player?.camera; if (!c) return null; V0.copy(w).project(c); return [(V0.x * 0.5 + 0.5) * A, 0.5 - V0.y * 0.5]; };

  const pieceMat = tone(new ShaderMaterial({ uniforms: { uU: { value: new Vector3(...raw(UMBER)) }, uG: { value: new Vector3(...raw(GOLD)) } }, vertexShader: PIECE_VS, fragmentShader: PIECE_FS }));
  const pieces = [
    { geo: column(), at: [-2.6, 0, 1.6], s: 1.0 },
    { geo: archBay(), at: [3.8, 0, 0.8], s: 0.8 },
  ].map(({ geo, at, s }) => {
    geo.computeBoundingBox();
    const mesh = new Mesh(geo, pieceMat);
    mesh.position.set(...at);
    mesh.scale.setScalar(s);
    mesh.frustumCulled = false; mesh.visible = false;
    group.add(mesh);
    return { mesh, box: geo.boundingBox, at, s };
  });

  const glow = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { ...U(["arakiStepGlow"]), uRes, uA: { value: 0.7 }, uT: { value: 0 }, uHole: { value: new Vector4(0.5, 0.5, 1e-4, 1e-4) } },
    vertexShader: FULL_VS, fragmentShader: GLOW_FS, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
  }));
  glow.frustumCulled = false; glow.renderOrder = 1170; glow.visible = false;
  group.add(glow);
  glow.material.uniforms.uArkGlowR.value = new Vector3(0.1, 0.19, 0.3);
  glow.material.uniforms.uArkGlowCol.value = new Vector3(...raw(GOLD));

  const inHold = (t) => (t >= HOLD1[0] && t < HOLD1[1]) || (t >= HOLD2[0] && t < HOLD2[1]);
  const C = new Vector3();
  const covers = ({ box, at, s }) => {
    const b = ctx.player?.box, cam = ctx.player?.camera;
    if (!b || !cam) return true;
    const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i < 8; i++) {
      C.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).multiplyScalar(s).add(V.set(at[0] + DOCK[0], at[1] + DOCK[1], at[2] + DOCK[2]));
      V0.copy(C).project(cam);
      if (V0.z > 1) return true;
      const x = V0.x * 0.5 + 0.5, y = 0.5 - V0.y * 0.5;
      lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y);
    }
    const ix = Math.max(0, Math.min(hi[0], b[2]) - Math.max(lo[0], b[0])), iy = Math.max(0, Math.min(hi[1], b[3]) - Math.max(lo[1], b[1]));
    return ix * iy > 0.05 * (b[2] - b[0]) * (b[3] - b[1]);
  };

  return {
    group,
    update(t, dt, cue) {
      const H = uRes.value.y, A = uRes.value.x / H, wide = WIDE.has(cue?.shotN);
      for (const pc of pieces) pc.mesh.visible = wide && !covers(pc);
      glow.visible = inHold(t);
      if (glow.visible) {
        const s = proj(ctx.seal.chest(new Vector3()), A), b = ctx.player?.box;
        if (s) glow.material.uniforms.uArkGlowAt.value = new Vector2(s[0], 1 - s[1]);
        if (b) glow.material.uniforms.uHole.value.set((b[0] + b[2]) / 2, 1 - (b[1] + b[3]) / 2, 0.375 * (b[2] - b[0]), 0.375 * (b[3] - b[1]));
        glow.material.uniforms.uT.value = t;
      }
    },
    dispose() { pieceMat.dispose(); pieces.forEach((pc) => pc.mesh.geometry.dispose()); glow.material.dispose(); glow.geometry.dispose(); },
  };
}
