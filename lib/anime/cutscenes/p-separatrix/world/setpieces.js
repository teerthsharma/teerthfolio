// p-separatrix WORLD: the project's set pieces, drawn as gilded fresco furniture: the two pools (ripple-ring), the boom gate and the
// beacon with its hard glow ring. All cue-driven; no text anywhere.
//
// POOLS  water disc r 2.3 sitting 0.06 below the bowl rim (the heightfield hides what is above it). 2-tone posterised water:
//   tone = step(0.48, fbm(1.6 q + 2) + 0.08 sin(5 r)), lit #3a6ea8 / shade #1f3f78; three static hard ripple rings at r 0.7, 1.3, 1.9
//   (1.5 px, lighter blue). PULSE (0.9 s on each clear parcel): the gold ring #f2bd45 steps through THREE radii (0.73, 1.47, 2.2 m),
//   stage = floor(3 s / 0.9), so a pulse is three posterised decals, never a soft ripple.
// GATE   two posts (x = +-1.55, 3.4 m) and a bar 2.56 x 0.28 striped #fbf6e8 / #b9573a (0.32 m stripes); the bar rises 2.5 m by the `gate`
//   cue: y = base + 0.04 + 0.14 + 2.5 k. Base = floorY(0, GATE_Z).
// BEACON pole + bulb r 0.25: off #4a1a1a, on #ff6a5a (x 1.35); two hard glow rings (billboard, r 0.42-0.55 and 0.72-0.8) while it flashes;
//   the flash is the `beacon` (or `tear`) cue, 0.5 s, the second ring only after 0.12 s; on twos by the layer step.
import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, Mesh, RingGeometry, SphereGeometry, Vector2 } from "three";
import { surface } from "../../../kit/surface.js";
import { C, GATE_Z, POOL_R, POOL_RIM_Y, POOL_X, PRELUDE, floorY, hex, mixHex } from "./common.js";

const since = (cue, n) => { try { const s = cue.since(n); return Number.isFinite(s) ? s : Infinity; } catch { return Infinity; } };

