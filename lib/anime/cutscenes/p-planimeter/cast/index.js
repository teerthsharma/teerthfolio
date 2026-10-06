// CAST layer for p-planimeter ("Checkmate, Reviewer"; Classroom of the Elite, Lerche). Layer 1, redrawn every step.
// Bible: scripts/p-planimeter.md sections E5 E6 E9 E10 and 4.1 4.2 4.3 (the cast), shot list section 5.
//
// WHO (law L6b: every figure is a costumed SEAL, never a silhouette or human):
//   hero      ctx.seal, the locked pup, never restyled. Dressed as Ayanokoji by lifting the shell/hair off a scale-1
//             dresser seal and ctx.seal.attach()-ing them to the body (they ride the pose). A pencil is held, then set down.
//   Reviewer  small seal, Chabashira costume (suit, ponytail, hairpin, olive tsurime eyes, clipboard, green card).
//   Sudo, Horikita  standing Class D seals; 3 seated students.
//
// TIME. The direction layer owns scene.js; a beat named below is read from scene.beats when present (start = beat.t),
// else it falls back to the bible's frame/24 time scaled to the scene length (K = scene.duration / 24.2). Everything is a
// pure function of the stepped clock t, so scrubbing equals playing.
//
// CUE NAMES (free cues, all optional in scene.beats):
//   reviewerTurn clipboard tap1 tap2 smile pencilDown tilt glint sphere victimsLean reviewerFreeze
//   checkmate unfold bow relax bell boardTurn
// FALLBACK TIMES (bible seconds = frame/24): reviewerTurn 2.5, clipboard 3.29, tap1 3.875, tap2 4.375, smile 5.33 (0.5 s),
//   pencilDown 6.2, tilt 6.67, glint 6.9, sphere 6.9, victimsLean 7.33 (0.33 s), reviewerFreeze 7.2, checkmate 8.25,
//   unfold 9.17, bow 13.75, relax 14.08, bell 14.08, boardTurn 18.0.
//
// MATHS (no shader of our own; materials are the shared uber-material via engine.figure):
//   S(a,b,x) = smoothstep over [a,b];   pulse(t,t0,w) = S(t0,t0+w/2,t) * (1 - S(t0+w/2,t0+w,t))
//   shortest-arc yaw lerp: d = ((b - a + 3pi) mod 2pi) - pi ; yaw = a + d S(..)
//   pencil fall: y(t) = y0 - g (t - t0)^2 / 2 clamped 0.45 m ; set-down: lerp hand -> desk with a 0.05 m hop sin(pi u)
//   local->world: P = at + R_y(seal.yaw) (x, y, z) seal.scale,  R_y(a)(x,z) = (x cos a + z sin a, -x sin a + z cos a)
import { REVIEWER, HERO, SUDO, HORIKITA, SEATED, PROPS } from "./costumes.js";

