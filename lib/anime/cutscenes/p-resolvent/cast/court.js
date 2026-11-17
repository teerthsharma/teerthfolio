// CAST of the court for p-resolvent: Aura on her dais, the headless ranks, Fern and Stark on the walls, the Scale of Obedience and the
// soul-light mote. Geometry and the scale pose are the live move's (../live/cast.js, ../live/court.js), driven by tt = beatT(t).
import { Color, Group, Mesh } from "three";
import { T, beatT, smooth } from "../clock.js";
import { AURA, FERN_AT, SCALE_K, STARK_AT, aura, auraFace, fern, scalePieces, soldier, stark } from "../live/cast.js";
import { FOOT, scalePose, setM } from "../live/court.js";
import { celMaterial, hash, inst } from "../live/toon.js";
import { tone } from "../tone.js";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const COL = new Color();
const tint = (m, i, k) => m.setColorAt(i, COL.setRGB(k, k, k * 1.03));

// the shared sway: Aura's hair and cape scale their wind amplitude by uSway (1 at rest)
function swayable(m) {
  const a = "uniform float uTime, uWind;", b = "float amp = 0.12 + uWind * 1.5;";
  if (m.vertexShader.split(a).length !== 2 || m.vertexShader.split(b).length !== 2) throw new Error("p-resolvent cast: the sway patch found no target");
  m.vertexShader = m.vertexShader.replace(a, "uniform float uTime, uWind, uSway;").replace(b, "float amp = (0.12 + uWind * 1.5) * uSway;");
  m.uniforms.uSway = { value: 1 };
  m.needsUpdate = true;
  return m;
}

export function buildCourtCast() {
  const mat = tone(celMaterial()), auraMat = tone(swayable(celMaterial()));
  const sol = soldier();
  const legs = inst(sol.legs, mat, FOOT.length), up = inst(sol.up, mat, FOOT.length);
  const base = FOOT.map((f, i) => 0.88 + 0.22 * hash(i, 9));
  FOOT.forEach((f, i) => { tint(legs, i, base[i]); tint(up, i, base[i]); });

  const auraM = new Mesh(aura(), auraMat);
  const face = auraFace();
  tone(face.material);
  auraM.add(face);
  const fernM = new Mesh(fern(), mat), starkM = new Mesh(stark(), mat);
  const pieces = scalePieces();
  const part = { stem: new Mesh(pieces.stem, mat), beamL: new Mesh(pieces.left, mat), beamR: new Mesh(pieces.right, mat), panL: new Mesh(pieces.pan, mat), panR: new Mesh(pieces.pan, mat) };
  const mote = new Mesh(pieces.mote, mat);
  mote.visible = false;

  const group = new Group();
  group.name = "p-resolvent-court-cast";
  group.add(auraM, fernM, starkM, legs, up, part.stem, part.beamL, part.beamR, part.panL, part.panR, mote);
  for (const o of [auraM, fernM, starkM, legs, up, mote, ...Object.values(part)]) o.frustumCulled = false;

  return {
    group,
    materials: [mat, auraMat, face.material],
    update(t) {
      const tt = beatT(t);
      const gone = smooth(T.dis[0], T.dis[1], tt) * 1.2 >= 1.18;
      group.visible = !gone;

      const pop = smooth(T.aura, T.aura + 0.5, tt) * (1 + 0.2 * Math.sin(Math.PI * clamp01((tt - T.aura) / 0.5)));
      const stag = smooth(T.release + 0.1, T.release + 0.45, tt) * (1 - smooth(8.4, 9.6, tt));
      auraM.position.set(AURA.at[0] + 0.22 * stag, AURA.at[1], AURA.at[2] - 0.4 * stag);
      auraM.rotation.set(-0.1 * stag, AURA.yaw + 0.05 * stag, 0);
      auraM.scale.setScalar(Math.max(0.001, AURA.scale * pop));
      auraMat.uniforms.uSway.value = 1 + 0.8 * smooth(T.release, T.release + 0.1, tt) * (1 - smooth(T.brk + 0.4, T.brk + 0.5, tt));

      for (let i = 0; i < FOOT.length; i++) {
        const f = FOOT[i];
        const a0 = 2.0 + f.r * 0.15 + f.k * 0.015;
        const sc = Math.max(0.001, smooth(a0, a0 + 0.3, tt));
        const k0 = T.kneel + f.r * 0.12 + f.k * 0.03;
        const k = smooth(k0, k0 + 0.5, tt);
        const yaw = Math.atan2(-f.x * 0.5, -f.z) * 0.8;
        const wave = Math.sin(Math.PI * clamp01((tt - (T.release + 0.08 * f.r)) / 0.3));
        const rattle = tt >= T.release && tt < T.release + 1 ? 0.02 * Math.sin(60 * tt + i) : 0;
        const x = f.x + rattle, z = f.z - 0.35 * wave;
        setM(legs, i, x, 0, z, sc, sc * (1 - 0.52 * k), sc, 0, yaw, 0);
        setM(up, i, x, -0.46 * k * sc, z, sc, sc, sc, 0.38 * k - 0.12 * wave, yaw, 0);
        const lit = k > 0.05 && k < 0.95 ? 0.18 : 0;
        tint(legs, i, base[i] + lit);
        tint(up, i, base[i] + lit);
      }
      legs.instanceMatrix.needsUpdate = up.instanceMatrix.needsUpdate = true;
      legs.instanceColor.needsUpdate = up.instanceColor.needsUpdate = true;

      const wall = (k) => Math.max(0.001, smooth(1.9 + k, 2.3 + k, tt));
      const shiver = tt >= T.release && tt < T.release + 0.4 ? 0.03 * Math.sin(50 * tt) : 0;
      fernM.position.set(...FERN_AT);
      fernM.rotation.set(0, 0.25, 0.02 * Math.sin(tt * 1.3) + shiver);
      fernM.scale.setScalar(wall(0.1) * 1.05);
      starkM.position.set(...STARK_AT);
      starkM.rotation.set(0, -0.3, 0.015 * Math.sin(tt * 1.1) + shiver);
      starkM.scale.setScalar(wall(0.3) * 1.1);

      const sp = scalePose(tt);
      const on = tt >= T.scaleIn - 0.1 && !gone;
      for (const k of Object.keys(part)) {
        part[k].visible = on;
        part[k].position.set(...sp[k]);
        part[k].rotation.set(...sp.rot[k]);
        part[k].scale.setScalar(sp.scale[k]);
      }

      const K = SCALE_K, gather = smooth(T.gather, T.release, tt), swell = smooth(T.release, T.release + 0.5, tt);
      const soul = smooth(2.7, 3.1, tt) * (1 - smooth(T.brk, T.brk + 0.15, tt));
      mote.visible = soul > 0.01 && !gone;
      mote.position.set(sp.panL[0], sp.panL[1] + 0.15 * K * sp.sk, sp.panL[2]);
      mote.scale.setScalar(Math.max(0.001, sp.sk * K * (1 + 0.25 * gather + 1.4 * swell)) * (0.88 + 0.12 * Math.sin(tt * 17)));
    },
    dispose() {
      for (const g of [auraM.geometry, face.geometry, fernM.geometry, starkM.geometry, sol.legs, sol.up, pieces.stem, pieces.left, pieces.right, pieces.pan, pieces.mote]) g.dispose();
      for (const m of [mat, auraMat, face.material]) m.dispose();
      group.removeFromParent();
    },
  };
}
