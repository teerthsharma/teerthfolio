// E3 WEST WINDOWS: frames, mullions, sills, pelmets (static, layer 0); folded curtains with tiebacks that breathe,
// and the window-edge blow-out (animated, layer 1).
//
// CURTAIN (6+ fold strips, 2-band cel from the key light's normals):
//   grid (i, j), u = i/nu across, y running down. tie(y) = exp(-((y - 1.9)/0.45)^2), the tieback pinch.
//   width     w(y) = 0.70 (1 - 0.38 tie)        centre  zc +- (1.15 + 0.20 tie)  (gathered toward the glass edge)
//   x(i, j)   = X0 + 0.17 + A sin(6 pi u + 0.4 y) + B(ts, y),  A = 0.065
//   breath    B = 0.04 sin(2 pi 0.25 ts + phase + 0.5 y) (1 - y/4.6)    +-0.04 m at 0.25 Hz, held on twos (ts is stepped)
// BLOW-OUT (colour dodge in spirit, additive so the id channel is untouched):
//   q = card-local metres, d = |max(|q| - half, 0)|  (distance outside the pane rectangle)
//   glow = 0.6 exp(-d / 0.42) outside, +0.5 inside (the glass is blown to the sky colour), x (1 + 0.04 sin(2 pi 0.1 t)).
//   0.42 m at the 3.3 m viewing distance of the medium shot is the bible's 40-60 px bleed at 720p.
import * as THREE from "three";
import { BoxGeometry, ShaderMaterial, Color } from "three";
import { P, ROOM, WIN, cel, addBlend, SEAL_CLEAR } from "./kit.js";

const X0 = ROOM.x0;

