// The court's pools: flame, soul-light, glows, the column, stones, dust, leaves, motes, rings, shards, the gold flash and the gold flecks.
// The pool formulas are the live move's (components/world/cutscene/moves/p-resolvent.jsx), driven by the scene clock through ../clock.js.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { HOLD, T, beatT, smooth } from "../clock.js";
import { flame, column, leaves, shards, sprites, stones } from "../live/fx.js";
import { celMaterial, hash } from "../live/toon.js";
import { FULCRUM, SCALE_K, scalePieces } from "../live/cast.js";
import { DUST, HW, LEAVES, MOTES, SHARDS, STONES, arc, leafAt, lift, moteAt, scalePose, setM, stoneAt } from "../live/court.js";
import { tone } from "../tone.js";

const FLECKS = 36, EDGE = 90, TRAIL = MOTES - 70;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const COLS = ["#ffe3a0", "#fff6df", "#bfeede", "#ffd27a"];
// the live column's alpha times uHold (the dim on the hold); patched once here, the live shader in live/ is not edited
const holdable = (m) => {
  const dec = "uniform float uTime, uA, uDis;", term = "* uA * (1.0 - clamp(";
  if (m.fragmentShader.split(dec).length !== 2 || m.fragmentShader.split(term).length !== 2) throw new Error("p-resolvent column: live shader text not found once");
  m.fragmentShader = m.fragmentShader.replace(dec, "uniform float uTime, uA, uDis, uHold;").replace(term, "* uA * uHold * (1.0 - clamp(");
  m.uniforms.uHold = { value: 1 };
  return m;
};

export function stage(t) {
  const tt = beatT(t);
  const dis = smooth(T.dis[0], T.dis[1], tt) * 1.2;
  const grow = smooth(T.release, T.release + 0.55, tt);
  return {
    tt, dis, grow,
    gone: dis >= 1.18,
    colK: 1 - smooth(T.colFade[0], T.colFade[1], tt),
    glowK: grow * (1 - smooth(T.colFade[0] + 0.3, T.colFade[1] + 0.8, tt)),
    court: tt >= T.bloom[1] && tt < T.collapse && dis < 1.18,
  };
}

