// The live driver of the picture: the sky shell, light, cord, loops, knot, comets, ripples, sparkles, ghosts and title, ported function for function from components/world/cutscene/moves/p-tangle.jsx (useCutFrame) in the rig frame (no turn, no pose).
import { Vector3 } from "three";
import { DOCK, HOLD, LINE, REST, T, smooth, warp } from "../clock.js";
import { EYE, skyPos } from "../live/fx.js";
import { GIRL_HAND } from "../live/girl.js";
import { WATER_Y } from "../live/land.js";

const ss = smooth;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const R = 0.85, SKYD = 170;
const DOCKV = new Vector3(...DOCK), CL = new Vector3(...REST.CL), PA = new Vector3(...REST.PA);
const V = new Vector3(), V2 = new Vector3(), TIE = new Vector3(), HAND = new Vector3(), P1 = new Vector3(), P2 = new Vector3();
const T1 = new Vector3(), T2 = new Vector3(), A0 = new Vector3(), B0 = new Vector3(), CAv = new Vector3(), CAr = new Vector3();
const CBr = new Vector3(), CBv = new Vector3(), BP1 = new Vector3(), BP2 = new Vector3(), NA = new Vector3(), U0 = new Vector3();
const W0 = new Vector3(), E1 = new Vector3(), E2 = new Vector3(), EYEV = new Vector3(EYE[0], EYE[1], EYE[2]);
const SUN = new Vector3(), AUP = new Vector3(0, 1, 0), FWD = new Vector3(), CF = new Vector3(), CR = new Vector3(), CU = new Vector3();
const CDIR = new Vector3(), HEAD0 = new Vector3(), FALLTO = new Vector3(), TAIL2 = new Vector3(), TAILD = new Vector3(-0.62, 0.42, 0.18).normalize();

const cubic = (a, b, c, d, t, out) => {
  const s = 1 - t;
  return out.set(0, 0, 0).addScaledVector(a, s * s * s).addScaledVector(b, 3 * s * s * t).addScaledVector(c, 3 * s * t * t).addScaledVector(d, t * t * t);
};
const dirTo = (az, el, out) => skyPos(az, el, 1, out).sub(EYEV);

function loopFrame() {
  V.copy(EYEV).sub(CL).normalize();
  W0.copy(V).addScaledVector(PA, -V.dot(PA)).normalize();
  U0.crossVectors(W0, PA).normalize();
  E1.copy(U0).add(W0).multiplyScalar(Math.SQRT1_2);
  E2.copy(U0).sub(W0).multiplyScalar(Math.SQRT1_2);
  NA.crossVectors(PA, E1).normalize();
}

