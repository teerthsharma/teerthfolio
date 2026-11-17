// orbs: the nine ki orbs (six colours, white heart, ink hull, streak) and the silver ghosts of each dodge (kit echo); port of the live fx.js.
import { BackSide, Color, ConeGeometry, Group, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { makeEchoes } from "../../../kit/fx/echo.js";
import { ORB, PAL, PASSY, PASSZ, passAt, passReal, passSide, smooth } from "../clock.js";
import { STAND } from "../lens.js";
import { toned } from "../tone.js";
import { hash, hide, inst, put } from "../util.js";

const UP = new Vector3(0, 1, 0), A = new Vector3(), B = new Vector3(), P = new Vector3(), S = new Vector3(), DIR = new Vector3();
const Q = new Quaternion(), M = new Matrix4();
const mb = (color) => new MeshBasicMaterial({ color, toneMapped: false, fog: false });
const paint = (hex) => new Color().setRGB(...toned(hex));

const start = (i, out) => out.set(passSide(i) * 17, PASSY[i] + 1.4 * hash(i, 2), PASSZ[i] + (hash(i, 3) - 0.5) * 7);
const pass = (i, out) => out.set(0, PASSY[i], PASSZ[i]);

export function buildOrbs(ctx) {
  const geo = new IcosahedronGeometry(1, 1);
  const shell = inst(geo, mb("#ffffff"), ORB.n);
  const hull = inst(geo, new MeshBasicMaterial({ color: PAL.ink, side: BackSide, toneMapped: false, fog: false }), ORB.n);
  const core = inst(geo, mb("#ffffff"), ORB.n);
  const tail = inst(new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), mb("#ffffff"), ORB.n);
  for (let i = 0; i < ORB.n; i++) {
    const hex = ORB.colors[i % ORB.colors.length];
    shell.setColorAt(i, paint(hex));
    tail.setColorAt(i, paint(hex));
    core.setColorAt(i, paint("#fffff2"));
  }
  const group = new Group();
  group.add(tail, hull, shell, core);
  return {
    group,
    update(tt, k) {
      for (let i = 0; i < ORB.n; i++) {
        const s = (tt - (ORB.launch + i * ORB.gap)) / ORB.fly;
        if (s < 0 || s > 2.2 || k <= 0) { hide(shell, i); hide(hull, i); hide(core, i); hide(tail, i); continue; }
        start(i, A);
        pass(i, B);
        P.copy(A).lerp(B, s);
        const pop = Math.min(1, s / 0.1) * k, r = 0.24 * pop * (1 + 0.1 * Math.sin(tt * 40 + i));
        put(shell, i, P.x, P.y, P.z, r);
        put(hull, i, P.x, P.y, P.z, r * 1.14);
        put(core, i, P.x, P.y, P.z, r * 0.52);
        DIR.copy(B).sub(A).normalize();
        Q.setFromUnitVectors(UP, DIR.negate());
        S.set(r * 0.9, 2.2 * pop * Math.min(1, s * 2), r * 0.9);
        M.compose(P, Q, S);
        tail.setMatrixAt(i, M);
      }
      for (const m of [shell, hull, core, tail]) m.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const m of [shell, hull, core, tail]) { m.geometry.dispose(); m.material.dispose(); m.dispose(); }
    },
  };
}

// the dodge: the seal steps aside before each pass (out leg, hold, back), the same legs as cast/character.js dodgeMoves
const DODGE = Array.from({ length: ORB.n }, (_, i) => {
  const p = passReal(i), s = passSide(i);
  return { a: p - 0.58, b: p - 0.19, c: p + 0.27, d: p + 0.9, to: [STAND[0] + s * 0.6, STAND[1] + (PASSY[i] < 0.5 ? 0.32 : 0), STAND[2] + (PASSZ[i] > 0 ? -0.55 : 0.5)] };
});
const lerp = (out, a, b, k) => out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
const dodgeAt = (t, out) => {
  for (let i = DODGE.length - 1; i >= 0; i--) {
    const d = DODGE[i];
    if (t >= d.a && t < d.b) return lerp(out, STAND, d.to, smooth(d.a, d.b, t));
    if (t >= d.b && t < d.c) return lerp(out, STAND, d.to, 1);
    if (t >= d.c && t < d.d) return lerp(out, d.to, STAND, smooth(d.c, d.d, t));
  }
  return out.set(STAND[0], STAND[1], STAND[2]);
};
// two ghosts per orb: 0.6 at the pass, falling to 0 over 0.4 tt, lit from 0.2 tt before it
const ghostLevel = (tt) => {
  let v = 0;
  for (let i = 0; i < ORB.n; i++) { const d = tt - passAt(i); if (d >= -0.2 && d < 0.4) v = Math.max(v, 0.6 * (1 - Math.max(0, d) / 0.4)); }
  return v;
};

export function buildGhosts(ctx) {
  const pos = new Vector3();
  const echo = makeEchoes(ctx.engine, { source: ctx.seal.group, at: (t) => dodgeAt(t, pos), count: 2, gap: 1, fps: 12, tint: PAL.ghost, emit: 0, stretch: 1.15, minMove: 0.03, blend: "under", k: 0 });
  echo.group.userData.tier = 2;
  return {
    group: echo.group,
    update(t, tt, k) { echo.set({ k: ghostLevel(tt) * k }); echo.update(t); },
    dispose() { echo.dispose(); },
  };
}