export function buildWindows(ctx, shared) {
  const stat = new THREE.Group(), anim = new THREE.Group();
  anim.userData.layer = 1;

  // ---- static frames ----
  const box = (w, h, d, x, y, z, col = P.frame, sh = P.frameShade, line = 0.8) => {
    const m = cel(ctx, new BoxGeometry(d, h, w), col, sh, { line }); m.position.set(x, y, z); stat.add(m); return m;
  };
  for (const zc of WIN.zc) {
    const yc = (WIN.y0 + WIN.y1) / 2, ph = WIN.y1 - WIN.y0, fx = X0 + 0.07;
    box(0.12, ph, 0.14, fx, yc, zc - WIN.hw + 0.06);              // jambs
    box(0.12, ph, 0.14, fx, yc, zc + WIN.hw - 0.06);
    box(2 * WIN.hw, 0.12, 0.14, fx, WIN.y1 - 0.06, zc);           // head
    box(2 * WIN.hw, 0.12, 0.14, fx, WIN.y0 + 0.06, zc);           // sill bar
    box(0.06, ph, 0.10, fx + 0.01, yc, zc, P.frame, P.frameShade, 0.6);      // centre mullion (the pale bar that eats the glow)
    box(2 * WIN.hw, 0.06, 0.10, fx + 0.01, 3.1, zc, P.frame, P.frameShade, 0.6); // transom: the "mullion cross"
    box(2 * WIN.hw + 0.2, 0.05, 0.42, X0 + 0.21, WIN.y0 + 0.02, zc, P.sill, "#c9b998", 0.8);  // sill ledge, 0.42 m deep
    box(2 * WIN.hw + 0.5, 0.30, 0.26, X0 + 0.15, WIN.y1 + 0.2, zc, P.pelmet, "#5a3418", 0.8); // pelmet
  }

  // ---- curtains (8): two per window ----
  const NU = 10, NV = 14, Y0 = 0.08, Y1 = 4.6;
  const curtains = [];
  const tie = (y) => Math.exp(-(((y - 1.9) / 0.45) ** 2));
  for (const zc of WIN.zc) for (const side of [-1, 1]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3), 3));
    const idx = [];
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const A = j * (NU + 1) + i, B = A + 1, C2 = B + NU + 1, D = A + NU + 1;
      idx.push(A, B, D, B, C2, D);                                 // faces +x (into the room)
    }
    geo.setIndex(idx);
    const m = cel(ctx, geo, P.curtain, P.curtainShade, { line: 0.7 });
    m.frustumCulled = false;
    anim.add(m);
    curtains.push({ geo, zc, side, phase: zc * 0.7 + side });
    const tb = cel(ctx, new BoxGeometry(0.1, 0.07, 0.62), P.tie, "#d9c08a", { line: 0.5 });   // tieback band
    tb.position.set(X0 + 0.21, 1.9, zc + side * (1.15 + 0.2));
    stat.add(tb);
  }
  const fill = (c, ts) => {
    const p = c.geo.attributes.position;
    for (let j = 0; j <= NV; j++) {
      const y = Y1 - (Y1 - Y0) * j / NV, tz = tie(y), w = 0.70 * (1 - 0.38 * tz), zcen = c.zc + c.side * (1.15 + 0.2 * tz);
      const hang = 1 - y / Y1;
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const x = X0 + 0.17 + 0.065 * Math.sin(6 * Math.PI * u + 0.4 * y) + 0.04 * Math.sin(2 * Math.PI * 0.25 * ts + c.phase + 0.5 * y) * hang;
        p.setXYZ(j * (NU + 1) + i, x, y, zcen + (u - 0.5) * w);
      }
    }
    p.needsUpdate = true; c.geo.computeVertexNormals();
  };
  curtains.forEach((c) => fill(c, 0));

  // ---- blow-out cards (4) ----
  const glowMat = () => new ShaderMaterial({
    ...addBlend, depthTest: true,
    uniforms: { uSeal: shared.uSeal, uAmt: { value: 1 }, uCol: { value: new Color(P.glow) }, uHot: { value: new Color(P.sunCore) }, uHalf: { value: new THREE.Vector2(WIN.hw, (WIN.y1 - WIN.y0) / 2) } },
    vertexShader: "varying vec2 vUv; varying vec3 vWP; void main() { vUv = uv; vWP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vWP, 1.0); }",
    fragmentShader: `${SEAL_CLEAR} uniform float uAmt; uniform vec3 uCol; uniform vec3 uHot; uniform vec2 uHalf; varying vec2 vUv; varying vec3 vWP;
      void main() {
        vec2 q = (vUv - 0.5) * (uHalf * 2.0 + vec2(1.9));
        vec2 e = abs(q) - uHalf;
        float d = length(max(e, 0.0));
        float inside = 1.0 - step(0.0, max(e.x, e.y));
        float glow = 0.6 * exp(-d / 0.42) * (1.0 - inside) + 0.5 * inside * (1.0 - 0.25 * smoothstep(-0.5, 0.0, max(e.x, e.y)));
        vec3 c = mix(uCol, uHot, inside * 0.6) * glow * uAmt;
        gl_FragColor = vec4(c * sealClear(vWP), 0.0);
      }`,
  });
  const glows = [];
  for (const zc of WIN.zc) {
    const mat = glowMat();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * WIN.hw + 1.9, WIN.y1 - WIN.y0 + 1.9), mat);
    mesh.rotation.y = Math.PI / 2; mesh.position.set(X0 + 0.085, (WIN.y0 + WIN.y1) / 2, zc); mesh.renderOrder = 4; mesh.frustumCulled = false;
    anim.add(mesh); glows.push(mat);
  }

  const group = new THREE.Group(); group.add(stat, anim);
  return {
    group,
    update(ts, dt, cue) {
      for (const c of curtains) fill(c, ts);
      const breathe = 1 + 0.04 * Math.sin(2 * Math.PI * 0.1 * cue.t);
      for (const m of glows) { m.uniforms.uAmt.value = breathe * (1 - 0.15 * shared.warm.value); m.uniforms.uCol.value.set(P.glow).lerp(new Color(P.sunset), shared.warm.value * 0.7); }
    },
  };
}
