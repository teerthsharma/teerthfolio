// CAST layer for pr-mujoco-warp-1541 (Dragon Ball Z, Frieza). Layer 1.
// The hero is the locked seal (ctx.seal; only eye-squash, shudder and one smear frame are driven here, never restyled). Everyone
// else is a small costumed SEAL (L6b): eight Frieza Force soldiers A-H, the commander, his hover pod, scouters with a number
// strip, the horned coral shell around the hero (peeled off the camera sightline so the seal is never covered), the popped lens.
//
// CUES READ as scene DATA (ctx.scene.beats), so scrubbing equals playing; each falls back to the bible's frame (24 fps):
//   "crack"  (f168 = 7.0 s)  the shell vanishes, the ring blows the field outward
//   "hop"    (crack + 12 f)  the hero's smear frame
//   "recoil" (f90 = 3.75 s)  soldier A starts to recoil, B..H follow 2 frames apart
//   "forest" (crack + 32 f)  the victims sit up and watch (f200 onward)
// No Math.random anywhere: ctx.rng only.
import { soldierSpec, commanderSpec, SOLDIER_COUNT } from "./costumes.js";
import { makeAtlas, addScouter } from "./scouter.js";
import { buildShell } from "./shell.js";

const F = (f) => f / 24;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, t) => { const x = clamp01((t - a) / Math.max(1e-6, b - a)); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const { THREE, engine, kit, sdf, scene } = ctx;
  const group = new THREE.Group();
  const beat = (name, dflt) => scene.beats?.find((b) => b.name === name)?.t ?? dflt;
  const CR = beat("crack", F(168));
  const HOP = beat("hop", CR + F(12));
  const REC0 = beat("recoil", F(90));
  const SIT = beat("forest", CR + F(32));
  const SHELL0 = F(72), SHELL1 = F(100);
  const SEAL0 = ctx.seal.at.slice();
  const FC = [SEAL0[0] + 0.9, SEAL0[1], SEAL0[2] - 1.6]; // floor centre (0.9, 0.03, -1.6) in the figure frame
  const facing = (x, z) => Math.atan2(SEAL0[0] - x, SEAL0[2] - z);

  // ----------------------------------------------------------- soldiers: 8, 45 degrees apart, r 4.6 m round the floor centre
  const atlas = makeAtlas(THREE);
  const texSold = atlas?.tex(0), texCmd = atlas?.tex(0), texCrack = atlas?.tex(8), texStar = atlas?.tex(9);
  const soldiers = [];
  for (let i = 0; i < SOLDIER_COUNT; i++) {
    const a = (i + 0.5) * (Math.PI / 4), x = FC[0] + 4.6 * Math.sin(a), z = FC[2] + 4.6 * Math.cos(a);
    const seal = kit.costumedSeal(engine, soldierSpec(i));
    const s = { seal, i, x, z, rad: [Math.sin(a), Math.cos(a)], yaw: facing(x, z), flips: i === 2 || i === 5, scouter: null };
    if (i < 6) s.scouter = addScouter(ctx, seal, atlas, { size: 1, side: 1, digitTex: texSold, crackTex: texCrack, starTex: texStar }); // scouter on 6, spears on G H
    seal.place(x, FC[1], z, s.yaw);
    group.add(seal.group);
    soldiers.push(s);
  }

  // ----------------------------------------------------------- commander and pod
  const cmd = kit.costumedSeal(engine, commanderSpec);
  const pf = (geo, col, shade, line = 1.1) => engine.figure(sdf.painted(geo, sdf.paint(col, shade, { line })), { lineMul: 0.9, constant: true });
  for (const side of [1, -1]) { // shoulder domes #c590f0 with gold trim; horn stubs on the SHOULDERS, never on the head
    const dome = pf(new THREE.SphereGeometry(0.11, 14, 8).scale(1, 0.75, 1), "#c590f0", "#7a3fb8");
    dome.position.set(side * 0.31, 0.47, 0);
    const trim = pf(new THREE.TorusGeometry(0.11, 0.012, 6, 18).rotateX(Math.PI / 2), "#ffd84a", "#b8741a", 1);
    trim.position.set(side * 0.31, 0.43, 0);
    const horn = pf(new THREE.ConeGeometry(0.04, 0.17, 8).translate(0, 0.085, 0), "#efe6f2", "#9b86c4", 1);
    horn.position.set(side * 0.33, 0.52, -0.02);
    horn.rotation.z = -side * 0.5;
    cmd.props.add(dome, trim, horn);
  }
  const cmdScouter = addScouter(ctx, cmd, atlas, { size: 1.25, side: 1, digitTex: texCmd, crackTex: texCrack, starTex: texStar });
  const cmdBase = [FC[0] - 3.9, FC[2] - 4.4]; // 6 m behind the hero, camera-left
  const cmdYaw = facing(cmdBase[0], cmdBase[1]);
  cmd.place(cmdBase[0], FC[1], cmdBase[1], cmdYaw);
  group.add(cmd.group);
  const pod = new THREE.Group(); // the hover pod 0.5 m, white and purple
  pod.add(pf(new THREE.SphereGeometry(0.25, 20, 12).scale(1, 0.7, 1), "#efe6f2", "#9b86c4", 1.2));
  const ring = pf(new THREE.TorusGeometry(0.26, 0.035, 8, 26).rotateX(Math.PI / 2), "#7a3fb8", "#4a2878", 1.1);
  ring.position.y = -0.04;
  const cap = pf(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#ffd84a", "#b8741a", 1);
  cap.position.y = 0.14;
  pod.add(ring, cap);
  pod.userData.layer = 1;
  group.add(pod);
  const lensFly = pf(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16).rotateX(Math.PI / 2), "#7be07a", "#3fb870", 1); // the popped lens
  lensFly.userData.layer = 1;
  lensFly.visible = false;
  group.add(lensFly);

  // ----------------------------------------------------------- the horned shell
  const shell = buildShell(ctx);
  group.add(shell.group);

  // ----------------------------------------------------------- occlusion guard: nothing stands between the lens and the seal
  // p = the figure's centre; if it lies within `rad` of the camera->chest segment it is pushed sideways (xz) off the sightline
  const chest = new THREE.Vector3(), cam = new THREE.Vector3(), dv = new THREE.Vector3(), qv = new THREE.Vector3(), cl = new THREE.Vector3();
  function guard(x, y, z, rad) {
    cam.copy(ctx.player.camera.position);
    ctx.seal.chest(chest);
    dv.copy(chest).sub(cam);
    const u = qv.set(x, y, z).sub(cam).dot(dv) / Math.max(1e-6, dv.lengthSq());
    if (u < 0.02 || u > 1) return [0, 0];
    cl.copy(cam).addScaledVector(dv, u);
    const vx = x - cl.x, vz = z - cl.z, len = Math.hypot(vx, y - cl.y, vz);
    if (len > rad) return [0, 0];
    const h = Math.hypot(vx, vz) || 1, push = rad - len + 0.05;
    return [(vx / h) * push, (vz / h) * push];
  }

  const hero = ctx.seal, hu = hero.fig.userData.mat.uniforms;
  const power = (t) => sm(F(72), CR, t);
  const digitAt = (t, c) => (c >= 0 ? 6 : t >= F(144) ? 5 : Math.min(4, Math.floor(sm(F(72), F(144), t) * 4.999))); // 1.0 .. 1.4, blur, ERR

  function soldier(s, t) {
    const sl = s.seal, tR = REC0 + s.i * F(2), c = t - CR, r = s.rad;
    let ox = 0, oz = 0, yawAdd = 0, kind = null, k = 0, expr = "neutral", ek = 0;
    if (t >= tR && c < 0) { // stagger back 0.3 m; squint at f96, flippers over the eyes (eyes shut) in the escalation
      k = sm(tR, tR + 0.5, t);
      kind = "recoil";
      ox += r[0] * 0.3 * k; oz += r[1] * 0.3 * k;
      expr = t < F(144) ? "calm" : "shut";
      ek = sm(tR, tR + 0.4, t);
    }
    if (c >= 0) { // the ring pushes them out 0.6 m along the radial in 6 frames
      const push = 0.3 + 0.6 * sm(0, F(6), c);
      ox += r[0] * push; oz += r[1] * push;
      if (s.flips) { // two flip backward, then lie fallen
        const kb = sm(0, 0.8, c);
        kind = c < 0.9 ? "blown" : "fallen";
        k = c < 0.9 ? kb : 0.1 + 0.9 * sm(0.9, 1.3, c);
        ox += r[0] * kb; oz += r[1] * kb;
        yawAdd = Math.PI * 1.5 * kb;
        expr = c < 0.9 ? "terror" : "shut";
      } else { // six land on their tail (a kneeling sink), cartoon-wide O
        kind = "kneel"; k = sm(0, 0.5, c); expr = "terror";
      }
      ek = 1;
      if (t >= SIT) { // f200-f270 sit up and watch the diagonal rise; slack jaw by f230
        const w = sm(SIT, SIT + 0.4, t);
        kind = "kneel"; k = s.flips ? 0.55 : 0.55 + 0.1 * (1 - w);
        expr = t < CR + F(62) ? "awe" : "sad";
        yawAdd *= 1 - w;
      }
    }
    if (kind) sl.react(kind, k); else sl.react("recoil", 0);
    sl.expression(expr, ek);
    const [gx, gz] = guard(s.x + ox, FC[1] + 0.25, s.z + oz, 0.65);
    sl.place(s.x + ox + gx, FC[1], s.z + oz + gz, s.yaw + yawAdd);
    sl.update(t);
    const sc = s.scouter;
    if (sc) { // digits tick up, blur, the 4-frame fracture overlay (it then stays), a 4-point star on the lens at the flash
      sc.digit(digitAt(t, c));
      sc.crack(c >= 0);
      sc.star(c >= 0 && c < F(6), 1 - c / F(6));
      if (s.i === 3 && c >= F(4)) sc.pop(); else if (s.i === 3) sc.unpop();
    }
  }

  function commander(t) {
    const c = t - CR;
    let kind = null, k = 0, expr = "smug", ek = 1, ox = 0, oz = 0, yaw = cmdYaw;
    if (t < F(60)) { // arms-folded boast; a flinch at the floor's line
      if (t > 1.5 && t < 2.0) { kind = "recoil"; k = 0.3 * Math.sin(Math.PI * sm(1.5, 2.0, t)); }
    } else if (c < 0) { // f72-f144 eyes narrow, one flipper rises; then eyes widen toward the crack
      const a = sm(F(72), F(144), t);
      kind = "recoil"; k = 0.5 * a;
      expr = a > 0.5 ? "calm" : "smug"; ek = Math.max(0.5, a);
      if (t > F(144)) { expr = "terror"; ek = sm(F(144), CR, t); }
    } else { // blown back 1.2 m, spinning; on his back with a cracked scouter; star-eyes by f240; sits up and stares at f276
      const b = sm(0, 0.8, c);
      ox = -0.5 * 1.2 * b; oz = -0.86 * 1.2 * b;
      yaw += Math.PI * 4 * (1 - (1 - b) * (1 - b));
      if (c < 1.0) { kind = "blown"; k = b; expr = "terror"; } else { kind = "fallen"; k = 0.1 + 0.9 * sm(1.0, 1.4, c); expr = t > F(240) ? "awe" : "terror"; }
      if (t >= F(276)) { kind = "kneel"; k = Math.max(0.45, 1 - 0.55 * sm(F(276), F(276) + 0.5, t)); expr = "awe"; yaw = cmdYaw; }
    }
    if (kind) cmd.react(kind, k); else cmd.react("recoil", 0);
    cmd.expression(expr, ek);
    const [gx, gz] = guard(cmdBase[0] + ox, FC[1] + 0.3, cmdBase[1] + oz, 0.8);
    cmd.place(cmdBase[0] + ox + gx, FC[1], cmdBase[1] + oz + gz, yaw);
    cmd.update(t);
    let n = digitAt(t, c);
    if (t >= F(160) && t < F(163)) n = 7; // the lens text '484' flashes once at f160
    cmdScouter.digit(n);
    cmdScouter.crack(c >= 0);
    cmdScouter.star(c >= 0 && c < F(6), 1 - c / F(6));
    // the pod stands beside him f0-f60 and returns f200-f270; it bobs on the stepped clock
    const podOn = t < F(66) ? 1 - sm(F(60), F(66), t) : sm(CR + F(32), CR + F(40), t);
    pod.visible = podOn > 0.01;
    pod.scale.setScalar(Math.max(0.001, podOn));
    pod.position.set(cmdBase[0] + 0.9, FC[1] + 0.3 + 0.03 * Math.sin(t * 5), cmdBase[1] + 0.2);
    pod.rotation.y = Math.sin(t * 1.3) * 0.3;
  }

  const D = soldiers[3]; // the popped lens flies ballistic from victim D at f172
  function popLens(t) {
    const p = t - (CR + F(4));
    lensFly.visible = p >= 0 && p < 1.4;
    if (!lensFly.visible) return;
    const r = D.rad;
    lensFly.position.set(D.x + r[0] * (0.3 + 1.8 * p), FC[1] + 0.3 + 2.6 * p - 3.0 * p * p, D.z + r[1] * (0.3 + 1.8 * p));
    lensFly.rotation.set(p * 14, p * 9, 0);
  }

  return {
    group,
    update(t) {
      // the hero (locked): eye squash in the shell, open on the crack frame, soft after the landing; shudder; one smear frame
      const pw = power(t), eye0 = hu.uFace.value.w;
      let eyeK = 1;
      if (t >= F(72) && t < CR) eyeK = 1 - 0.4 * sm(F(72), F(96), t);
      else if (t >= CR && t < CR + F(2)) eyeK = 1.25;
      else if (t >= CR + F(28)) eyeK = 0.9;
      hu.uFace.value.w = eye0 * eyeK;
      if (t >= F(93) && t < CR) hero.group.position.x += Math.sin(t * 70) * 0.035 * pw;
      if (t >= HOP && t < HOP + F(4)) hero.group.scale.multiply(new THREE.Vector3(0.9, 1.25, 0.9));
      shell.update({ t, vis: t >= SHELL0 && t < CR, gs: sm(SHELL0, SHELL1, t), power: pw, crackGlow: sm(F(144), CR, t), yaw: 0.3 * Math.sin(t * 1.4) });
      for (const s of soldiers) soldier(s, t);
      commander(t);
      popLens(t);
    },
    dispose() {
      for (const s of soldiers) s.seal.dispose();
      cmd.dispose();
      shell.dispose();
      group.traverse((o) => { o.geometry?.dispose?.(); });
      for (const tx of [texSold, texCmd, texCrack, texStar]) tx?.dispose?.();
    },
  };
}