export function buildMana(ctx) {
  const group = new Group(), V = new Vector3(), mat = celMaterial();
  const stoneList = stoneAt(), leafList = leafAt(), moteList = moteAt();
  const origin = new Vector3(HW.x, HW.y + FULCRUM * 0.6, HW.z);
  const fl = flame(), flameM = new Mesh(fl.g, fl.m), col = column();
  const colO = new Mesh(col.g, holdable(col.outer)), colI = new Mesh(col.g, holdable(col.inner));
  const mote = new Mesh(scalePieces().mote, mat);
  const soul = sprites(1, { shape: 1, colors: ["#fff2cf"] });
  const glows = sprites(6, { colors: ["#cfe9ff", "#f6e2ab", "#8a4dff", "#ffd27a", "#9b6bff", "#ffe9b8"] });
  const motes = sprites(MOTES, { shape: 1, colors: COLS });
  const trail = sprites(TRAIL * 3, { shape: 1, colors: COLS });
  const dust = sprites(DUST, { additive: false, colors: ["#e6c796", "#d8b07c", "#eed3a6"] });
  const rings = sprites(6, { shape: 2, colors: ["#ffe9b8", "#ffe9b8", "#ffe9b8", "#f3c04e", "#ffe9b8", "#f3c04e"] });
  const stonesM = stones(STONES, mat), leavesM = leaves(LEAVES, mat), shardsM = shards(SHARDS, mat), flecks = shards(FLECKS + EDGE, mat);
  flameM.scale.set(2.8, 5.2, 2.8);
  flameM.frustumCulled = colO.frustumCulled = colI.frustumCulled = false;
  const flashMat = new ShaderMaterial({
    uniforms: { uO: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform float uO; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 1.6; float a = uO * (0.55 + 0.45 * r); gl_FragColor = vec4(pow(vec3(1.0, 0.86, 0.55), vec3(2.2)) * a, a); }",
  });
  const flash = new Mesh(new PlaneGeometry(2, 2), flashMat);
  flash.renderOrder = 1300; flash.frustumCulled = false; flash.visible = false;
  const mats = [mat, fl.m, col.outer, col.inner, glows.material, soul.material, motes.material, trail.material, dust.material, rings.material, flashMat];
  for (const m of mats) tone(m);
  for (const o of [flameM, colO, colI, mote, soul, glows, motes, trail, dust, rings, stonesM, leavesM, shardsM, flecks, flash]) group.add(o);

  // a mote's state at scene time `q` (the live formula); calm motes (the first 70) stay in place until the release
  const moteAtT = (i, q) => {
    const o = moteList[i], calm = i < 70;
    const y = (o.y + o.sp * q) % 9, x = o.x + 0.4 * Math.sin(q * 0.9 + o.h * 9);
    const d = q - (T.release + 0.1 + 0.02 * Math.hypot(x, o.z));
    const vis = calm ? smooth(2.0, 2.6, q) : smooth(T.release, T.release + 0.4, q);
    const tw = 0.6 + 0.4 * Math.sin(q * 6 + o.h * 40);
    let p, sc, a;
    if (d < 0) { p = [x, y + 0.2, o.z]; sc = calm ? o.s : 0.0005; a = calm ? 0.8 * tw * vis : 0; }
    else { lift(x, y, o.z, d, 3 + 5 * o.h, 2.2 + o.h, 1.0, V); p = [V.x, V.y, V.z]; sc = o.s * 1.4; a = 0.9 * tw * vis; }
    return { p, sc, a: a * (1 - smooth(T.colFade[0] + 0.5, T.colFade[1] + 0.6, q)) };
  };
  // the gold flecks: 36 from the break's scale, 90 along the dissolve edge (the live unmake's edge: n 0.6 + rad 0.55 - uDis 1.5 = 0)
  const fleckAt = (j, tt) => {
    if (j < FLECKS) {
      const b = tt - T.brk;
      if (b < 0 || b >= 1.4) return null;
      const a = hash(j, 41) * Math.PI * 2, sp = 1.2 + 2.6 * hash(j, 42), e = (1 - Math.exp(-1.2 * b)) / 1.2;
      const k = 0.09 * (1 - b / 1.4) + 0.0005;
      return [HW.x + Math.cos(a) * sp * e, arc(HW.y + 0.3, 1.2 + 4.5 * hash(j, 43), b), HW.z + Math.abs(Math.sin(a)) * sp * e * 1.1, k];
    }
    const e = j - FLECKS, s0 = T.dis[0] + ((T.dis[1] - T.dis[0]) * e) / EDGE, age = tt - s0;
    if (age < 0 || age >= 1 || tt > T.dis[1]) return null;
    const d = smooth(T.dis[0], T.dis[1], s0) * 1.2, r = Math.max(0, (1.5 * d - 0.6 * hash(e, 44)) / 0.55) * 46;
    const a = hash(e, 45) * Math.PI * 2, k = (0.08 + 0.14 * hash(e, 46)) * Math.sqrt(1 - age);
    return [origin.x + Math.cos(a) * r, 0.3 + 1.5 * age, origin.z + Math.sin(a) * r, k];
  };

  return {
    group, materials: mats,
    update(t) {
      const { tt, gone, grow, colK, glowK, court, dis } = stage(t);
      const K = SCALE_K, pose = scalePose(tt), sk = pose.sk;
      const pl = pose.panL, pr = pose.panR, broken = pose.broken;
      const gather = smooth(T.gather, T.release, tt), swell = smooth(T.release, T.release + 0.5, tt);
      const soulOn = smooth(2.7, 3.1, tt) * (1 - smooth(T.brk, T.brk + 0.15, tt));
      const flick = 0.88 + 0.12 * Math.sin(tt * 17);
      mote.visible = soulOn > 0.01 && !gone;
      mote.position.set(pl[0], pl[1] + 0.15 * K * sk, pl[2]);
      mote.scale.setScalar(Math.max(0.001, sk * K * (1 + 0.25 * gather + 1.4 * swell)) * flick);
      const sy = pl[1] + 0.16 * K * sk;
      setM(glows, 0, pl[0], sy, pl[2] + 0.05, Math.max((1.15 + 0.5 * gather + 3.2 * swell) * soulOn * flick, 0.001));
      setM(soul, 0, pl[0], sy, pl[2] + 0.1, Math.max((1.0 + 0.5 * gather + 1.2 * swell) * soulOn, 0.001));
      const fk = smooth(T.ignite[0], T.ignite[1], tt) * (1 - smooth(T.brk, T.brk + 0.2, tt));
      flameM.visible = fk > 0.003 && !gone;
      flameM.position.set(pr[0], pr[1] + 0.1, pr[2]);
      fl.m.uniforms.uK.value = fk * (0.94 + 0.06 * Math.sin(tt * 13));
      setM(glows, 2, pr[0], pr[1] + 1.7, pr[2], 6.0 * fk + 0.001);
      setM(glows, 1, 0, 1.0, -1.6, (0.01 + 3.6 * grow) * (1 + 0.04 * Math.sin(tt * 15)) * glowK);
      const bk = clamp01((tt - T.brk) / 0.5);
      setM(glows, 3, HW.x, HW.y + 1.0, HW.z + 0.2, broken ? (0.3 + 5.5 * bk) * (1 - bk * 0.2) : 0.001);
      setM(glows, 4, 0, 0, 0, 0.001);
      setM(glows, 5, 0, 0, 0, 0.001);
      const ga = glows.geometry.attributes.aAlpha.array;
      ga[0] = 0.85; ga[1] = 0.4 * glowK; ga[2] = 0.3 * fk; ga[3] = broken ? 0.9 * (1 - bk) ** 1.5 : 0; ga[4] = ga[5] = 0;
      glows.geometry.attributes.aAlpha.needsUpdate = true; glows.instanceMatrix.needsUpdate = true;
      glows.visible = court;
      soul.geometry.attributes.aAlpha.array[0] = 0.9 * flick; soul.geometry.attributes.aAlpha.needsUpdate = true;
      soul.instanceMatrix.needsUpdate = true; soul.visible = soulOn > 0.01 && !gone;

      const pulse = 0.92 + 0.08 * Math.sin(tt * 13);
      colO.visible = colI.visible = grow > 0.01 && colK > 0.005 && !gone;
      colO.scale.set(2.72 * grow + 0.16, 46, 2.72 * grow + 0.16);
      colI.scale.set(1.12 * grow + 0.08, 46, 1.12 * grow + 0.08);
      col.outer.uniforms.uA.value = 0.68 * grow * colK * pulse;
      col.inner.uniforms.uA.value = 0.8 * grow * colK * pulse;
      col.outer.uniforms.uHold.value = col.inner.uniforms.uHold.value = 1 - 0.65 * smooth(HOLD[0], HOLD[0] + 0.1, t) * (1 - smooth(HOLD[1], HOLD[1] + 0.2, t));

      const pop0 = smooth(1.8, 2.2, tt);
      stonesM.visible = !gone && pop0 > 0;
      stoneList.forEach((o, i) => {
        const d = tt - o.at;
        if (d < 0) setM(stonesM, i, o.x, o.y + o.s * 0.3, o.z, o.s * pop0 + 0.001, o.s * 0.8 * pop0 + 0.001, o.s * pop0 + 0.001, o.a, o.b, 0);
        else { lift(o.x, o.y + o.s * 0.3, o.z, d, 2.4 + 3.5 * o.h, 1.0 + 0.6 * o.h, 0.8, V); setM(stonesM, i, V.x, V.y, V.z, o.s, o.s * 0.8, o.s, o.a + d * (1.5 + o.h * 2), o.b + d * 1.2, d * 0.9); }
      });
      stonesM.instanceMatrix.needsUpdate = true;

      dust.visible = !gone && tt >= T.release;
      const da = dust.geometry.attributes.aAlpha.array;
      for (let i = 0; i < DUST; i++) {
        const ring = i >= 18, o = ring ? null : stoneList[i];
        const d = tt - (ring ? T.release + 0.05 + 0.06 * (i - 18) : o.at), life = clamp01(d / 2.2);
        if (d < 0 || life >= 1) { setM(dust, i, 0, -50, 0, 0.001); da[i] = 0; continue; }
        const a = (i - 18) * 0.52 + hash(i, 3), rr = 1.6 + 8.5 * life ** 0.7;
        setM(dust, i, ring ? Math.cos(a) * rr : o.x, 0.35 + 1.4 * life + (ring ? 0 : 0.3 * d), ring ? Math.sin(a) * rr : o.z, (ring ? 1.0 : 0.7) + 2.0 * life);
        da[i] = 0.3 * (1 - life) ** 1.4 * smooth(0, 0.12, life) * (1 - smooth(T.dis[0], T.dis[1], tt));
      }
      dust.geometry.attributes.aAlpha.needsUpdate = true; dust.instanceMatrix.needsUpdate = true;

      leavesM.visible = !gone && tt > 1.6;
      leafList.forEach((L, i) => {
        const y = ((L.y - 0.4 * tt * (0.6 + L.h) + 90) % 9) + 0.15, x = ((L.x + 0.55 * tt * (0.5 + L.h) + 400) % 40) - 18;
        const z = L.z + 0.5 * Math.sin(tt * 0.8 + L.a), d = tt - (T.release + 0.05 + 0.025 * Math.hypot(x, z));
        const sc = L.s * smooth(1.6, 2.2, tt) + 0.0005;
        if (d < 0) setM(leavesM, i, x, y, z, sc, sc, sc, L.a + tt * (1 + L.h), L.a * 2 + tt * 0.7, Math.sin(tt * 2 + L.a) * 0.8);
        else { lift(x, y, z, d, 4.5 + 7 * L.h, 1.7 + 0.8 * L.h, 3.2, V); setM(leavesM, i, V.x, V.y, V.z, sc * 1.3, sc * 1.3, sc * 1.3, L.a + d * 5 * (0.5 + L.h), L.a * 2 + d * 3.1, d * 4.2); }
      });
      leavesM.instanceMatrix.needsUpdate = true;

      motes.visible = !gone && tt > 2;
      const ma = motes.geometry.attributes.aAlpha.array;
      for (let i = 0; i < MOTES; i++) {
        const m = moteAtT(i, tt);
        setM(motes, i, m.p[0], m.p[1], m.p[2], m.sc);
        ma[i] = m.a;
      }
      motes.geometry.attributes.aAlpha.needsUpdate = true; motes.instanceMatrix.needsUpdate = true;
      const frame12 = Math.floor(tt * 12) / 12, ta = trail.geometry.attributes.aAlpha.array;
      trail.visible = tt >= T.release && !gone;
      for (let i = 70; i < MOTES; i++) for (let k = 1; k <= 3; k++) {
        const j = (i - 70) * 3 + (k - 1), m = moteAtT(i, frame12 - 0.1 * k);
        setM(trail, j, m.p[0], m.p[1], m.p[2], m.sc);
        ta[j] = m.a * [0.6, 0.35, 0.15][k - 1];
      }
      trail.geometry.attributes.aAlpha.needsUpdate = true; trail.instanceMatrix.needsUpdate = true;

      rings.visible = !gone && tt >= T.release;
      const ra = rings.geometry.attributes.aAlpha.array;
      for (let i = 0; i < 6; i++) {
        const d = tt - (i < 4 ? T.release + 0.22 * i : T.brk + 0.25 * (i - 4)), life = clamp01(d / 1.7);
        if (d < 0 || life >= 1) { setM(rings, i, 0, 0.07, 0, 0.001); ra[i] = 0; continue; }
        setM(rings, i, i >= 4 ? HW.x : 0, 0.08, i >= 4 ? HW.z : 0, 2 * (0.6 + 26 * (1 - (1 - life) ** 2)));
        ra[i] = 0.55 * (1 - life) ** 1.2;
      }
      rings.geometry.attributes.aAlpha.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;

      shardsM.visible = broken && !gone;
      const brk = tt - T.brk;
      for (let i = 0; i < SHARDS; i++) {
        if (!broken) { setM(shardsM, i, 0, -50, 0, 0.001); continue; }
        const a = hash(i, 1) * 6.283, sp = 1.4 + 3.2 * hash(i, 2), e = (1 - Math.exp(-1.2 * brk)) / 1.2;
        const k = (1 - smooth(2.2, 3.4, brk)) * (0.2 + 0.3 * hash(i, 4)) + 0.0005;
        setM(shardsM, i, HW.x + Math.cos(a) * sp * e, arc(HW.y + 0.3, 1.5 + 5 * hash(i, 3), brk), HW.z + Math.abs(Math.sin(a)) * sp * e * 1.1, k, k * 1.2, k, brk * (3 + 5 * hash(i, 5)), brk * 4 * hash(i, 6), brk * 6 * hash(i, 7));
      }
      shardsM.instanceMatrix.needsUpdate = true;

      flecks.visible = !gone && (broken || (dis > 0 && tt < T.dis[1]));
      for (let j = 0; j < FLECKS + EDGE; j++) {
        const f = fleckAt(j, tt);
        if (f) setM(flecks, j, f[0], f[1], f[2], f[3], f[3], f[3], tt * 3 + j, tt * 2, 0);
        else setM(flecks, j, 0, -50, 0, 0.001);
      }
      flecks.instanceMatrix.needsUpdate = true;

      const fa = Math.max(0, 1 - Math.abs(tt - T.release - 0.05) / 0.16) * 0.08 + Math.max(0, 1 - Math.abs(tt - T.brk - 0.04) / 0.16) * 0.14;
      flash.visible = fa > 0.004;
      flashMat.uniforms.uO.value = fa;
    },
    dispose() {
      group.traverse((o) => { o.geometry?.dispose?.(); });
      for (const m of mats) m.dispose();
    },
  };
}