export default function build(ctx) {
  const { THREE, engine, seal, scene, kit, sdf } = ctx;
  const group = new THREE.Group();
  group.name = "p-planimeter-cast";
  const sc0 = scene.duration ? scene.duration / 24.2 : 1;
  const beats = scene.beats ?? [];
  const S = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a))); return u * u * (3 - 2 * u); };
  const pulse = (t, t0, w) => S(t0, t0 + w / 2, t) * (1 - S(t0 + w / 2, t0 + w, t));
  const T = (name, sec) => { const b = beats.find((x) => x.name === name); return b ? b.t : sec * sc0; };
  const D = (name, sec) => { const b = beats.find((x) => x.name === name); return b?.dur ?? sec * sc0; };
  const lerpYaw = (a, b, u) => { const d = ((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; return a + d * u; };

  const disposers = [];
  // rigid cel prop (engine-shared programs), dimensions in the pup's own unit (0.8 = body height)
  const prop = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: 1 })), { lineMul: o.lineMul ?? 0.9, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    disposers.push(() => { f.geometry?.dispose?.(); });
    return f;
  };
  const box = (w, h, d, col, shade, o) => prop(new THREE.BoxGeometry(w, h, d), col, shade, o);
  const cyl = (r0, r1, h, col, shade, o) => prop(new THREE.CylinderGeometry(r0, r1, h, 10), col, shade, o);
  const L1 = (g) => { ctx.setLayer(g, 1); return g; };

  const W = (x, y, z, out = new THREE.Vector3()) => {
    const a = seal.yaw, s = seal.scale, c = Math.cos(a), sn = Math.sin(a);
    return out.set(seal.at[0] + (x * c + z * sn) * s, seal.at[1] + y * s, seal.at[2] + (-x * sn + z * c) * s);
  };
  const FLOOR = scene.cast?.floor ?? 0;        // floor y under the hero's feet, seal-local
  const DESK_Y = scene.cast?.deskTop ?? 0.36;  // desk top height, seal-local
  const tmp = new THREE.Vector3(), hand = new THREE.Vector3(), floorP = new THREE.Vector3();

  // ================================================================ HERO: Ayanokoji (E6, 4.1)
  const dresser = kit.costumedSeal(engine, HERO);
  for (const part of [dresser.shell, dresser.hair]) if (part) { part.parent?.remove(part); seal.attach(part, 1); }
  const tie = new THREE.Group(); // blue tie #1a2fa0/#101f78 on a white shirt V, in front of the blazer column
  tie.add(box(0.05, 0.05, 0.014, PROPS.tie.col, PROPS.tie.shade, { pos: [0, 0.405, 0.318] }),
    box(0.042, 0.17, 0.012, PROPS.tie.col, PROPS.tie.shade, { pos: [0, 0.3, 0.322], rot: [-0.1, 0, 0] }),
    box(0.09, 0.06, 0.01, "#ffffff", "#c3bbb7", { pos: [0, 0.425, 0.306] }));
  seal.attach(tie, 1);
  seal.attach(box(0.07, 0.03, 0.012, "#8a2338", "#591936", { pos: [-0.14, 0.26, 0.33] }), 1); // pocket flap
  const hairU = dresser.hair?.userData?.mat?.uniforms;

  // the pencil: held in the right hand, set down f149 (6.2 s), rolls 0.15 m f152-f166, then lies on the desk
  const pen = new THREE.Group();
  const PN = PROPS.pencil;
  pen.add(cyl(PN.r, PN.r, PN.len, PN.barrel, "#a8741a", { rot: [0, 0, Math.PI / 2] }),
    cyl(0, PN.r, 0.03, PN.tip, PN.tip, { pos: [PN.len / 2 + 0.012, 0, 0], rot: [0, 0, -Math.PI / 2] }),
    cyl(PN.r * 1.1, PN.r * 1.1, 0.02, PN.ferrule, "#8a8a8a", { pos: [-PN.len / 2 - 0.006, 0, 0], rot: [0, 0, Math.PI / 2] }));
  L1(pen); group.add(pen);

  // ================================================================ REVIEWER: Chabashira (E9, 4.2)
  const rv = kit.costumedSeal(engine, { ...REVIEWER, scale: REVIEWER.scale * seal.scale });
  const RV = scene.cast?.reviewer ?? [1.9, FLOOR, -1.4]; // right-behind: off the arc/kill lens lines (stage around the law)
  W(RV[0], RV[1], RV[2], tmp); rv.place(tmp.x, tmp.y, tmp.z, 0);
  const rvBoard = seal.yaw + Math.PI * 0.85;                                             // faces the board
  const rvFace = Math.atan2(seal.at[0] - tmp.x, seal.at[2] - tmp.z);                      // faces the hero
  group.add(rv.group);
  const CB = PROPS.clipboard; // 0.32 x 0.42 m -> 0.22 x 0.3; the "#3396" tag is a coloured chip (no text in the world)
  const clip = new THREE.Group();
  clip.add(box(CB.w, CB.h, CB.d, CB.col, CB.shade), box(0.07, 0.03, 0.02, CB.clip, "#6a1620", { pos: [0, CB.h / 2 - 0.01, 0.012] }),
    box(0.06, 0.035, 0.004, CB.tag, "#6a1620", { pos: [0.04, -0.08, 0.011] }));
  for (let i = 0; i < 4; i++) clip.add(box(CB.w * 0.7, 0.004, 0.004, "#cfd4de", "#cfd4de", { pos: [0, 0.07 - i * 0.04, 0.01], lineMul: 0.2 }));
  const CLIP_UP = [0.2, 0.3, 0.4], CLIP_DOWN = [0.0, 0.2, 0.2]; // chest at shot 2; behind the back at shot 1
  clip.position.set(...CLIP_UP); clip.rotation.set(-0.35, 0.3, 0.1);
  rv.body.add(clip); L1(clip);
  const CD = PROPS.card; // green point card #5efeb6 in the left hand, shot 2 only
  const card = box(CD.w, CD.h, CD.d, CD.col, CD.shade, { pos: [0.3, 0.2, 0.32], rot: [-0.3, 0.2, 0.25] });
  rv.body.add(card); L1(card);
  const pin = new THREE.Group(); // zigzag hairpin #a77de0/#7a4ab8, 3 segments, above the left ear
  for (let i = 0; i < 3; i++) pin.add(box(0.07, 0.014, 0.014, PROPS.pin.col, PROPS.pin.shade, { pos: [0.245 + (i % 2 ? 0.02 : -0.02), 0.66 - i * 0.04, 0.02], rot: [0, 0, (i % 2 ? 1 : -1) * 0.7], lineMul: 0.5 }));
  rv.body.add(pin); L1(pin);
  const mouth = prop(new THREE.SphereGeometry(0.02, 10, 8).scale(1, 1.4, 0.4), "#2a0e12", "#2a0e12", { pos: [0, 0.455, 0.255], lineMul: 0.2 }); // the small dark oval at CHECKMATE
  mouth.visible = false; rv.body.add(mouth); L1(mouth);

  // ================================================================ CLASS D (E10, 4.3)
  const sudo = kit.costumedSeal(engine, { ...SUDO, scale: SUDO.scale * seal.scale });
  const hori = kit.costumedSeal(engine, { ...HORIKITA, scale: HORIKITA.scale * seal.scale });
  const SUDO_AT = scene.cast?.sudo ?? [-2.7, FLOOR, 1.4], HORI_AT = scene.cast?.horikita ?? [-3.1, FLOOR, 3.2];
  W(...SUDO_AT, tmp); sudo.place(tmp.x, tmp.y, tmp.z, seal.yaw + 0.6);
  W(...HORI_AT, tmp); hori.place(tmp.x, tmp.y, tmp.z, seal.yaw + 0.5);
  const horiYaw0 = seal.yaw + 0.5;
  const bow = new THREE.Group(); // Horikita's bow #1030c0
  bow.add(prop(new THREE.ConeGeometry(0.05, 0.1, 8).rotateZ(Math.PI / 2), PROPS.bow.col, PROPS.bow.shade, { pos: [0.055, 0.4, 0.31] }),
    prop(new THREE.ConeGeometry(0.05, 0.1, 8).rotateZ(-Math.PI / 2), PROPS.bow.col, PROPS.bow.shade, { pos: [-0.055, 0.4, 0.31] }),
    prop(new THREE.SphereGeometry(0.025, 8, 6), PROPS.bow.col, PROPS.bow.shade, { pos: [0, 0.4, 0.31] }));
  hori.body.add(bow); L1(bow);
  const stie = box(0.045, 0.14, 0.012, PROPS.tie.col, PROPS.tie.shade, { pos: [0, 0.32, 0.322] }); // Sudo's tie
  sudo.body.add(stie); L1(stie);
  group.add(sudo.group, hori.group);
  const dropPen = pen.clone(true); // Sudo's pencil: in hand until f166, then falls
  L1(dropPen); group.add(dropPen);

  const SEAT_AT = scene.cast?.seated ?? [[-3.4, FLOOR, -0.6], [-3.6, FLOOR, 2.4], [3.3, FLOOR, 2.0]];
  const seated = SEATED.map((spec, i) => { // the three blobs of the old build, now small costumed seals at the side desks
    const s = kit.costumedSeal(engine, { ...spec, scale: spec.scale * seal.scale });
    W(...SEAT_AT[i], tmp); s.place(tmp.x, tmp.y, tmp.z, seal.yaw + (i === 2 ? -0.7 : 0.6));
    group.add(s.group); return s;
  });
  const crowd = [sudo, hori, ...seated];
  const hasSitTrack = (scene.seal?.track ?? []).some((e) => e.pose === "sit");

  function update(t, dt) {
    const tCm = T("checkmate", 8.25), tBell = T("bell", 14.08), tSph = T("sphere", 6.9), tGl = T("glint", 6.9);

    // ---------- hero: base sit 0.8 (unless the track drives it), blink every 4.2 s (2 frames), 3 degree tilt, hair stir at shot 5
    if (!hasSitTrack) seal.setPose("sit", 0.8);
    seal.setPose("blink", (t % 4.2) < 1 / 6 ? 1 : 0);
    const tTilt = T("tilt", 6.67);
    if (dresser.hair) {
      dresser.hair.rotation.z = -0.052 * S(tTilt, tTilt + 0.3, t); // 3 degrees
      dresser.hair.rotation.x = 0.012 * Math.sin(t * 40) * pulse(t, tCm - 0.1, 0.9); // shot 5: unmoved, only the hair stirs
    }
    if (hairU && hairU.uTint) { // sunset push #d16f2a on the auburn at the golden bookends, off in the green/blue middle
      hairU.uTint.value.set("#d16f2a");
      hairU.uTintAmt.value = 0.18 * (1 - S(tSph, tSph + 0.2, t) * (1 - S(tBell, tBell + 0.5, t)));
    }
    engine.syncFaces(seal.group);

    // ---------- hero pencil: hand -> desk at f149, rolls 0.15 m to f166
    const tDown = T("pencilDown", 6.2);
    W(0.3, 0.24, 0.34, hand);
    W(0.42 + 0.15 * S(tDown + 0.12, tGl, t), DESK_Y + 0.012, 0.55, floorP);
    const down = S(tDown, tDown + 0.3, t);
    pen.position.lerpVectors(hand, floorP, down);
    pen.position.y += 0.05 * Math.sin(Math.PI * down);
    pen.rotation.set(0, seal.yaw - 0.2, 0.9 * (1 - down));
    pen.scale.setScalar(seal.scale);

    // ---------- Reviewer
    const tTurn = T("reviewerTurn", 2.5), tClip = T("clipboard", 3.29), tTap1 = T("tap1", 3.875), tTap2 = T("tap2", 4.375);
    const tSm = T("smile", 5.33), dSm = D("smile", 0.5), tFz = T("reviewerFreeze", 7.2), tFold = T("unfold", 9.17), tBow = T("bow", 13.75), tBoard = T("boardTurn", 18.0);
    const yawTurn = lerpYaw(rvBoard, rvFace, S(tTurn, tTurn + 0.55, t));
    rv.group.rotation.y = lerpYaw(yawTurn, rvBoard, S(tBoard, tBoard + 1.0, t));
    const up = S(tClip - 0.2, tClip + 0.25, t), fz = S(tFz, tFz + 0.1, t) * (1 - S(tCm, tCm + 0.05, t));
    clip.position.set(
      CLIP_DOWN[0] + (CLIP_UP[0] - CLIP_DOWN[0]) * up,
      CLIP_DOWN[1] + (CLIP_UP[1] - CLIP_DOWN[1]) * up - (0.04 / 0.9) * S(tFz, tFz + 0.15, t),
      CLIP_DOWN[2] + (CLIP_UP[2] - CLIP_DOWN[2]) * up);
    const tap = pulse(t, tTap1, 1 / 6) + pulse(t, tTap2, 1 / 6); // taps on twos
    clip.position.y -= 0.03 * tap; clip.rotation.set(-0.35 - 0.1 * tap, 0.3, 0.1);
    clip.visible = up > 0.01 && t < tFold;
    card.visible = up > 0.01 && t < tGl;
    rv.body.rotation.z = 0.105 * S(tClip, tClip + 0.4, t) * (1 - S(tSph, tSph + 0.3, t)); // head tilt -6 degrees while reading
    // expression: calm flat line; thin smile only on the emoji line; terror at the freeze and CHECKMATE; neutral at the end
    const smile = pulse(t, tSm, dSm * 2) * 0.4;
    const cm = S(tCm, tCm + 0.15, t) * (1 - S(tCm + 0.7, tCm + 1.1, t));
    if (cm > 0.01) rv.expression("terror", cm);
    else if (fz > 0.01) rv.expression("terror", 0.35 * fz);
    else if (smile > 0.01) rv.expression("smug", smile);
    else rv.expression("calm", 0.3 * (1 - S(tBell, tBell + 0.3, t)));
    const eyeS = 1 - 0.3 * fz; // eyes shrink to 70% at f173, full again at CHECKMATE
    for (const e of rv.eyes?.userData.eyes ?? []) e.scale.setScalar(eyeS);
    // recoil 0.18 m and 12 degrees in 6 frames at f198, held, relaxing into the arms-folded half bow at f330
    rv.setPose("recoil", 0.9 * S(tCm, tCm + 0.25, t) * (1 - S(tCm + 1.2, tCm + 2.2, t)));
    rv.setPose("bow", 0.55 * S(tBow, tBow + 0.5, t) * (1 - S(tBow + 0.7, tBow + 1.4, t)));
    mouth.visible = cm > 0.3;
    // glints and glow ride the shared tint uniforms: crown gloss flashes once at CHECKMATE; the corpus glow rims her suit (#b0fff9)
    const hu = rv.hair?.userData?.mat?.uniforms;
    if (hu?.uTint) { hu.uTint.value.set("#ffffff"); hu.uTintAmt.value = 0.35 * pulse(t, tCm + 0.05, 1 / 12); }
    const su = rv.shell?.userData?.mat?.uniforms;
    if (su?.uTint) { su.uTint.value.set("#b0fff9"); su.uTintAmt.value = 0.12 * S(tSph, tSph + 0.2, t) * (1 - S(tCm - 0.1, tCm, t)); }
    if (rv.hair) rv.hair.rotation.z = 0.06 * Math.sin(t * 3.8) * S(tBoard, tBoard + 1, t) + 0.01 * Math.sin(t * 1.9); // ponytail sway at the end
    rv.update(t, dt);

    // ---------- Class D: lean back 0.1 m at the sphere (f176-f184), hold through CHECKMATE, relax at the bell, Horikita looks at the hero f340
    const tLean = T("victimsLean", 7.33), dLean = D("victimsLean", 0.33), tRelax = T("relax", 14.08);
    const lean = S(tLean, tLean + dLean, t) * (1 - S(tRelax, tRelax + 0.5, t));
    for (const v of crowd) { v.setPose("recoil", 0.7 * lean); v.expression("terror", 0.6 * lean); } // recoil z -0.14 m x 0.7 = 0.1 m
    for (const [i, v] of seated.entries()) { v.setPose("bow", 0.28 + 0.04 * Math.sin(t * 0.8 + i)); v.setPose("recoil", 0.56 * lean); } // slumped over the desk
    hori.group.rotation.y = lerpYaw(horiYaw0, Math.atan2(seal.at[0] - hori.group.position.x, seal.at[2] - hori.group.position.z), S(tBell + 0.1, tBell + 0.6, t));
    // Sudo's pencil: in the right hand until f166, then falls (g = 9.8, 0.45 m max) and lies still
    const fall = Math.max(0, t - tGl);
    sudo.group.updateMatrixWorld();
    hand.set(0.28, 0.2, 0.34).applyMatrix4(sudo.group.matrixWorld);
    dropPen.position.set(hand.x + 0.04 * Math.min(1, fall * 3), Math.max(sudo.group.position.y + 0.02, hand.y - Math.min(0.45, 4.9 * fall * fall)), hand.z);
    dropPen.rotation.set(0, sudo.group.rotation.y, 0.9 - 0.9 * S(tGl, tGl + 0.4, t) + 0.3 * Math.min(1, fall * 4));
    dropPen.scale.setScalar(sudo.scale);
    for (const v of crowd) v.update(t, dt);
    for (const [i, v] of crowd.entries()) v.body.position.y += 0.004 * Math.sin(t * 2.2 + i * 1.7) * (1 - 0.7 * lean); // breath on twos
  }

  return {
    group,
    update,
    dispose() {
      for (const d of disposers) { try { d(); } catch { /* shared */ } }
      for (const v of [rv, sudo, hori, dresser, ...seated]) { try { v.dispose(); } catch { /* ignore */ } }
    },
  };
}