export function buildSetpieces(ctx, U) {
  const group = new Group(), sh = ctx.engine.shared, disposables = [];
  // ---- pools
  const pools = [];
  for (const s of [-1, 1]) {
    const uC = { value: new Vector2(s * POOL_X, 0) }, uPulse = { value: -1 };
    const mat = surface(sh, /* glsl */ `
      ${PRELUDE}
      uniform vec2 uC; uniform float uPulse;
      vec3 shade(vec3 P, vec3 N, vec3 V) {
        vec2 q = P.xz - uC; float r = length(q);
        float n = fbm(q * 1.6 + 2.0) + 0.08 * sin(r * 5.0), w = fwidth(n) + 1e-4;
        vec3 c = mix(${hex(C.waterShade)}, ${hex(C.waterLit)}, smoothstep(0.48 - w, 0.48 + w, n));
        vec3 light = ${mixHex(C.waterLit, "#ffffff", 0.3)};
        c = mix(c, light, max(max(aaLine(r - 0.7, 1.5), aaLine(r - 1.3, 1.5)), aaLine(r - 1.9, 1.5)) * 0.8);
        if (uPulse >= 0.0) {
          float st = min(floor(uPulse * 3.0), 2.0), rr = (st + 1.0) / 3.0 * ${(POOL_R - 0.1).toFixed(2)};
          c = mix(c, ${hex(C.ring)} * 1.05, step(abs(r - rr), 0.11));
        }
        return fresco(c, P);
      }`, { uniforms: { ...U, uC, uPulse }, id: 0.5 });
    const m = new Mesh(new CircleGeometry(POOL_R + 0.05, 56).rotateX(-Math.PI / 2), mat);
    m.position.set(s * POOL_X, POOL_RIM_Y - 0.06, 0);
    group.add(m); pools.push({ s, uPulse, mat, m }); disposables.push(mat, m.geometry);
  }
  // ---- a flat two-tone cel for gate parts
  const cel = (col, shade, extra = "") => {
    const mat = surface(sh, /* glsl */ `
      ${PRELUDE}
      vec3 shade(vec3 P, vec3 N, vec3 V) {
        float lam = dot(N, normalize(uLightDir)) * 0.5 + 0.5, w = fwidth(lam) * 0.8 + 1e-4;
        vec3 base = ${hex(col)}, sd = ${hex(shade)};
        ${extra}
        vec3 c = mix(sd, base, smoothstep(0.45 - w, 0.45 + w, lam));
        return fresco(c, P);
      }`, { uniforms: U, id: 0.5 });
    disposables.push(mat); return mat;
  };
  const post = cel(C.plaster, mixHex(C.stoneMid, C.stoneShade, 0.5));
  const bar = cel(C.plaster, mixHex(C.barRed, C.stoneShade, 0.5), `
        float stripe = step(0.5, fract(P.x / 0.64)); base = mix(${hex(C.plaster)}, ${hex(C.barRed)}, stripe); sd = mix(${mixHex(C.plaster, C.stoneShade, 0.45)}, ${mixHex(C.barRed, C.stoneShade, 0.5)}, stripe);`);
  const gy = floorY(0, GATE_Z);
  const gate = new Group(); gate.position.set(0, gy, GATE_Z); group.add(gate);
  for (const x of [-1.55, 1.55]) { const p = new Mesh(new BoxGeometry(0.22, 3.4, 0.22), post); p.position.set(x, 1.7, 0); gate.add(p); disposables.push(p.geometry); }
  const barM = new Mesh(new BoxGeometry(2.56, 0.28, 0.12), bar); gate.add(barM); disposables.push(barM.geometry);
  // ---- beacon
  const pole = new Mesh(new CylinderGeometry(0.06, 0.08, 1.6, 10), post); pole.position.set(2.1, 0.8, 0); gate.add(pole); disposables.push(pole.geometry);
  const uOn = { value: 0 };
  const bulbMat = surface(sh, /* glsl */ `
    ${PRELUDE}
    uniform float uOn;
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      float lam = dot(N, normalize(uLightDir)) * 0.5 + 0.5, w = fwidth(lam) * 0.8 + 1e-4;
      vec3 off = mix(${mixHex(C.beaconOff, "#000000", 0.4)}, ${hex(C.beaconOff)}, smoothstep(0.45 - w, 0.45 + w, lam));
      vec3 on = ${hex(C.beaconOn)} * mix(0.85, 1.25, smoothstep(0.45 - w, 0.45 + w, lam));
      return mix(off, on, uOn);
    }`, { uniforms: { ...U, uOn }, id: 0.5 });
  const bulb = new Mesh(new SphereGeometry(0.25, 20, 14), bulbMat); bulb.position.set(2.1, 1.75, 0); gate.add(bulb); disposables.push(bulb.geometry, bulbMat);
  const glow = (r0, r1) => {
    const m = new Mesh(new RingGeometry(r0, r1, 40), cel(C.beaconOn, C.beaconOn));
    m.position.copy(bulb.position); m.visible = false; m.renderOrder = 2;
    m.onBeforeRender = (_r, _s, cam) => { m.quaternion.copy(cam.quaternion); };
    gate.add(m); disposables.push(m.geometry); return m;
  };
  const ring1 = glow(0.42, 0.55), ring2 = glow(0.72, 0.8);
  for (const r of [ring1, ring2]) { r.userData.layer = 1; }
  return {
    group,
    update(cue) {
      // pools: pulseL / pulseR, or a generic `pulse` with side (-1 left, 1 right, 0 both); 0.9 s, three posterised stages
      const sP = since(cue, "pulse"), side = sP < 0.9 && cue.arg ? cue.arg("pulse", "side", 0) : 0;
      for (const p of pools) {
        const named = since(cue, p.s < 0 ? "pulseL" : "pulseR");
        const s = Math.min(named, sP < 0.9 && (side === 0 || Math.sign(side) === p.s) ? sP : Infinity);
        p.uPulse.value = s < 0.9 ? s / 0.9 : -1;
      }
      // gate
      let k;
      if (cue.beat && cue.beat("gate")) k = Math.min(1, Math.max(0, cue.k("gate"))) * (cue.arg ? cue.arg("gate", "open", 1) : 1);
      else k = Math.min(1, Math.max(0, (cue.t - 8.0) / 0.5));
      barM.position.y = 0.04 + 0.14 + 2.5 * k;
      // beacon flash
      const sb = Math.min(since(cue, "beacon"), since(cue, "tear")), on = sb < 0.5 ? 1 : 0;
      uOn.value = on; ring1.visible = on > 0; ring2.visible = on > 0 && sb > 0.12;
      const grow = 1 + 0.5 * Math.min(1, sb / 0.5); ring1.scale.setScalar(grow); ring2.scale.setScalar(grow);
    },
    dispose() { for (const d of disposables) d.dispose?.(); },
  };
}
