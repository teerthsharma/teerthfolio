// THE COIN (Misaka's arcade coin with a tiny seal stamp) and its orange streak. Also the amber rise (f116-163).
//
// Coin   radius .17 m, thickness .045 m, 24 ridges. Face #ffc34a, edge #ff9b1a, stamp + ink hull #7a3a00, one specular dot #fff8e0.
//   toss  k = (ts - 6.4) / .4;  y = tip.y + .75 * 4 k (1 - k);  angle = 7 pi k (7 half-turns) on twos, about x (edge-on from a profile lens).
//   flick one SMEAR frame at ts in [6.8, 6.8 + 1/12): the coin is stretched x3 along the beam axis and goes white-gold; then it is gone.
//   streak 1.2 m along +x for 6 frames (#ffa927 body, #ffd23a tip), a strip tapering from the coin.
//   held  16.7 s: the coin pops (0 -> 1.25 -> 1 over 4 frames) above the right shoulder and faces the lens (quaternion = camera).
// Amber  each bushing fills from the base: h = H easeIn(k), k = (ts - 4.85) / (6.8 - 4.85); an additive cylinder with a hard
//        bright band at the waterline and a hard rim on the silhouette, plus a pool disc on the glass, r = 1.3 k.
import { stripGeo, strip, mat, NZ, sstep, clamp01, coinTip } from "./lib.js";

