// BREAKS of p-separatrix: plaster shards off the slit and from the last blow, the ring wall's chunks, umber cracks on the saddle, the crackle behind the seal in
// HOLD 2, and gold flecks from each pool at its first ring. Shards are one instanced draw; the scene is hidden before t = 4.
import { BoxGeometry, BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { makeCracks } from "../../../kit/fx/cel.js";
import { archBay } from "../live/world.js";
import { poolAt } from "../live/arena.js";
import { layout } from "../live/geo.js";
import { makeParcels, schedule } from "../live/story.js";
import { DOCK, HOLD2, PT, R, TR } from "../clock.js";
import { ARCH, GILT, GOLD, OCHRE, PLASTER, TONE, UMBER, tone } from "../tone.js";

await loadPack("sakuga");
const CRACKLE = glslFor(["frescoCrackle"]);

const CRACK_FS = /* glsl */ `
  uniform vec2 uRes; uniform float uA; uniform vec3 uU;
  ${TONE}
  ${CRACKLE}
  void main() {
    vec3 w = clamp(frescoCrackle(gl_FragCoord.xy / uRes.y, 0.0), 0.0, 1.0);
    float v = clamp((0.5 - dot(w, vec3(0.299, 0.587, 0.114))) * 4.0, 0.0, 1.0) * uA;
    gl_FragColor = vec4(siteTone(uU) * v, v);
  }`;
const BEHIND_VS = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.9995, 1.0); }`;
const SHARD_VS = /* glsl */ `
  attribute vec3 aCol; varying vec3 vC;
  void main() {
    vC = aCol;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }`;
const SHARD_FS = /* glsl */ `varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }`;

const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const raw = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const G = 6;
const radial = (speed) => (r) => { const a = r(1) * Math.PI * 2, s = speed[0] + (speed[1] - speed[0]) * r(2); return [Math.cos(a) * s, 1 + 3 * r(3), Math.sin(a) * s]; };
const toLens = (r) => [(r(1) - 0.5) * 4, r(2) * 3, 5 + 7 * r(3)];
const up = (r) => [(r(1) - 0.5) * 2, 2 + 2 * r(2), (r(3) - 0.5) * 2];
const chips = (n, seed, t0, life, from, vel, size, cols) => Array.from({ length: n }, (_, i) => {
  const r = (k) => hash(seed + i, k);
  return { t0: t0 + 0.03 * r(9), life, o: from, v: vel(r), ax: [r(4) - 0.5, r(5) - 0.5, r(6) + 0.3], w: 3 + 9 * r(7), s: size[0] + (size[1] - size[0]) * r(8), c: raw(cols[Math.floor(r(10) * cols.length)]) };
});

export default function buildBreaks(ctx) {
  const group = new Group(), V = new Vector3(), V0 = new Vector3(), m = new Matrix4(), q = new Quaternion(), p = new Vector3(), sc = new Vector3(), ax = new Vector3();
  const uRes = ctx.engine?.shared?.uRes ?? { value: new Vector2(1280, 720) };
  const proj = (w, A) => { const c = ctx.player?.camera; if (!c) return null; V0.copy(w).project(c); return [(V0.x * 0.5 + 0.5) * A, 0.5 - V0.y * 0.5]; };
  const world = (pt) => V.set(pt[0] + DOCK[0], pt[1] + DOCK[1], pt[2] + DOCK[2]);

  const L = layout(ctx.aspect());
  const parcels = schedule(makeParcels(L));
  const ringAt = [-1, 1].map((side) => Math.min(...parcels.filter((x) => !x.band && x.side === side).map((x) => R(x.ring))));
  const pools = [-1, 1].map((side) => poolAt(L, side, new Vector3()).toArray());

  const shards = [
    ...chips(40, 11, TR.pierce, 0.9, PT.slit, radial([1, 4]), [0.08, 0.25], [PLASTER, GOLD]),
    ...chips(80, 97, TR.lastBlow, 1.6, [PT.dv[0], PT.dv[1] + 1.2, PT.dv[2]], toLens, [0.08, 0.25], [PLASTER, OCHRE, GILT]),
    ...pools.flatMap((o, k) => chips(16, 300 + 50 * k, ringAt[k], 0.7, o, up, [0.02, 0.06], [GOLD])),
  ];
  const geo = new BoxGeometry(1, 1, 1);
  const colour = new InstancedBufferAttribute(new Float32Array(shards.length * 3), 3);
  shards.forEach((s, i) => colour.setXYZ(i, ...s.c));
  geo.setAttribute("aCol", colour);
  const mat = tone(new ShaderMaterial({ vertexShader: SHARD_VS, fragmentShader: SHARD_FS }));
  const mesh = new InstancedMesh(geo, mat, shards.length);
  mesh.frustumCulled = false;
  group.add(mesh);

  const chunkGeo = archBay().scale(0.25, 0.25, 0.25);
  const cc = raw(ARCH.pier);
  chunkGeo.setAttribute("aCol", new BufferAttribute(new Float32Array(chunkGeo.attributes.position.count * 3).map((_, i) => cc[i % 3]), 3));
  const chunks = [-2.2, -0.8, 0.8, 1.9, 3.0, -3.2].map((dx, i) => {
    const c = new Mesh(chunkGeo, mat);
    c.visible = false; c.frustumCulled = false;
    group.add(c);
    return { m: c, dx, i };
  });

  const cracks = makeCracks(ctx.engine, { behind: true, ink: UMBER, seam: UMBER, count: 5, width: 0.016, run: 0.25, hold: 0, tau: 0.4, events: [] });
  group.add(cracks.group);

  const crackle = { mesh: new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms: { uRes, uA: { value: 0.5 }, uU: { value: new Vector3(...raw(UMBER)) } }, vertexShader: BEHIND_VS, fragmentShader: CRACK_FS, transparent: true, depthTest: true, depthWrite: false, premultipliedAlpha: true })) };
  crackle.mesh.frustumCulled = false; crackle.mesh.renderOrder = 1180; crackle.mesh.visible = false;
  group.add(crackle.mesh);

  const place = (s, t) => {
    const tau = Math.floor((t - s.t0) * 12 + 1e-6) / 12;
    if (t < s.t0 || tau > s.life) return m.makeScale(0, 0, 0);
    p.set(s.o[0] + s.v[0] * tau, s.o[1] + s.v[1] * tau - 0.5 * G * tau * tau, s.o[2] + s.v[2] * tau);
    ax.set(...s.ax).normalize();
    return m.compose(p, q.setFromAxisAngle(ax, s.w * tau), sc.setScalar(s.s));
  };

  return {
    group,
    update(t, dt, cue) {
      group.visible = t >= 4.0;
      if (!group.visible) return;
      const H = uRes.value.y, A = uRes.value.x / H;
      shards.forEach((s, i) => mesh.setMatrixAt(i, place(s, t)));
      mesh.instanceMatrix.needsUpdate = true;
      for (const c of chunks) {
        const tau = t - (TR.lastBlow + 0.1 + 0.05 * c.i);
        c.m.visible = tau >= 0 && tau < 1.6;
        if (!c.m.visible) continue;
        c.m.position.set(PT.dv[0] + c.dx, 6 + 0.3 * c.i - 0.5 * G * tau * tau, PT.dv[2] - 2);
        c.m.rotation.z = (0.5 + 0.2 * c.i) * tau;
      }
      if (t >= TR.lastBlow) {
        const s = proj(world(PT.saddle), A);
        if (s) cracks.set({ events: [{ at: TR.lastBlow, where: [s[0] / A, s[1]], hold: TR.zero[0] - TR.lastBlow - 0.65 }] });
      }
      cracks.update(t, cue);
      crackle.mesh.visible = t >= HOLD2[0] && t < HOLD2[1];
    },
    dispose() {
      geo.dispose(); mat.dispose(); chunkGeo.dispose(); cracks.dispose();
      crackle.mesh.material.dispose(); crackle.mesh.geometry.dispose();
    },
  };
}