export function makeDrive(ctx, W, group) {
  const U = W.U, o = W.o, st = { inside: false, dis: 0, revealed: false };
  loopFrame();
  return {
    state: st,
    update(rt) {
      const t = warp(rt), cam = ctx.player.camera, inHold = rt >= HOLD.t[0] && rt <= HOLD.t[1];
      W.root.visible = t < T.dis[1] + 0.2;
      const r = LINE.radius * ss(LINE.bloom[0], LINE.bloom[1], rt) * (1 - ss(LINE.collapse[0], LINE.collapse[1], rt));
      V.set(DOCK[0], 0.9, DOCK[2]);
      const inside = r > cam.position.distanceTo(V) + 0.3;
      o.sky.visible = r > 0.02 && t < T.dis[1];
      o.sky.scale.setScalar(inside ? 200 : Math.max(r, 0.02));
      o.sky.position.set(0, inside ? 0 : 0.9, 0);
      W.sky.m.uniforms.uInside.value = inside ? 1 : 0;
      for (const k of ["terrain", "lake", "shrine", "girl", "knotGroup"]) o[k].visible = inside;
      for (const m of [W.trees, W.boulders, W.reeds, W.town.hm, W.town.win, W.shide, W.ghosts.mesh, W.fire.mesh, W.lakeGlints.mesh, W.airGlints.mesh, W.burst.mesh]) m.visible = inside;
      for (const c of W.comets) c.ribbon.visible = c.head.visible = inside;
      const dusk = ss(T.dusk[0], T.dusk[1], t), dis = ss(T.dis[0], T.dis[1], t);
      U.uTime.value = t;
      U.uTw.value = dusk;
      U.uDis.value = dis;
      U.uKeep.value = ss(16.4, 18.0, t);
      SUN.set(0.17, lerp(0.012, -0.3, ss(T.dusk[0], 16.2, t)), -0.98).normalize();
      U.uSun.value.copy(SUN);
      W.lake.m.uniforms.uTurn.value = 0;

      const tie = ctx.cast?.tie;
      if (tie) TIE.copy(tie).sub(DOCKV);
      else TIE.set(-0.2, 0.9, 0.4);

      const gvis = ss(T.girl[0], T.girl[1], t) * (1 - ss(T.girlOut[0], T.girlOut[1], t));
      W.girl.m.uniforms.uVis.value = gvis;
      o.girl.visible = inside && gvis > 0.01;
      o.girl.rotation.z = 0.012 * Math.sin(t * 0.8);
      HAND.set(GIRL_HAND[0] * 2.1, GIRL_HAND[1] * 2.1, GIRL_HAND[2] * 2.1).add(W.girlAt);
      HAND.y += 0.03 * Math.sin(t * 1.3);
      const shock = ss(T.pull[0], T.pull[1], t) * (1 - ss(10.2, 10.9, t));

      const taut = ss(T.pull[0], T.pull[1] + 0.2, t) * (1 - ss(T.retract[0], T.retract[0] + 0.5, t) * 0.6);
      const dx = HAND.x - TIE.x, dz = HAND.z - TIE.z;
      P1.set(TIE.x + dx * 0.3 + 2.4, WATER_Y + 0.12, TIE.z + dz * 0.3);
      P2.set(TIE.x + dx * 0.68 - 2.8, WATER_Y + 0.1, TIE.z + dz * 0.68);
      V.copy(HAND).sub(TIE);
      P1.lerp(T1.copy(TIE).addScaledVector(V, 1 / 3), taut);
      P2.lerp(T2.copy(TIE).addScaledVector(V, 2 / 3), taut);
      const su = W.strand.U;
      su.uP0.value.copy(TIE);
      su.uP1.value.copy(P1);
      su.uP2.value.copy(P2);
      su.uP3.value.copy(HAND);
      su.uGrow.value = Math.max(ss(T.draw[0], T.draw[1], t) * (1 - ss(T.retract[0], T.retract[1], t) * 0.97), 0.0001);
      su.uFlut.value = (1 - 0.85 * taut) * (0.6 + 0.4 * ss(1.7, 3.0, t));
      su.uGlow.value = 0.45 + 0.9 * ss(T.link - 0.2, T.link + 0.3, t) + 0.8 * shock;
      W.strand.shellU.uGlow.value = (0.6 + 0.7 * shock + 0.5 * ss(T.link, T.link + 0.5, t)) * Math.min(1, Math.max(0.25, cam.position.distanceTo(CL) / 9));
      if (inHold) { W.strand.shellU.uGlow.value = Math.min(W.strand.shellU.uGlow.value, 0.3); }
      o.strandCore.visible = inside && su.uGrow.value > 0.001;
      o.strandHalo.visible = o.strandCore.visible;

      const lin = ss(T.loopIn[0], T.loopIn[1], t) * (1 + 0.16 * Math.sin(Math.PI * clamp01((t - T.loopIn[0]) / 1.3)));
      const lout = 1 - ss(T.loopsOut[0], T.loopsOut[1], t);
      const tr = ss(T.travel[0], T.travel[1], t);
      const linkK = ss(T.link - 0.05, T.link + 0.35, t);
      const settle = t > T.link ? Math.exp(-(t - T.link) * 6) * Math.cos((t - T.link) * 30) : 0;
      const ring = t < T.pull[0] ? 0 : 0.86 + 0.14 * Math.exp(-Math.max(0, t - T.pull[1]) * 7) * Math.cos((t - T.pull[1]) * 38);
      const pullAmt = ss(T.pull[0], T.pull[1], t) * ring;
      const A = PA;
      A0.copy(TIE).addScaledVector(A, 0.55).add(V.set(0.1, 0.65, -0.55));
      CAr.copy(CL).addScaledVector(A, -R * 0.5 - 0.55 * pullAmt);
      const ta = ss(T.travel[0] - 0.2, T.travel[1] - 0.3, t);
      CAv.copy(A0).lerp(CAr, ta);
      CAv.y += 0.05 * Math.sin(t * 1.7) * (1 - ta);
      const aRad = R * (0.8 + 0.2 * ta);
      B0.copy(HAND).add(V.set(0.1, 0.1, 0.6));
      CBr.copy(CL).addScaledVector(A, R * 0.5 + 0.55 * pullAmt + 0.02 * settle);
      BP1.copy(B0).lerp(CBr, 0.4);
      BP1.y += 4;
      BP2.copy(CBr).addScaledVector(NA, 3.2);
      cubic(B0, BP1, BP2, CBr, tr, CBv);
      const bRad = R * (1 + 1.5 * Math.pow(1 - tr, 1.3));
      const stretch = 1 + 0.9 * pullAmt;
      const narrow = 1 - 0.28 * pullAmt;
      const loopUp = (L, center, rad, e, show, bump) => {
        const u = L.U;
        u.uC.value.copy(center);
        u.uA.value.copy(A);
        u.uE.value.copy(e);
        u.uRy.value = rad * stretch;
        u.uRx.value = rad * narrow;
        u.uTube.value = 0.07 * (0.9 + (0.1 * rad) / R);
        u.uPersp.value = 0.012 * (1 - tr * 0.9);
        u.uScale.value = Math.max(show, 0.0001) * (1 + bump);
        u.uGlow.value = 0.7 + 0.5 * linkK + 0.8 * shock;
        L.shellU.uScale.value = u.uScale.value;
        L.shellU.uGlow.value = (0.8 + 0.8 * shock + 0.4 * linkK) * Math.min(1, Math.max(0.25, cam.position.distanceTo(center) / 9));
        if (inHold) { u.uGlow.value = Math.min(u.uGlow.value, 0.9); L.shellU.uGlow.value = Math.min(L.shellU.uGlow.value, 0.3); }
      };
      loopUp(W.loopA, CAv, aRad, E1, lin * lout, 0.04 * Math.sin(t * 9) * shock);
      loopUp(W.loopB, CBv, bRad, E2, lin * lout, 0.04 * Math.sin(t * 9 + 1) * shock);
      for (const k of ["loopACore", "loopAHalo", "loopBCore", "loopBHalo"]) o[k].visible = inside && lin * lout > 0.01;

      const kp = ss(T.knot, T.knot + 0.45, t);
      const pop = kp * (1 + 0.3 * Math.sin(Math.PI * clamp01((t - T.knot) / 0.55))) * lout;
      o.knotGroup.visible = inside && pop > 0.01;
      o.knotGroup.position.copy(CL);
      o.knotGroup.rotation.set(0.04 * Math.sin(t * 1.3), 0.08 * Math.sin(t * 0.9), 0.05 * Math.sin(t * 1.1));
      o.knotGroup.scale.setScalar(1.15);
      o.tag.rotation.z = 0.14 * Math.sin(t * 2.3) * kp;
      o.tag.position.set(0, -0.55, 0.02);
      W.knot.U.uPop.value = Math.max(pop, 0.0001);
      W.knot.haloU.uPop.value = Math.max(pop, 0.0001);
      W.knot.U.uGlow.value = 0.9 + 0.5 * Math.sin(t * 3.1) * kp;
      W.knot.haloU.uGlow.value = 0.9 + 0.4 * Math.sin(t * 3.1) * kp;

      const cAlpha = ss(0.9, 1.8, t) * (1 - ss(T.comet[0], T.comet[1], t));
      const sp = Math.max(0, t - T.split);
      cam.getWorldDirection(CF);
      CR.crossVectors(CF, AUP).normalize();
      CU.crossVectors(CR, CF).normalize();
      const hh = Math.tan((cam.fov * Math.PI) / 360);
      CDIR.copy(CF).addScaledVector(CR, 0.18 * hh * cam.aspect).addScaledVector(CU, 0.72 * hh).normalize();
      HEAD0.copy(CDIR).multiplyScalar(SKYD).add(EYEV);
      const c0 = W.comets[0];
      c0.ru.uHead.value.copy(HEAD0);
      c0.ru.uDir.value.copy(TAILD);
      c0.ru.uLen.value = 140 + 10 * Math.sin(t * 0.7);
      c0.ru.uW.value = 5.0;
      c0.ru.uAlpha.value = cAlpha;
      c0.hu.uSize.value = 22 + 0.8 * Math.sin(t * 5);
      const c1 = W.comets[1];
      c1.ru.uHead.value.copy(HEAD0).addScaledVector(V.set(1, 0.18, 0.1), sp * sp * 0.9 + sp * 1.2);
      c1.ru.uDir.value.copy(TAILD).add(V.set(0.1, -0.05, 0)).normalize();
      c1.ru.uLen.value = 55;
      c1.ru.uW.value = 1.8;
      c1.ru.uAlpha.value = cAlpha * ss(T.split, T.split + 0.5, t);
      c1.hu.uSize.value = 6;
      const fe = clamp01((t - T.fall[0]) / (T.fall[1] - T.fall[0])) ** 2;
      dirTo(-23, 3.6, FALLTO).multiplyScalar(215).add(EYEV);
      const c2 = W.comets[2];
      c2.ru.uHead.value.copy(HEAD0).lerp(FALLTO, t < T.fall[0] ? 0 : fe);
      TAIL2.copy(HEAD0).sub(c2.ru.uHead.value);
      if (TAIL2.lengthSq() < 1) TAIL2.copy(TAILD);
      c2.ru.uDir.value.copy(TAIL2.lengthSq() > 1 ? TAIL2.normalize() : TAILD).lerp(TAILD, 1 - ss(T.fall[0], T.fall[0] + 0.5, t)).normalize();
      c2.ru.uLen.value = 30 + 70 * ss(T.fall[0], T.fall[1], t);
      c2.ru.uW.value = 2.0 + 1.2 * ss(T.fall[0], T.fall[1], t);
      const hit = t - T.impact;
      const flash = hit > 0 ? Math.exp(-hit * 1.8) : 0;
      c2.ru.uAlpha.value = t < T.split || t >= T.impact ? 0 : cAlpha * ss(T.split, T.split + 0.5, t);
      c2.hu.uSize.value = t < T.impact ? 6.5 : 60 * (1 + hit * 0.8);
      c2.hu.uAlpha.value = t < T.impact ? c2.ru.uAlpha.value : flash * 0.9;
      c1.hu.uAlpha.value = c1.ru.uAlpha.value;
      c0.hu.uAlpha.value = c0.ru.uAlpha.value;
      U.uFlare.value = flash * 0.9;
      U.uComet.value.copy(CDIR);

      const rp = W.lake.m.uniforms.uRip.value;
      rp[0].set(CL.x, CL.z, T.link, t > T.link ? 0.9 : 0);
      rp[1].set(-24, -140, T.impact, t > T.impact ? 1.2 : 0);
      rp[2].set(CL.x, CL.z, T.pull[0] + 0.2, t > T.pull[0] ? 0.8 : 0);
      rp[3].set(TIE.x + dx * 0.5, TIE.z + dz * 0.5, T.retract[0], t > T.retract[0] ? 0.5 * (1 - dis) : 0);
      const sr = W.lake.m.uniforms.uSrc.value;
      const sc = W.lake.m.uniforms.uSrcCol.value;
      sr[0].set(CAv.x, CAv.y, CAv.z, 0.9 * lin * lout);
      sc[0].set(1, 0.3, 0.35);
      sr[1].set(CBv.x, CBv.y, CBv.z, 0.9 * lin * lout * (1 + 1.5 * (1 - tr)));
      sc[1].set(1, 0.35, 0.3);
      sr[2].set(HEAD0.x, HEAD0.y, HEAD0.z, 3.2 * cAlpha);
      sc[2].set(0.55, 0.8, 1);
      sr[3].set(CL.x, CL.y, CL.z, 1.6 * pop);
      sc[3].set(1, 0.7, 0.45);

      W.fire.u.uAmp.value = ss(3.4, 4.6, t) * (1 - ss(14.0, 16.0, t));
      W.lakeGlints.u.uAmp.value = ss(2.2, 3.4, t) * (1 - ss(14.5, 16.5, t)) * (1 - 0.6 * dusk);
      W.airGlints.u.uAmp.value = ss(5.0, 6.2, t) * (1 - ss(15.4, 16.4, t)) * (0.5 + 0.5 * ss(T.link, T.link + 1, t));
      const b = W.burst.u;
      b.uAmp.value = 1.6;
      if (t < T.knot - 0.1) {
        b.uC.value.copy(CL);
        b.uT0.value = T.link;
      } else if (t < T.burst3 - 0.05) {
        b.uC.value.copy(CL);
        b.uT0.value = T.knot;
      } else {
        b.uC.value.copy(HAND).add(V.set(0, -1.6, 0));
        b.uT0.value = T.burst3;
      }

      cam.getWorldDirection(FWD);
      W.lake.m.uniforms.uAzC.value = Math.atan2(FWD.x, -FWD.z);
      const sunW = V2.copy(SUN);
      const gu = W.ghosts.u;
      V.copy(cam.position).addScaledVector(sunW, 100).project(cam);
      gu.uVis.value = (1 - dusk) * (1 - dusk) * Math.max(0, FWD.dot(sunW)) * ss(1.9, 3.2, t) * (1 - ss(T.dis[0], T.dis[0] + 0.5, t));
      gu.uAsp.value = 1 / cam.aspect;
      const gv = gu.uGhost.value;
      gv[0].set(V.x * -0.55, V.y * -0.55, 0.16, 0.07);
      gv[1].set(V.x * 0.35, V.y * 0.35, 0.1, 0.05);
      gv[2].set(V.x * 0.75, V.y * 0.75, 0.07, 0.11);
      gv[3].set(V.x * -1.1, V.y * -1.1, 0.12, 0.04);
      gv[4].set(V.x * 1.5, V.y * 1.5, 0.05, 0.15);

      const tcA = ss(T.title[0], T.title[0] + 0.9, t) * (1 - ss(T.title[1] - 0.5, T.title[1], t));
      const tm = W.title.mesh;
      tm.visible = tcA > 0.01;
      tm.material.uniforms.uA.value = tcA;
      if (tm.visible) {
        const d = 6;
        const th = 2 * d * Math.tan((cam.fov * Math.PI) / 360);
        V.copy(cam.position).addScaledVector(FWD, d);
        V2.set(0, 1, 0).applyQuaternion(cam.quaternion);
        V.addScaledVector(V2, th * 0.27);
        tm.position.copy(V).sub(DOCKV);
        tm.quaternion.copy(cam.quaternion);
        const w = Math.min(th * cam.aspect * 0.62, 5.6);
        tm.scale.set(w, w, 1);
      }

      st.inside = inside;
      st.dis = dis;
      st.revealed = dis > 0.03;
    },
  };
}