export function makeCoin(ctx, sh, T) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "coin";
  const geo = new THREE.CylinderGeometry(0.17, 0.17, 0.045, 24, 1);
  const bodyU = { uSmear: { value: 0 } };
  const bodyM = new THREE.ShaderMaterial({
    uniforms: bodyU, toneMapped: false,
    vertexShader: `varying vec3 vN; varying vec3 vL; varying vec3 vO; void main() { vN = normalize(normalMatrix * normal); vO = normal; vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `
      uniform float uSmear; varying vec3 vN; varying vec3 vL; varying vec3 vO;
      vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
      void main() {
        vec3 n = normalize(vN); float lit = step(.3, dot(n, normalize(vec3(-.4, .6, .7))));
        vec3 col;
        if (abs(vO.y) > .9) {
          vec2 p = vL.xz; float r = length(p);
          col = lit > .5 ? lin(vec3(1., .765, .29)) : lin(vec3(.92, .6, .12));
          if (abs(r - .135) < .011) col = lin(vec3(.478, .227, 0.));                   // rim ring
          // the tiny seal stamp: head disc + two ear dots + a flipper dash
          if (length(p - vec2(0., .01)) < .05 || length(p - vec2(-.05, -.035)) < .02 || length(p - vec2(.05, -.035)) < .02 || (abs(p.x) < .045 && abs(p.y - .062) < .008)) col = lin(vec3(.478, .227, 0.));
          if (length(p - vec2(-.085, .08)) < .02 && lit > .5) col = lin(vec3(1., .973, .878)); // the single hard specular dot
        } else {
          float a = atan(vL.z, vL.x); float ridge = step(.5, fract(a * 24. / 6.28318));
          col = lin(vec3(1., .608, .102)) * (lit > .5 ? 1. : .72) * (ridge > .5 ? 1. : .84);
        }
        col = mix(col, vec3(1., .95, .75) * 1.6, uSmear);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const hullM = new THREE.MeshBasicMaterial({ color: "#7a3a00", side: THREE.BackSide, toneMapped: false });
  const inner = new THREE.Group();
  const coinMesh = new THREE.Mesh(geo, bodyM), hull = new THREE.Mesh(geo, hullM);
  hull.scale.set(1.14, 1.5, 1.14);
  inner.add(coinMesh, hull); inner.rotation.x = Math.PI / 2; // the face (cap normal +y) now looks +z
  const coin = new THREE.Group(); coin.add(inner); coin.visible = false; group.add(coin);
  coinMesh.renderOrder = hull.renderOrder = 9;

  // streak
  const sgeo = stripGeo(THREE, 24);
  const streakFs = /* glsl */ `
    uniform float uK; varying float vX; varying float vV; varying float vU;
    void main() {
      float r = abs(vV);
      if (r > 1.) discard;
      float f = 1. - vU;                        // 1 at the coin, 0 at the tail
      vec3 c = r < .35 ? vec3(1., .824, .227) : vec3(1., .663, .153);
      if (r > .8) c = vec3(.91, .278, .039);   // coloured outline band
      c = pow(c, vec3(2.2));
      gl_FragColor = vec4(c * 1.5, uK * step(vU, .98) * (step(.18, vn(vec2(vX * 6., floor(vU * 9.))) + f * .55)));
    }`;
  const streak = strip(THREE, sh, sgeo, streakFs, { uK: { value: 1 } }, { cone: 1, tip: 0.5, order: 10 });
  group.add(streak);

  const tip = new THREE.Vector3(), q = new THREE.Quaternion();
  function update(t, dt, cue) {
    const ts = cue.ts, s = ctx.seal.scale ?? 1;
    coinTip(ctx.seal, tip);
    let vis = false, smear = 0, sx = 1;
    const k = (ts - T.coinToss) / (T.shot - T.coinToss);
    coin.quaternion.identity(); coin.scale.setScalar(1);
    if (ts >= T.coinToss - 0.2 && ts < T.coinToss) { // resting on the thumb until the toss
      coin.position.copy(tip); vis = true; coin.rotation.set(0, 0, 0);
    } else if (k >= 0 && k < 1) {
      const kk = Math.floor(k * 10) / 10 + 0.0; // twos-friendly stepping of the arc
      coin.position.set(tip.x, tip.y + 0.75 * s * 4 * k * (1 - k), tip.z);
      coin.rotation.set(7 * Math.PI * kk, 0, 0); vis = true;
    } else if (ts >= T.shot && ts < T.shot + 1 / 12) { // the smear frame
      coin.position.set(tip.x + 0.3, tip.y, tip.z); coin.rotation.set(0, 0, 0); coin.scale.set(3, 1, 1); vis = true; smear = 1;
    } else if (ts >= T.credit) { // held up between the flipper tips
      const a = ts - T.credit, pop = a < 4 / 24 ? 1.25 * (a / (4 / 24)) : a < 6 / 24 ? 1.25 - 0.25 * ((a - 4 / 24) / (2 / 24)) : 1;
      coin.position.set(ctx.seal.at[0] + 0.3 * s, ctx.seal.at[1] + 0.98 * s, ctx.seal.at[2] + 0.18 * s);
      ctx.player.camera.getWorldQuaternion(q); coin.quaternion.copy(q); coin.scale.setScalar(pop * (1 + 0.0 * s)); vis = true;
    }
    coin.visible = vis; bodyU.uSmear.value = smear; void sx;
    // streak: charges with the toss (short), full 1.2 m for 6 frames after the flick
    const fl = ts - T.shot;
    const sk = fl >= 0 && fl < 6 / 24 ? 1 : (k > 0.55 && k < 1 ? (k - 0.55) / 0.45 * 0.5 : 0);
    streak.visible = sk > 0.02;
    if (streak.visible) {
      const u = streak.userData.u;
      u.uOrigin.value.set(tip.x + 0.1, tip.y, tip.z); u.uLen.value = 1.2 * (fl >= 0 ? 1 : 0.5); u.uR.value = fl >= 0 ? 0.11 : 0.05;
      u.uK.value = sk;
    }
    void dt;
  }
  function dispose() { geo.dispose(); bodyM.dispose(); hullM.dispose(); sgeo.dispose(); streak.material.dispose(); }
  return { group, update, dispose };
}

export function makeAmber(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "amber";
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true); cyl.translate(0, 0.5, 0);
  const mk = () => mat(THREE, {
    add: true, u: { uK: { value: 0 } },
    vs: `varying float vY; varying vec3 vN; varying vec3 vV; void main() { vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fs: `uniform float uK; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
        vec3 c = pow(vec3(1., .663, .153), vec3(2.2));
        float grad = mix(.35, .8, vY);
        float band = step(.93, vY);                                   // the hard bright waterline
        float hardRim = step(.7, rim);
        vec3 col = c * (grad + hardRim * .5) + band * pow(vec3(1., .824, .227), vec3(2.2));
        gl_FragColor = vec4(col * 1.2, .8 * uK * (.55 + .45 * step(.3, grad)));
      }`,
  });
  const mats = [mk(), mk()], cyls = mats.map((m) => { const c = new THREE.Mesh(cyl, m); c.frustumCulled = false; c.renderOrder = 4; group.add(c); return c; });
  const disc = new THREE.CircleGeometry(1, 40); disc.rotateX(-Math.PI / 2);
  const pm = mats.map(() => mat(THREE, {
    add: true, u: { uK: { value: 0 } }, vs: `varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fs: `uniform float uK; varying vec2 vP; void main() { float r = length(vP);
      vec3 c = pow(vec3(1., .702, .278), vec3(2.2));
      float a = r < .62 ? 1. : (r < .9 ? .55 : (r < 1. ? .9 : 0.));  // hard-banded pool with a bright rim
      gl_FragColor = vec4(c * 1.2, a * .8 * uK); }`,
  }));
  const pools = pm.map((m) => { const p = new THREE.Mesh(disc, m); p.frustumCulled = false; p.renderOrder = 4; group.add(p); return p; });
  function update(t, dt, cue) {
    const ts = cue.ts, k = clamp01((ts - T.amber) / (T.shot - T.amber)), e = k * k; // ease-in
    const fade = 1 - sstep(T.shot + 0.3, T.shot + 1.8, ts);
    const ends = [L.A, L.B];
    for (let i = 0; i < 2; i++) {
      const c = cyls[i], p = pools[i], E = ends[i];
      const on = e > 0.002 && fade > 0.01;
      c.visible = p.visible = on;
      if (!on) continue;
      c.position.set(E[0], L.base, E[2]); c.scale.set(0.31, Math.max(0.01, L.bushH * e), 0.31);
      mats[i].uniforms.uK.value = fade;
      p.position.set(E[0], L.base + 0.02, E[2]); p.scale.setScalar(Math.max(0.05, 1.3 * k)); pm[i].uniforms.uK.value = fade * clamp01(k * 3);
    }
    void dt;
  }
  function dispose() { cyl.dispose(); disc.dispose(); for (const m of [...mats, ...pm]) m.dispose(); }
  return { group, update, dispose };
}
