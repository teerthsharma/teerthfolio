// E7 LIGHT: crisp two-band window shafts, floor window patches with the mullion cross, dust motes, and the low-sun halo.
// Everything here is animated (layer 1) and additive or over-blended with the id channel preserved. Every card fades out
// wherever it sits between the lens and the seal (SEAL_CLEAR), so the light never milks the hero (L2, L8).
//
// SHAFT GEOMETRY (3 windows x 2 sheets = 6, z = zc +- 1.3; the bible's 8.4 m run with a 1.55 m drop):
//   tan(theta) = 1.55 / 8.4 = 0.1845 (10.5 degrees; the sun is 12 above the horizon, refracted by the stylised panes)
//   a ray from the pane at height y0 runs y = y0 - tan(theta) (x - x_w). Light-ray coordinate s = y + tan(theta)(x - x_w) is
//   constant along a ray, so band = (s - 0.8) / 3.7 in [0, 1] is the position ACROSS the shaft. The sheet is the pane's
//   parallelogram clipped by the floor: p0 (xw, .8) p1 (xw, 4.5) p2 (xw + 8.4, 2.95) p3 (xw + 8.4, .02) p4 (floor hit, .02).
// SHAFT SHADING (2 hard bands, never noise):
//   halo  = band in (0, 1)            #ffc766 x 0.14
//   core  = band in (0.18, 0.82)      #fff0b8 x 0.14      (so the core reads 0.28)
//   stripe = 0.7 + 0.3 step(0, sin(18 along - 0.35 ts + 3 band))     slides at 0.35 rad/s, held on twos
//   fade   = S(0, .04, along) (1 - S(.6, 1, along))
// FLOOR PATCH: rectangle 6.3 x 3.0 m, inner mask |qx - shift| < 3.0, |qz| < 1.4; mullion gaps |qz| < .06 and |qx - shift - .4| < .07;
//   a 0.04 m rim in #d9a05e (the 1.5 px darker edge); fill #fff0b8 at 0.30. shift = 0.3 sin(0.5 ts): 0.15 m/s peak crawl.
import * as THREE from "three";
import { Color, ShaderMaterial } from "three";
import { P, ROOM, WIN, SUN, sunDir, addBlend, overBlend, SEAL_CLEAR } from "./kit.js";

const TAN = 1.55 / 8.4, RUN = 8.4, XW = ROOM.x0 + 0.1;

