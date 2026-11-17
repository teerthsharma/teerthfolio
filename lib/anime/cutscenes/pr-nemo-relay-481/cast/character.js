// CHARACTER: the look's cel shade (one hard step, the site's tone), its line weight, and the nine ki-orb dodges as moves and track.
import { BackSide } from "three";
import { PASSY, PASSZ, passReal, passSide } from "../clock.js";
import { TONE } from "../tone.js";

const MAIN = /void\s+main\s*\(\s*\)/;
const CEL = /* glsl */ `
  ${TONE}
  uniform float uCel; const vec3 CEL_KEY = vec3(-0.42, 0.74, 0.52), CEL_SH = vec3(0.70, 0.66, 0.88);
  void main() { celMain(); if (uCel > 0.5 && gl_FragColor.a > 0.75) {
    vec3 n = normalize(CEL_NRM); float lit = step(0.18, dot(n, CEL_KEY));
    vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
    c = c * mix(CEL_SH, vec3(1.08), lit);
    gl_FragColor.rgb = siteTone(pow(min(c, vec3(0.98)), vec3(2.2))); } }
`;

// wraps every shader material of the seal once: its main() becomes celMain() and the cel pass runs over it while `on`
export function wrapCel(ctx) {
  const uCel = { value: 0 }, seen = new Set(), sh = ctx.engine.shared, line0 = sh.uLine.value.clone();
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (m.side === BackSide || f.split(MAIN).length !== 2) return;
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void celMain()") + CEL.replace(/CEL_NRM/g, n);
    m.uniforms.uCel = uCel; m.needsUpdate = true;
  });
  return {
    update(on) {
      uCel.value = on ? 1 : 0;
      sh.uLine.value.set(on ? 1.7 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
    },
    dispose() { sh.uLine.value.copy(line0); },
  };
}

// the out leg slides to the side of the orb's plane, the back leg returns to the stand (the live dodge, stretched by the 2.65 slow motion)
export function dodgeMoves(stand) {
  const moves = [];
  for (let i = 0; i < 9; i++) {
    const p = passReal(i), s = passSide(i), y = PASSY[i], z = PASSZ[i];
    moves.push({ t: [p - 0.58, p - 0.19], to: [stand[0] + s * 0.6, stand[1] + (y < 0.5 ? 0.32 : 0), stand[2] + (z > 0 ? -0.55 : 0.5)], yaw: 0 });
    moves.push({ t: [p + 0.27, p + 0.9], to: [...stand], yaw: 0 });
  }
  return moves;
}

export function dodgeTrack() {
  return Array.from({ length: 9 }, (_, i) => ({ t: passReal(i) - 0.62, pose: i % 2 ? "uiDodgeL" : "uiDodgeR", dur: 0.25, hold: 0.45, out: 0.3 }));
}
