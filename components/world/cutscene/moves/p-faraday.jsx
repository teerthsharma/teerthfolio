// faraday: A Certain Scientific Railgun. Misaka's coin flick, Academy City at night, drawn as a CYANOTYPE
// BLUEPRINT: Prussian-blue paper, cream technical linework, a drafting grid, construction lines and right-angle
// marks. The pup (a school jacket over it, round head, no ears) stands on the glass substation at the middle of
// the river bridge between the two bushings; Touma doubts at the far end, Kuroko crouches on a lamp post. The
// fields start wrong and settle, state after state, until every arc crosses every ring at a right angle; only
// then does amber rise in the glass. The coin flips and is flicked: a blazing amber railgun tears down the
// bridge along the line the fields cross and burns the drawing (a char line with a glowing rim in the deck, the
// river and the girders). The burn is also why we go home: it spreads from the shot's line across the whole
// sheet, which chars, glows at its edge and falls away, and the real island is under it. The flex, then the
// credit. No post pass: everything is a mesh or a shader. Card: lib/world/cutscene/cards/p-faraday.js.
// Parts: ./p-faraday/ (blue.js the look, scenery.js, world.js, fields.js, figures.js, pup.js, ui.jsx, cache.js).

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Object3D, Quaternion, Vector3 } from "three";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { flashQuad, hash, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { SKY_R } from "./p-faraday/backdrop";
import { U } from "./p-faraday/blue";
import { prewarm, takeWorld } from "./p-faraday/cache";
import { FIELD_T0, SHOT, STOP, amberAt, stopped, updateBeam, updateBits, updateFields } from "./p-faraday/fields";
import { jacket } from "./p-faraday/figures";
import { flipperTip, pupBlue } from "./p-faraday/pup";
import { DECK_Y, TRACK_X, TRACK_Y, TRACK_Z } from "./p-faraday/scenery";
import { mountOverlay } from "./p-faraday/ui";
import { NBULB, NCOLONY, PHI, TOUMA } from "./p-faraday/world";

prewarm();

const CORE_Y = 0.9;
// the clock (s from the arrival); the card's beats put the credit at 17.45 and the collapse at 20.65
const T = { jacket: [0.55, 1.1], coin: 6.6, toss: [11.15, 11.9], flick: 11.95, burn: [12.85, 14.55, 16.65] };
const TURN_TO = 1.5; // the pup's yaw once it faces Touma down the bridge (the kit starts it at 0.6)
const COME = [1.8, 5.2, 7.0, 2.6]; // Touma charges in: leaves at COME[0], arrives at COME[1], from x COME[2] to COME[3]
const BACK = [14.2, 15.5]; // the burn has the sheet: the lens and the pup move to the island side so the pup stays whole
const P = new Vector3();
const U2 = new Vector3();
const AIMV = new Vector3();
const LK = new Vector3();

const V = new Vector3();
const COIN = new Vector3(0.4, 0.9, 0.3);
const QW = new Quaternion();
const QL = new Quaternion();
const O = new Object3D();
const C = new Color();
const BASE = new Color("#cfeeff");
const UPY = new Vector3(0, 1, 0);
const MOON = new Vector3();

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const pup = useRef(null);
  const blue = useRef(null);
  const coat = useRef(null);
  const tip = useRef(null);
  const island = useRef([]);
  const shake = useRef(new Vector3());
  const restored = useRef(false);
  const shown = useRef(0);
  const full = mode === "full";
  const w = useMemo(() => (full ? takeWorld() : null), [full]);
  const flash = useMemo(() => flashQuad("#ffe0a6"), []);

  useEffect(() => {
    const off = mountOverlay(!full);
    if (!full || !w) return off;
    w.bg.rotation.y = PHI;
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    if (p?.root) blue.current = pupBlue(p.root);
    if (p?.rear) {
      coat.current = jacket(p.rear);
      tip.current = flipperTip(p.rear);
    }
    // warm the pup's blueprint programs before the first frame that wears them
    try {
      blue.current?.set(true);
      if (coat.current) coat.current.group.visible = true;
      gl.compile(p.root, camera);
    } catch {
      /* the first frame compiles them instead */
    }
    blue.current?.set(false);
    if (coat.current) coat.current.group.visible = false;
    return () => {
      off();
      coat.current?.dispose();
      tip.current?.dispose();
      blue.current?.dispose();
      coat.current = tip.current = blue.current = null;
      pup.current = null;
      flash.geometry.dispose();
      flash.material.dispose();
      w.dispose();
    };
  }, [full, w, scene, gl, camera, flash]);

  // impacts shake the frame (the world and the pup together), and the pup turns to face the bridge, after Seal.jsx places it
  useFrame((state) => {
    const p = pup.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      blue.current?.set(false);
      if (coat.current) coat.current.group.visible = false;
      return;
    }
    if (!p?.root || !full) return;
    const t = state.clock.elapsedTime - live.arrival.start;
    p.root.position.add(shake.current);
    const s = live.seal;
    const toIsland = Math.atan2(-s.x, -s.z); // facing the island = facing the lens once it stands on the island side
    const yaw = TURN_TO + (toIsland - TURN_TO) * smooth(BACK[0], BACK[1], t);
    p.root.rotation.y += (yaw - 0.6) * smooth(1.0, 2.2, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
  }, -0.5);

  // AFTER THE BURN the bridge's low lens would stare over the moat wall at the island's rim, with the pup a sliver:
  // stand the lens on the island side, level with the pup, so it is whole, upright and centred against the sea
  useFrame((state) => {
    const a = live.arrival;
    const p = pup.current;
    if (!a.id || !full || !p?.root) return;
    const t = state.clock.elapsedTime - a.start;
    const k = smooth(BACK[0], BACK[1], t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    if (k <= 0.001) return;
    const cam = state.camera;
    p.root.getWorldPosition(P);
    U2.set(-P.x, 0, -P.z).normalize();
    AIMV.copy(P).addScaledVector(U2, 7.4).setY(P.y + 1.3);
    LK.copy(P).setY(P.y + 0.75);
    const d = cam.position.distanceTo(P);
    cam.getWorldDirection(V).multiplyScalar(d).add(cam.position);
    V.lerp(LK, k);
    cam.position.lerp(AIMV, k);
    cam.lookAt(V);
  });

  // the coin follows the flipper's tip, in the bridge frame (after the pup is posed)
  useFrame(() => {
    if (!full || !w || !live.arrival.id || !tip.current) return;
    tip.current.tip.getWorldPosition(V);
    w.bg.worldToLocal(COIN.copy(V));
  }, 0.5);

  useCutFrame((t, state, dt) => {
    const s = live.seal;
    const g = rig.current;
    g.visible = full;
    flash.visible = false;
    const c = coat.current;
    if (!full || !w) {
      if (c) c.group.visible = false;
      blue.current?.set(false);
      return;
    }
    const tt = onTwos(t);
    const ts = stopped(t);
    const cam = state.camera;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const f = w.fields;

    // the burn that ends the dimension: a slow glow along the shot's line, then it spreads over the whole sheet
    let away = -99;
    if (t > T.burn[0]) away = t < T.burn[1] ? -0.5 + 7.5 * smooth(T.burn[0], T.burn[1], t) ** 2 : 7 + 132 * smooth(T.burn[1], T.burn[2], t);
    const gone = away > 136;
    U.uAway.value = away;
    U.uTime.value = ts;
    U.uShot.value = SHOT;
    U.uAmber.value = amberAt(t);
    const wind = smooth(SHOT, SHOT + 0.15, ts) * (1 - smooth(SHOT + 1.2, SHOT + 3.2, ts));
    U.uWind.value = wind;
    U.uAng.value += dt * (0.5 + 4.5 * wind);

    // impacts: a shake on twos at the shot and again when the hit-stop lets go
    const hit = (h, k, len) => (t >= h && t < h + len ? k : 0);
    const amp = hit(SHOT, 0.2, STOP + 0.2) + hit(SHOT + STOP + 0.3, 0.05, 0.3);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until the sheet burns
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const sky = w.skyMesh;
    const show = (inside || away > -90) && !gone;
    sky.visible = r > 0.02 && !gone;
    sky.position.set(0, CORE_Y, 0);
    sky.scale.setScalar(show ? SKY_R : Math.max(r, 0.02));
    sky.material.uniforms.uInside.value = inside ? 1 : 0;
    for (const o of w.bg.children) if (o !== sky) o.visible = show;
    // the moon, in the bridge's frame (upper left of the lens)
    sky.material.uniforms.uMoon.value.copy(MOON.set(-0.62, 0.52, -0.58).normalize().applyAxisAngle(UPY, -PHI));

    // THE FIELDS, the right-angle marks, the sparks, the beam
    w.bg.getWorldQuaternion(QW);
    QL.copy(QW).invert().multiply(cam.quaternion);
    updateFields(f, t, QL);
    updateBits(f, t, ts, away > 0 ? T.burn[1] + 1.2 : 0);
    updateBeam(f, ts);
    f.core.visible = f.pool.visible = show && t > 4.85;
    f.arcs.visible = f.rings.visible = f.marks.visible = show && away < 6;

    // the lamps flicker as the fields settle, then steady
    const settling = t > FIELD_T0 && t < 5.3;
    for (let i = 0; i < NBULB; i++) w.bulbs.setColorAt(i, C.copy(BASE).multiplyScalar(settling ? 0.3 + 0.7 * (hash(i, Math.floor(t * 12)) > 0.4 ? 1 : 0.15) : 1));
    if (w.bulbs.instanceColor) w.bulbs.instanceColor.needsUpdate = true;

    // the monorail car passes behind, its windows streaking
    const u = 0.55 - 0.03 * t;
    const du = 0.004;
    w.car.position.set(TRACK_X(u), TRACK_Y, TRACK_Z(u));
    w.car.rotation.y = -Math.atan2(TRACK_Z(u + du) - TRACK_Z(u - du), TRACK_X(u + du) - TRACK_X(u - du));
    w.carMat.uniforms.uOff.value.copy(w.car.position);
    w.carLineMat.uniforms.uOff.value.copy(w.car.position);

    // Touma doubts (a small sway on twos); the shot's wind ruffles hair and tails in the shaders
    const run = smooth(COME[0], COME[1], tt);
    const hitK = smooth(SHOT, SHOT + 0.25, ts) * (1 - smooth(SHOT + 1.1, SHOT + 2.2, ts));
    const tg = w.touma.group;
    TOUMA.x = COME[2] + (COME[3] - COME[2]) * run + 0.8 * hitK - 0.6 * smooth(SHOT - 0.5, SHOT - 0.2, ts) * (1 - hitK);
    TOUMA.y = (run < 1 && run > 0 ? 0.13 * Math.abs(Math.sin(tt * 9)) : 0) + 0.35 * hitK * (1 - hitK);
    tg.position.set(TOUMA.x, TOUMA.y, TOUMA.z);
    tg.rotation.y = Math.atan2(-TOUMA.x, -TOUMA.z);
    tg.rotation.x = 0.2 * Math.sin(Math.PI * run) * (run < 1 ? 1 : 0) - 0.55 * hitK;
    tg.rotation.z = 0.012 * Math.sin(tt * 2.1);
    w.kuroko.group.rotation.z = 0.01 * Math.sin(tt * 2.7 + 1);

    // THE COLONY on the walkway: flinch at the shot, cheer on twos as the wake fades
    const flinch = smooth(SHOT, SHOT + 0.1, ts) * (1 - smooth(SHOT + 0.5, SHOT + 0.9, ts));
    const cheer = smooth(13.55, 13.95, t) * (1 - smooth(16.15, 16.55, t));
    for (let i = 0; i < NCOLONY; i++) {
      const hop = cheer * Math.abs(Math.sin((Math.floor(t * 12) + i * 3) * 0.8)) * 0.22;
      O.position.set(-13 + i * 1.9 - flinch * 0.12, DECK_Y + 0.16 + hop, 2.4 + 0.2 * Math.sin(i * 2.3));
      O.rotation.set(0, Math.PI / 2 + 0.4 * Math.sin(i * 1.7), 0);
      O.scale.set(0.7, 0.7 * (1 - 0.3 * flinch), 0.7);
      O.updateMatrix();
      w.colBody.setMatrixAt(i, O.matrix);
      w.colHull.setMatrixAt(i, O.matrix);
    }
    w.colBody.instanceMatrix.needsUpdate = w.colHull.instanceMatrix.needsUpdate = true;

    // THE COIN: on the flipper's tip, tossed up spinning, flicked down the bridge
    const toss = smooth(T.toss[0], T.toss[1], t);
    const showCoin = show && t > T.coin && ts < SHOT + 0.12 && away < 0;
    w.coin.visible = showCoin;
    if (showCoin) {
      const up = Math.sin(Math.PI * toss) * 2.3;
      const fl = Math.max(0, (ts - T.flick) / 0.12);
      w.coin.position.set(COIN.x + fl * 5, COIN.y + 0.12 + up + 0.2 * fl, COIN.z);
      w.coin.rotation.set(toss * Math.PI * 7, 0, 0.5);
      w.coin.scale.setScalar(1 + 0.4 * Math.max(0, 1 - Math.abs(toss - 0.5) * 3));
    }

    // THE JACKET and the pup's blueprint shading, until the sheet burns round it
    blue.current?.set((inside || tt > tl.bloom[1]) && away < 8 && (t < SHOT || t > SHOT + 1.2));
    if (c) {
      const k = smooth(T.jacket[0], T.jacket[1], tt);
      c.group.visible = k > 0.01 && away < 3;
      c.group.scale.setScalar(Math.max(0.6 + 0.4 * k * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.jacket[0]) / 0.6))), 0.01));
    }

    // the pup: the sign, the coin held before its cheek, the toss, the flick, the recoil at the shot
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.fist = smooth(6.4, 6.8, tt) * (1 - smooth(T.toss[0] - 0.1, T.toss[0] + 0.1, tt)) * out;
    live.pose.raise = smooth(T.toss[0], T.toss[0] + 0.2, tt) * (1 - smooth(T.flick - 0.15, T.flick - 0.05, tt)) * out;
    live.pose.point = smooth(T.flick - 0.1, T.flick, tt) * (1 - smooth(13.15, 13.55, tt)) * out;
    live.pose.fist = Math.max(live.pose.fist, smooth(17.4, 17.8, tt) * (1 - smooth(tl.credit + 3.2, tl.credit + 3.6, tt)) * out); // the flex
    live.pose.sit = smooth(0.4, 1.0, tt) * 1.4 * out; // sits up on its tail: upright, never lying flat
    live.pose.crouch = smooth(SHOT, SHOT + 0.1, ts) * (1 - smooth(SHOT + 0.5, SHOT + 0.9, ts)) * 0.7;

    // THE RETURN: the sheet burns away round the pup and the real island is under it, shown as the front
    // passes the middle of the picture (the rest of the sky burns off over it), never in one frame
    if (away > 70 && !restored.current) {
      restored.current = true;
    }
    // the island comes back a slice per frame (never all at once, which hitched the return)
    if (restored.current && shown.current < island.current.length) {
      const step = Math.ceil(island.current.length / 14);
      for (const o of island.current.slice(shown.current, shown.current + step)) o.visible = true;
      shown.current += step;
    }
    holdFlash(flash, cam, Math.max(0, 1 - Math.abs(t - SHOT - STOP * 0.4) / 0.1) * 0.22);
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={flash} />
      <group ref={rig} visible={false}>
        {w ? <primitive object={w.bg} /> : null}
      </group>
    </>
  );
}
