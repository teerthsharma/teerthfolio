// WORLD layer for p-caustic (Madara's war plain and the Limbo moon). The protected Madara palette; the Susanoo is NOT here
// (cast/fx own it, the world only gives it the cold light wrap on the ground, the one coloured bounce in the war).
// Elements, one file each: sky.js (baked dome + live limbo/halo/tear/shatter), moon.js (tomoe moon, cracks, shards),
// ground.js (cracked plain, ridge, craters, crack web, break), rubble.js (rocks + debris + contact shadows),
// dust.js (impact plumes), giant.js (ref 03 rock giant egg), motes.js (120 dust motes), common.js (palette, cues, GLSL).
// Cues read (beat name, fallback bible time): limbo .3, rise 1.7, cast 3.3, tear 3.45, hit1 4.7, meteor2 4.85,
// crack 5.45, impact 6.42, break 6.6. A beat of that name wins; otherwise the bible time is used.
// Frame: the war is built with the seal at the origin facing -z, then rotated/scaled/moved onto the real seal
// (scene.seal.at / yaw / scale), so the army is always in front of the seal.
import { buildSky } from "./sky.js";
import { buildMoon } from "./moon.js";
import { buildGround } from "./ground.js";
import { buildRubble } from "./rubble.js";
import { buildDust } from "./dust.js";
import { buildGiant } from "./giant.js";
import { buildSukunaVolume } from "./sukuna-volume.js";
import { buildManhwaGrain } from "./manhwa-grain.js";
import { buildMotes } from "./motes.js";
import { GEO } from "./common.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const sd = ctx.scene.seal ?? {};
  const S = sd.scale ?? 1, yaw = (sd.yaw ?? 0) + Math.PI, at = new THREE.Vector3(...(sd.at ?? [0, 0, 0]));
  const group = new THREE.Group();            // unrotated: billboards (moon, giant) live here
  const war = new THREE.Group();              // war space: -z is where the seal faces
  war.rotation.y = yaw; war.position.copy(at); war.scale.setScalar(S);
  group.add(war);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const env = { S, yaw, at, war, toWorld: (v) => v.clone().multiplyScalar(S).applyQuaternion(q).add(at) };
  const state = { moonPos: new THREE.Vector3(...GEO.MOON_WIDE) };

  // [module, parent]: billboards cannot sit under the rotated war group
  const mods = [
    [buildMoon(ctx, env), group], [buildSky(ctx, env), war], [buildGround(ctx, env), war],
    [buildRubble(ctx, env), war], [buildDust(ctx, env), war], [buildGiant(ctx, env), group],
    [buildSukunaVolume(ctx, env), group], [buildManhwaGrain(ctx), group], [buildMotes(ctx, env), war],
  ];
  const giant = mods[5][0];
  giant.obj.position.copy(env.toWorld(new THREE.Vector3(46, 14, -42)));
  for (const [m, parent] of mods) for (const o of [].concat(m.obj)) parent.add(o);

  return {
    group,
    update(t, dt, cue) {
      for (const [m] of mods) m.update(t, dt, cue, state);
    },
    dispose() { for (const [m] of mods) m.dispose?.(); },
  };
}
