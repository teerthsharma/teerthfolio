// THE SHARD'S EDGE AND THE SWING (bible 3.8, FX 6, egg 3).
//
//   aura    a hollow blade outline around the drawn gravestone: pale contour #ffe7a8 (energy-contour language, ref 04) with a gold #ffb524
//           outermost line, 1.5 px-ish. The mesh is a camera-facing ribbon about the blade axis, so it is a contour only (interior discarded)
//           and any misalignment with the cast's solid shard reads as a halo, never as a second blade.
//             half-width  w(v) = 0.10 m * (0.8 + 0.2 smoothstep(0, .12, v)) * (1 - ((v - .8)/.2)^2 for v > .8)     (0.2 m wide, pointed tip)
//             curve       lateral offset 0.05 L v^2   (the 5% curve);   outline = the band 0.85 < |x| < 1 of a ribbon 1.18 x wider than the blade.
//             rises from the sleeper 1.0 m/s over 6.4-9.0 (base y = -1.9 + t'), then held overhead at seal-local (0, 0.85, 0.15) until 26.8.
//   smear   the swing, 26.8-27.25 at 24 fps: anticipation 3 frames, smear 2, strike 4, hold 2 (frame.js swingTheta). A swept sector between
//           theta(t - 2 frames) and theta(t), radius 1.0-2.1 m x scale, in the plane PARALLEL TO THE SCREEN (fwd = up x camH, so the swing is
//           never toward the lens and never over the seal, whatever the camera):
//             p(u, v) = P + r(v) (cos th(u) up + sin th(u) fwd),  th = mix(th0, th1, u), r = mix(r0, r1, v)
//             coverage: v in [0.6 (1-u)^1.5, 1 - 0.15 (1-u)]   (a crescent that thins to its trailing tail)
//             colour: leading edge u > 0.93 pale-hot; body stripes gold/pale by floor(7 v) with 35% of the streaks dropped (cel speed gaps).
//           ONE frame of Susanoo purple #7a3fc0 (egg 3: distinct from p-caustic's blue) at 27.0, then crimson-gold:  the leading edge goes
//           crimson #e11d2e -> gold #ffb524 over the next frames.
import { toWorld, dirToWorld, swingTheta } from "./frame.js";

