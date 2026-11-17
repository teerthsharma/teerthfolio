// FX for p-aether-lang: the comic page (DOM: impact, VOID, the three balloons, the credit), the hit panels and gathers drawn behind the seal, the
// breaks at the collide, and the Hollow Purple finale parts with the STILL lettering.
import { Group, Vector3 } from "three";
import { makeCel, rgb } from "../../../kit/fx/cel.js";
import { SEAL, T, onTwos, orbs, sceneOf, smooth } from "../clock.js";
import { PAL } from "../palette.js";
import { skinLight } from "../cast/skin.js";
import { Comic } from "./page.js";
import { buildBreaks, KINDS, panelDraw } from "./hits.js";
import { jitterBolts, purpleParts } from "../live/purple.js";
import { flashQuad, holdFlash, lettering } from "../live/parts.js";

const FWD = new Vector3();
const hash = (i) => { const x = Math.sin(i * 127.1 + 3.7) * 43758.5453; return x - Math.floor(x); };

export default function build(ctx) {
  const group = new Group(), engine = ctx.engine, V = new Vector3(), chestW = new Vector3(), toLens = new Vector3();
  const cam = () => ctx.player?.camera;
  const beats = ctx.scene.beats ?? [], panels = beats.filter((b) => b.name === "panel" && KINDS[b.kind]), gathers = beats.filter((b) => b.name === "gather");
  const uv = (w) => { const c = cam(); if (!c) return null; V.copy(w).project(c); return V.z > 1 ? null : [V.x * 0.5 + 0.5, 0.5 - V.y * 0.5]; };
  const anchor = (at) => (at === "seal" || at === "chest" ? ctx.seal.chest(new Vector3()) : at === "hand" ? ctx.seal.named?.()?.handR : at === "mouth" ? ctx.seal.named?.()?.mouth : null);
  const centre = (at) => (Array.isArray(at) ? at : (anchor(at) && uv(anchor(at))) || [0.5, 0.5]);
  const gather = (B, g, age, A) => {
    const k = Math.min(1, age / g.dur), [u, v] = centre(g.at), cx = u * A, cy = v;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + 0.3 * hash(i), r1 = 0.9 * (1 - 0.6 * k) + 0.1 * hash(i + 3), r0 = r1 * 0.45;
      B.ribbon([[cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]], [0.006, 0.0005], rgb(PAL.C4));
    }
  };
  const cel = makeCel(engine, {
    max: 60000, order: 1200, behind: true,
    draw(B, ts, A) {
      for (const b of panels) {
        const age = ts - b.t;
        if (age < -1e-6 || age >= b.dur - 1e-6) continue;
        const f = Math.min(KINDS[b.kind] - 1, Math.floor(age * 24 + 1e-6));
        panelDraw(B, b.kind, f, { A, at: centre(b.at) });
      }
      for (const g of gathers) { const age = ts - g.t; if (age >= 0 && age < g.dur) gather(B, g, age, A); }
    },
  });
  group.add(cel.group);

  const comic = new Comic(ctx);
  const breaks = buildBreaks(ctx);
  group.add(breaks.group);
  const P = purpleParts();
  const still = lettering("STILL", PAL.still, -0.1);
  const flash = flashQuad(PAL.flash);
  group.add(P.blue, P.red, P.purple, P.tunnel, P.bb, P.rb, still);
  ctx.root.add(flash);

  return {
    group,
    update(t, dt, cue) {
      const c = cam();
      if (!c) return;
      group.updateWorldMatrix(true, false);
      const tt = onTwos(sceneOf(t));
      comic.frame(t);
      cel.update(t, cue);
      const feet = uv(new Vector3(...ctx.seal.at)) ?? [0.5, 0.8];
      breaks.update(t, feet);

      const chest = ctx.seal.chest(chestW), hands = ctx.seal.named?.() ?? {};
      const O = orbs(tt, hands.handR ?? chest, hands.handL ?? chest, chest);
      const local = (w) => group.worldToLocal(w.clone());
      for (const [o, bolt, orb] of [[P.blue, P.bb, O.blue], [P.red, P.rb, O.red]]) {
        o.visible = bolt.visible = O.on;
        if (!O.on) continue;
        o.position.copy(local(orb.p)); o.scale.setScalar(orb.r); o.material.uniforms.uT.value = tt;
        bolt.position.copy(o.position); bolt.scale.setScalar(orb.r);
        jitterBolts(bolt, Math.floor(tt * 24));
      }
      P.purple.visible = O.purple.on;
      if (O.purple.on) {
        toLens.copy(c.position).sub(chest).normalize();
        const along = 0.8 + 11.5 * O.f ** 2.2, p = chest.clone().addScaledVector(new Vector3(0, 1, 0), 0.4 * SEAL.scale + 0.3 * O.f).addScaledVector(toLens, along);
        P.purple.position.copy(local(p)); P.purple.scale.setScalar(O.purple.s); P.purple.material.uniforms.uT.value = tt;
      }
      const tk = smooth(T.tunnel[0], T.tunnel[1], tt) * (1 - smooth(T.clear[0], T.clear[1], tt));
      P.tunnel.visible = tk > 0.004;
      if (P.tunnel.visible) { P.tunnel.position.copy(local(c.position)); P.tunnel.quaternion.copy(c.quaternion); P.tunnel.material.uniforms.uK.value = tk; P.tunnel.material.uniforms.uT.value = tt; }

      const st = tt - T.still[0];
      still.visible = st > 0 && tt < T.still[1];
      if (still.visible) {
        const pop = Math.min(1, st / 0.1) * (1 + 0.22 * Math.max(0, 1 - st / 0.22)), d = 4.5, fwd = c.getWorldDirection(FWD.clone());
        const right = new Vector3().crossVectors(fwd, c.up).normalize(), up = new Vector3().crossVectors(right, fwd).normalize();
        const hh = d * Math.tan((c.fov * Math.PI) / 360), hw = hh * c.aspect, w = 0.7 * hw * pop;
        const p = c.position.clone().addScaledVector(fwd, d).addScaledVector(right, -0.5 * hw).addScaledVector(up, 0.5 * hh);
        still.position.copy(group.worldToLocal(p));
        still.scale.set(w, w, 1);
        still.quaternion.copy(c.quaternion);
      }
      holdFlash(flash, c, Math.max(Math.max(0, 1 - Math.abs(tt - T.close[1]) / 0.14) * 0.8, 0.9 * smooth(T.tunnel[1] - 0.2, T.rv, tt) * (1 - smooth(T.clear[0], T.clear[1], tt))));

      skinLight(t, O.blue.p, O.red.p, O.grow, O.f);
    },
    dispose() {
      comic.dispose(); cel.dispose(); breaks.dispose();
      still.geometry.dispose(); still.material.map?.dispose(); still.material.dispose();
      flash.removeFromParent(); flash.geometry.dispose(); flash.material.dispose();
    },
  };
}
