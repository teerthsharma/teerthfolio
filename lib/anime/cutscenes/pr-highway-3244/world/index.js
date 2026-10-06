// WORLD layer for pr-highway-3244 (Fate/Zero, Iskandar: the Gordius Wheel on the sunset speedway). Bible: scripts/pr-highway-3244.md section 3 E1..E8, E22 groundwork, eggs 1 2 3.
// FRAME. The whole world hangs off one root group placed at scene.seal.at and turned by scene.seal.yaw: local +z is the direction of travel,
//   +x the king's left, y up. The chariot stays at the origin; the speedway slides under it (the treadmill, see common.js makeTravel).
// ELEMENTS (one file each):
//   sky.js + skyBody.js   E1 + E2 + egg 3   baked sunset dome: gradient, flat horizon strips, cel clouds, sun, one streak, the Oceanus sea strip   (layer 0)
//   mesas.js              E4                nine painted mesa cards at 380..470 m, 2-tone faces, hard shadow edge, sun-side rim                   (layer 0, parallax 0.1 D)
//   ground.js             E3 + E22          scrolling ochre desert, 3-tone cel, dry brush, hard contact shadows                                    (layer 1)
//   track.js              E5                asphalt, kerbs, dashed lanes, chequered line, launch skid strokes, apron                               (layer 1, rail)
//   stands.js             E6                five 44 m stands and ~1450 flat 2-tone crowd figures, arm wave on the passes                           (layer 1, rail)
//   dressing.js           E7 E8 eggs 1 2    flags, gantry + banner, tyre walls, rocks, cacti, the star cape flag, the tea cart                    (layer 1, rail)
//   motes.js              atmosphere        gold dust motes streaming past, warm horizon haze
// CUES READ (all optional; the bible times are the fallback, the beat wins when scene.beats names it):
//   launch (8.25)  the car starts: treadmill accelerates to 44 m/s in 0.9 s, skid strokes begin
//   slowmo (11.0)  the last-pass slow motion begins (treadmill x 0.38)
//   kachow (11.1)  crowd excite peak
//   cross  (13.7)  the car crosses the chequered line (it is at the world origin exactly then); crowd excite peak; braking starts
//   stop   (15.3)  the car is stopped (line B)
//   cape   (2.4)   the red star flag grows in on the left stand
//   waver  (11.0)  the tea cart appears (gone at 15.3)
import { makeTravel, SUN, sm01 } from "./common.js";
import { buildSky } from "./sky.js";
import { buildMesas } from "./mesas.js";
import { buildGround } from "./ground.js";
import { buildTrack } from "./track.js";
import { buildStands } from "./stands.js";
import { buildDressing } from "./dressing.js";
import { buildMotes } from "./motes.js";

export default function build(ctx) {
  const { THREE, engine, scene } = ctx;
  const root = new THREE.Group();
  const at = scene.seal?.at ?? [0, 0, 0], yaw = scene.seal?.yaw ?? 0;
  root.position.set(at[0], 0, at[2]); root.rotation.y = yaw;

  const travel = makeTravel(scene), zFin = travel.zFin;

  const sky = buildSky(ctx); root.add(sky);
  const mesas = buildMesas(ctx); root.add(mesas.group);
  const ground = buildGround(ctx); root.add(ground.mesh);
  const motes = buildMotes(ctx); root.add(motes.group);

  const rail = new THREE.Group();
  const track = buildTrack(ctx, zFin); rail.add(track.mesh);
  const stands = buildStands(ctx, zFin); rail.add(stands.group);
  const dressing = buildDressing(ctx, zFin); rail.add(dressing.group);
  root.add(rail);
  ctx.setLayer(rail, 1); ctx.setLayer(ground.mesh, 1); ctx.setLayer(motes.group.children[0], 1);

  // sun in world space for the light shafts (restored on dispose)
  const prevSun = engine.sun;
  const sun = new THREE.Vector3(SUN[0], SUN[1], SUN[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  engine.sun = sun.clone().multiplyScalar(700).add(new THREE.Vector3(at[0], 0, at[2]));
  for (const u of [ground.uniforms.uSunW, stands.uniforms.uSunW]) u.value.copy(sun);

  const pulse = (tt, now) => Math.exp(-(((now - tt) / 0.8) ** 2));
  return {
    group: root,
    update(t, dt, cue) {
      const now = cue?.t ?? t;
      const D = travel.D(now);
      rail.position.z = -D;
      mesas.group.position.z = -0.1 * D;
      ground.uniforms.uScroll.value = D;
      track.uniforms.uD.value = D;
      motes.uniforms.uTime.value = t; motes.uniforms.uD.value = D;
      stands.uniforms.uTime.value = t;
      stands.uniforms.uExcite.value = 0.62 + 0.38 * Math.max(pulse(travel.T.kachow, now), pulse(travel.T.cross, now), sm01((now - travel.T.launch) / 1.5) * 0.5);
      dressing.update(t);
    },
    dispose() {
      engine.sun = prevSun ?? null;
      sky.userData?.target?.dispose?.(); sky.geometry?.dispose(); sky.material?.dispose();
      mesas.dispose(); ground.dispose(); motes.dispose(); track.dispose(); stands.dispose(); dressing.dispose();
    },
  };
}