export function blade(ctx, T) {
  const { THREE } = ctx, seal = ctx.seal, g = new THREE.Group();
  const v = new THREE.Vector3(), a = new THREE.Vector3();
  const C = (h) => new THREE.Color(h);

  // ---- the aura
  const aGeo = new THREE.PlaneGeometry(1, 1, 1, 24);
  const aMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, depthTest: true,
    uniforms: { uBase: { value: new THREE.Vector3() }, uAxis: { value: new THREE.Vector3(0, 1, 0) }, uLen: { value: 1.9 }, uHalf: { value: 0.1 }, uPale: { value: C("#ffe7a8") }, uGold: { value: C("#ffb524") }, uFlick: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform vec3 uBase; uniform vec3 uAxis; uniform float uLen; uniform float uHalf; varying vec2 vS;
      void main() {
        float vv = position.y + 0.5, sx = position.x * 2.0; vS = vec2(sx, vv);
        float tip = vv > 0.8 ? 1.0 - pow((vv - 0.8) / 0.2, 2.0) : 1.0;
        float hw = uHalf * (0.8 + 0.2 * smoothstep(0.0, 0.12, vv)) * tip * 1.18;
        vec3 side = normalize(cross(uAxis, normalize(cameraPosition - uBase)));
        vec3 p = uBase + uAxis * uLen * vv + side * (sx * hw + 0.05 * uLen * vv * vv);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uPale; uniform vec3 uGold; uniform float uFlick; varying vec2 vS;
      void main() {
        float ax = abs(vS.x);
        if (ax < 0.84 && vS.y < 0.97) discard;                       // hollow: contour only
        gl_FragColor = vec4(ax > 0.95 ? uGold * 1.5 * uFlick : uPale * 1.15 * uFlick, 1.0);
      }`,
  });
  const aura = new THREE.Mesh(aGeo, aMat); aura.frustumCulled = false; aura.visible = false;

  // ---- the smear sector
  const sGeo = new THREE.PlaneGeometry(1, 1, 24, 1);
  const sMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, depthTest: true,
    uniforms: { uP: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uTh: { value: new THREE.Vector2() }, uR: { value: new THREE.Vector2(1, 2) }, uPhase: { value: 0 }, uHeat: { value: 0 }, uSeed: { value: 0 },
      uPale: { value: C("#ffe7a8") }, uGold: { value: C("#ffb524") }, uCrim: { value: C("#e11d2e") }, uPur: { value: C("#7a3fc0") } },
    vertexShader: /* glsl */ `
      uniform vec3 uP; uniform vec3 uUp; uniform vec2 uTh; uniform vec2 uR; varying vec2 vUv;
      void main() {
        float u = position.x + 0.5, vv = position.y + 0.5; vUv = vec2(u, vv);
        vec3 camH = vec3(cameraPosition.x - uP.x, 0.0, cameraPosition.z - uP.z); camH = normalize(camH + vec3(1e-4, 0.0, 0.0));
        vec3 fwd = normalize(cross(uUp, camH));                         // screen-parallel: the swing never comes at the lens
        float th = mix(uTh.x, uTh.y, u), r = mix(uR.x, uR.y, vv);
        vec3 p = uP + r * (cos(th) * uUp + sin(th) * fwd);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPhase; uniform float uHeat; uniform float uSeed; uniform vec3 uPale; uniform vec3 uGold; uniform vec3 uCrim; uniform vec3 uPur; varying vec2 vUv;
      float hh(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
      void main() {
        float u = vUv.x, vv = vUv.y;
        if (vv < 0.6 * pow(1.0 - u, 1.5) || vv > 1.0 - 0.15 * (1.0 - u)) discard;      // crescent that thins to a tail
        bool lead = u > 0.93;
        vec3 c;
        if (uPhase > 0.5) c = lead ? uPale * 2.0 : uPur * 1.8;                           // Susanoo purple, one frame
        else if (lead) c = mix(uCrim * 2.4, uGold * 2.8, uHeat);                         // crimson -> gold edge burn
        else { float st = floor(vv * 7.0); if (hh(st + uSeed) < 0.35 && u < 0.85) discard; c = mod(st, 2.0) < 0.5 ? uGold * 1.6 : uPale * 1.4; }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const smear = new THREE.Mesh(sGeo, sMat); smear.frustumCulled = false; smear.visible = false;
  g.add(aura, smear);

  const F = 1 / 24;
  return {
    obj: g,
    update(ts, t) {
      // aura
      const rise = Math.min(Math.max(t - T.pour[0], 0), T.pour[1] - T.pour[0]);
      const on = t >= T.pour[0] && t < 26.9; // hidden once the smear takes over; the cast's shard carries the held blade after
      aura.visible = on;
      if (on) {
        const u = aMat.uniforms;
        if (t < 9.0) { u.uBase.value.set(seal.at[0] + 2.3, seal.at[1] - 1.9 + rise, seal.at[2] - 1.4); u.uAxis.value.set(0, 1, 0); }
        else { toWorld(seal, 0, 0.85, 0.15, v); u.uBase.value.copy(v); u.uAxis.value.set(0, 1, 0); }
        u.uLen.value = 1.9 * seal.scale; u.uHalf.value = 0.1 * seal.scale;
        u.uFlick.value = 1.0 + 0.2 * ((Math.floor(t * 12) % 3) / 2); // twos flicker
      }
      // smear
      const th1 = swingTheta(t), th0 = swingTheta(t - 2 * F);
      const sw = t >= T.swing[0] && t <= T.swing[1] + 0.1 && Math.abs(th1 - th0) > 0.04;
      smear.visible = sw;
      if (sw) {
        const u = sMat.uniforms;
        toWorld(seal, 0, 0.85, 0.15, v); u.uP.value.copy(v);
        dirToWorld(seal, 0, 1, 0, a); u.uUp.value.copy(a);
        u.uTh.value.set(th0, th1); u.uR.value.set(1.0 * seal.scale, 2.1 * seal.scale);
        const k = Math.floor((t - 27.0) / F + 1e-6);              // frame index from the impact frame (f648)
        u.uPhase.value = k === 1 ? 1 : 0;                          // the single purple frame (f649, the first frame of the edge)
        u.uHeat.value = Math.min(1, Math.max(0, (k - 2) / 6));
        u.uSeed.value = Math.floor(t * 12);
      }
    },
    dispose() { aGeo.dispose(); aMat.dispose(); sGeo.dispose(); sMat.dispose(); },
  };
}