export function buildLight(ctx, shared) {
  const g = new THREE.Group(); g.userData.layer = 1;
  const rng = ctx.rng(11);
  const shaftMats = [], patchMats = [];

  // ---- shafts ----
  const sheet = (zc, side) => {
    const z = zc + side * 1.3, xf = XW + 0.8 / TAN;
    const pts = [[XW, 0.8], [XW, 4.5], [XW + RUN, 4.5 - 1.55], [XW + RUN, 0.02], [xf, 0.02]];
    const pos = [], uv = [];
    for (const [x, y] of pts) { pos.push(x, y, z); uv.push((x - XW) / RUN, (y + TAN * (x - XW) - 0.8) / 3.7); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uv), 2));
    geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
    return geo;
  };
  const shaftMat = () => new ShaderMaterial({
    ...addBlend, side: THREE.DoubleSide, depthTest: true,
    uniforms: { uSeal: shared.uSeal, uPh: { value: 0 }, uAmt: { value: 1 }, uHalo: { value: new Color(P.haloRay) }, uCore: { value: new Color(P.coreRay) } },
    vertexShader: "varying vec2 vUv; varying vec3 vWP; void main() { vUv = uv; vWP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vWP, 1.0); }",
    fragmentShader: `${SEAL_CLEAR} uniform float uPh; uniform float uAmt; uniform vec3 uHalo; uniform vec3 uCore; varying vec2 vUv; varying vec3 vWP;
      void main() {
        float along = vUv.x, band = vUv.y;
        float halo = step(0.0, band) * (1.0 - step(1.0, band));
        float core = step(0.18, band) * (1.0 - step(0.82, band));
        float stripe = 0.7 + 0.3 * step(0.0, sin(18.0 * along - uPh + 3.0 * band));
        float fade = smoothstep(0.0, 0.04, along) * (1.0 - smoothstep(0.6, 1.0, along));
        vec3 c = (uHalo * 0.14 * halo + uCore * 0.14 * core) * stripe * fade * uAmt;
        gl_FragColor = vec4(c * sealClear(vWP), 0.0);
      }`,
  });
  for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
    const mat = shaftMat(); shaftMats.push(mat);
    const m = new THREE.Mesh(sheet(WIN.zc[k], side), mat); m.frustumCulled = false; m.renderOrder = 3; g.add(m);
  }

  // ---- floor patches ----
  const patchMat = () => new ShaderMaterial({
    ...overBlend, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uSeal: shared.uSeal, uShift: { value: 0 }, uAmt: { value: 1 }, uFill: { value: new Color(P.coreRay) }, uRim: { value: new Color("#d9a05e") } },
    vertexShader: "varying vec2 vUv; varying vec3 vWP; void main() { vUv = uv; vWP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vWP, 1.0); }",
    fragmentShader: `${SEAL_CLEAR} uniform float uShift; uniform float uAmt; uniform vec3 uFill; uniform vec3 uRim; varying vec2 vUv; varying vec3 vWP;
      void main() {
        vec2 q = (vUv - 0.5) * vec2(6.3, 3.0);
        float qx = q.x - uShift;
        float inR = step(abs(qx), 3.0) * step(abs(q.y), 1.4);
        float inner = step(abs(qx), 2.96) * step(abs(q.y), 1.36);
        float cutV = step(abs(q.y), 0.06), cutH = step(abs(qx - 0.4), 0.07);
        float rim = inR * (1.0 - inner);
        float body = inner * (1.0 - max(cutV, cutH));
        float endFade = (1.0 - smoothstep(2.2, 3.0, abs(qx)));
        vec3 col = mix(uFill, uRim, rim);
        float a = (0.30 * body * endFade + 0.55 * rim * (1.0 - cutV)) * uAmt * sealClear(vWP);
        gl_FragColor = vec4(col, a);
      }`,
  });
  for (let k = 0; k < 3; k++) {
    const mat = patchMat(); patchMats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.0).rotateX(-Math.PI / 2), mat);
    m.position.set(-1.45, 0.012, WIN.zc[k] + 0.2); m.renderOrder = 2; g.add(m);
  }

  // ---- dust motes: 8 per shaft pair, drifting 0.05 m/s on twos ----
  const NM = 24, base = [], posA = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) base.push({ k: i % 3, a: 0.05 + rng() * 0.75, b: 0.08 + rng() * 0.84, r: rng(), ph: rng() * 6.28 });
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  const moteMat = new ShaderMaterial({
    ...addBlend, depthTest: true,
    uniforms: { uSeal: shared.uSeal, uRes: ctx.engine.shared.uRes, uSize: { value: 0.045 }, uCol: { value: new Color(P.mote) } },
    vertexShader: `${SEAL_CLEAR} uniform vec2 uRes; uniform float uSize; varying float vK;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * 0.5 * uRes.y * projectionMatrix[1][1] / max(-mv.z, 0.1), 1.6, 12.0);
        vK = sealClear(wp.xyz);
      }`,
    fragmentShader: "uniform vec3 uCol; varying float vK; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float core = 1.0 - step(0.26, d); gl_FragColor = vec4(uCol * (0.45 + 0.9 * core) * vK, 0.0); }",
  });
  const motes = new THREE.Points(pg, moteMat); motes.frustumCulled = false; motes.renderOrder = 6; g.add(motes);
  const placeMotes = (ts) => {
    base.forEach((m, i) => {
      const al = (m.a + 0.0035 * ts) % 0.8 + 0.05, x = XW + al * RUN;
      const s = 0.8 + ((m.b + 0.012 * ts + 0.03 * Math.sin(ts * 0.6 + m.ph)) % 1) * 3.7;
      const y = Math.max(0.12, Math.min(4.3, s - TAN * (x - XW)));
      const z = WIN.zc[m.k] + (m.r - 0.5) * 2.4 + 0.02 * ts % 0.3;
      posA[i * 3] = x; posA[i * 3 + 1] = y; posA[i * 3 + 2] = z;
    });
    pg.attributes.position.needsUpdate = true;
  };
  placeMotes(0);

  // ---- the low sun's halo: a far billboard, additive, warms and grows after the bell (shot 7) ----
  const sunMat = new ShaderMaterial({
    ...addBlend, depthTest: true,
    uniforms: { uAmt: { value: 0 }, uCol: { value: new Color(P.sunset) } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uAmt; uniform vec3 uCol; varying vec2 vUv; void main() { vec2 q = (vUv - 0.5) * 2.0; float r = length(q); float g = exp(-r * r * 6.0) * (1.0 - smoothstep(0.85, 1.0, r)); float band = step(r, 0.34) * 0.5 + step(r, 0.62) * 0.25; gl_FragColor = vec4(uCol * (g * 0.5 + band * 0.18) * uAmt, 0.0); }",
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(190, 190), sunMat); sun.frustumCulled = false; sun.renderOrder = -5;
  sun.position.copy(sunDir()).multiplyScalar(330);
  sun.onBeforeRender = (_r, _s, cam) => { sun.quaternion.copy(cam.quaternion); };
  g.add(sun);

  return {
    group: g,
    update(ts, dt, cue) {
      const warm = shared.warm.value;
      for (const m of shaftMats) {
        m.uniforms.uPh.value = 0.35 * ts;
        m.uniforms.uHalo.value.set(P.haloRay).lerp(new Color(P.sunset), warm * 0.8);
        m.uniforms.uCore.value.set(P.coreRay).lerp(new Color("#ffc080"), warm * 0.6);
        m.uniforms.uAmt.value = 1 + 0.04 * Math.sin(2 * Math.PI * 0.1 * cue.t) - 0.1 * warm;
      }
      patchMats.forEach((m, i) => {
        m.uniforms.uShift.value = 0.3 * Math.sin(0.5 * ts + i * 0.9);
        m.uniforms.uFill.value.set(P.coreRay).lerp(new Color("#ffc080"), warm * 0.6);
        m.uniforms.uAmt.value = 1 - 0.1 * warm;
      });
      placeMotes(ts);
      sunMat.uniforms.uAmt.value = 0.25 + 0.75 * warm;
    },
  };
}
