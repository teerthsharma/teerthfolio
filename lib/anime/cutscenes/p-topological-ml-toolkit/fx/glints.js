// Four J.C.Staff screen shaders (the jcstaff pack) recoloured to this cutscene's inks: an arc from the raised hand to the orb, sparks at the train hit and
// the pop, two smoke bands and a glint at the pop. Each is a camera-facing veil just behind the seal, in front of the city, shown only in its window.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { DOCK, HIT, ORB_AT, POP_AT, smooth } from "../clock.js";
import { PAL } from "../tone.js";

await loadPack("jcstaff");

const RECOLOUR = { INK: "#000000", DEEP: "#000000", GL_MID: "#000000", GL_SHADE: "#000000", ARC: PAL.cyan, ARC_W: PAL.white, GLOW_O: "#7fb8ff", CORE: PAL.white, SMOKE_L: "#eef3fa", SMOKE_S: PAL.steel };
const vec = (hex) => { const n = parseInt(hex.slice(1), 16); return `vec3(${[16, 8, 0].map((s) => (((n >> s) & 255) / 255).toFixed(3)).join(", ")})`; };
const inks = (name) => glslFor([name]).replace(/const vec3 JCS_(\w+) = vec3\([^)]*\);/g, (m, k) => (k in RECOLOUR ? `const vec3 JCS_${k} = ${vec(RECOLOUR[k])};` : m));
const VS = "uniform float uD, uTan, uAsp; varying vec2 vP; void main() { vP = position.xy * 0.5 + 0.5; gl_Position = projectionMatrix * vec4(position.x * uAsp * uTan * uD, position.y * uTan * uD, -uD, 1.0); }";

function quad(name, statics, [t0, t1], feed) {
  const u = { ...uniformsFor([name]), uT: { value: 0 }, uAt: { value: new Vector2(0.89, 0.5) }, uD: { value: 1 }, uTan: { value: 1 }, uAsp: { value: 1 } };
  for (const [k, v] of Object.entries(statics)) u[k] = { value: v };
  const mat = new ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, depthTest: true, vertexShader: VS,
    fragmentShader: `${inks(name)}\nuniform float uT; uniform float uAsp; uniform vec2 uAt; varying vec2 vP;\nvoid main() {\n  vec3 c = ${name}(vec2(vP.x * uAsp, vP.y) - uAt + vec2(0.89, 0.5), uT);\n  if (max(c.r, max(c.g, c.b)) < 0.004) discard;\n  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);\n}`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.visible = false;
  return {
    mesh, mat,
    update(t, ctx, cam) {
      const on = t >= t0 && t < t1;
      mesh.visible = on;
      if (!on) return;
      const v = mat.uniforms;
      v.uT.value = t; v.uD.value = cam.D; v.uTan.value = cam.tan; v.uAsp.value = cam.A;
      feed(v, ctx, cam);
    },
  };
}

export default function glints(ctx) {
  const group = new Group(), V = new Vector3(), CHEST = new Vector3(), AT = new Vector3(...DOCK), ORB = new Vector3(...ORB_AT).add(AT);
  const POP = new Vector3(...POP_AT).add(AT), BUB = new Vector3();
  const HAND = new Vector2(), TIP = new Vector2(), SPOT = new Vector2(), cam = { A: 1, tan: 1, D: 1 };
  const uv = (w, out) => {
    const c = ctx.player?.camera;
    if (!c || !w) return null;
    V.copy(w).project(c);
    return V.z > 1 ? null : out.set(Math.min(0.98, Math.max(0.02, V.x * 0.5 + 0.5)), Math.min(0.98, Math.max(0.02, V.y * 0.5 + 0.5)));
  };
  const arcFeed = (to) => (u, c) => {
    const a = uv(ctx.seal.named?.()?.handR, HAND), b = uv(to, TIP);
    if (!a || !b) return;
    u.uJcsAx.value = a.x * c.A; u.uJcsAy.value = a.y; u.uJcsBx.value = b.x * c.A; u.uJcsBy.value = b.y;
  };
  const chestOrigin = (u, c) => { const p = uv(ctx.seal.chest(CHEST), SPOT); if (p) { u.uJcsSx.value = p.x * c.A; u.uJcsSy.value = p.y; } };
  const popOrigin = (u, c) => { u.uJcsSx.value = 0.5 * c.A; u.uJcsSy.value = 0.95; };
  const smoke = (x, seed) => (u, c) => { u.uJcsSmokeX.value = x * c.A; u.uJcsSeed.value = seed; };
  const glow = (u, c) => u.uAt.value.set(0.5 * c.A, 0.9);
  const quads = [
    quad("jcsArcBolt", { uJcsArcAmp: 0.06 }, [4.7, 7.1], arcFeed(ORB)),
    quad("jcsArcBolt", { uJcsArcAmp: 0.06 }, [HIT.release, HIT.release + 0.3], arcFeed(BUB)),
    quad("jcsSparkTicks", { uJcsSparkRate: 3.0 }, [HIT.train, HIT.train + 0.4], chestOrigin),
    quad("jcsSparkTicks", { uJcsSparkRate: 3.0 }, [HIT.pop, HIT.pop + 0.5], popOrigin),
    quad("jcsSmokeBands", {}, [4.2, 6.0], smoke(0.2, 0)),
    quad("jcsSmokeBands", {}, [4.2, 6.0], smoke(0.82, 3)),
    quad("jcsGlowStep", { uJcsGlowR: 0.24 }, [HIT.pop, HIT.pop + 0.2], glow),
  ];
  for (const q of quads) group.add(q.mesh);
  return {
    group,
    update(t) {
      const c = ctx.player?.camera;
      if (!c) return;
      cam.A = c.aspect; cam.tan = Math.tan((c.fov * Math.PI) / 360); cam.D = c.position.distanceTo(ctx.seal.chest(CHEST)) + 1.2;
      BUB.copy(ORB).lerp(POP, smooth(HIT.release, HIT.pop, t));
      for (const q of quads) q.update(t, ctx, cam);
    },
    dispose() { for (const q of quads) { q.mesh.geometry.dispose(); q.mat.dispose(); } },
  };
}
