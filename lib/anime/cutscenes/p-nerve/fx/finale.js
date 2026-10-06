// p-nerve FX: sky and break. Bible 3.2 + FX 5 (realm gap: monochrome plate, 24 radial lines, 3 red apples only),
// 3.19 + FX 8 (white crack web 2 px on #0b0e10, flat cel shards tumbling and falling).
// Cues read: realm, crack, crunch (the break), shatter.
import * as THREE from "three";
import { BEHIND_VS, MASK, HASH, billboard, shader, triSoup, clamp01, sstep } from "./common.js";

export default function finale(ctx, S) {
  const { U, TL, A, D } = S;
  const group = new THREE.Group(); group.name = "nerve-finale";
  const rng = ctx.rng(47);
  const own = [];
  const realmEv = TL.evs("realm", D.realm)[0], crackEv = TL.evs("crack", D.crack)[0], crunchEv = TL.evs("crunch", D.crunch)[0], shEv = TL.evs("shatter", D.shatter)[0];

  // ---- REALM GAP: a 22 m disc at REALM_AT, normal blending, three flat greys + the only colour, three #c91a14 apples.
  // d = |p|, R = uK (open amount). Core gradient g = 1 - smoothstep(0, R, d), c = mix(ash #1a1a18, white, g^3),
  // posterised to 3 grey levels. 24 radial streaks: sector = a 24 / 2pi, drawn where fract < .18 and hash(cell) > .3, white at 30%.
  // Broken bones: 18 inward spikes on the rim, height .2 R (.5 + hash). Dead tree #20201c: trunk + 5 branch segments
  // (distance to segment < .022); apples sit on the branch tips. Ink ring #0b0e10 at the rim.
  const realm = billboard({
    U, additive: false, size: [22, 22], uniforms: { uK: { value: 0 } },
    fs: /* glsl */ `
      uniform float uK; varying vec2 vUv; varying vec3 vW;
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
      void main(){
        vec2 p = (vUv - .5) * 2.; float d = length(p); float R = uK * .98;
        if (R < .01 || d > R) discard;
        float a = atan(p.y, p.x);
        float g = 1. - smoothstep(0., R, d);
        vec3 c = mix(vec3(.102, .102, .094), vec3(1.), pow(g, 3.));
        float lum = floor(dot(c, vec3(.333)) * 3. + .5) / 3.; c = vec3(lum);
        float sec = a / 6.28318 * 24.; float cell = floor(sec);
        if (fract(sec) < .18 && h11(cell) > .3) c = mix(c, vec3(1.), .3);
        float s = abs(fract(a / 6.28318 * 18.) - .5) * 2.; float hb = .5 + h11(floor(a / 6.28318 * 18.));
        if (d > R * .8 && d > R * (1. - .2 * (1. - s) * hb)) c = vec3(.561, .553, .525);
        float tr = min(step(abs(p.x), .035) * step(p.y, .1) * step(-R * .9, p.y), 1.);
        float br = min(min(min(seg(p, vec2(0., .1), vec2(-.34, .42)), seg(p, vec2(0., .1), vec2(.3, .46))), min(seg(p, vec2(-.17, .26), vec2(-.12, .5)), seg(p, vec2(.15, .28), vec2(.24, .12)))), seg(p, vec2(-.34, .42), vec2(-.5, .38)));
        if (tr > .5 || br < .022) c = vec3(.125, .125, .11);
        float ap = min(min(length(p - vec2(-.5, .38)), length(p - vec2(.3, .46))), length(p - vec2(-.12, .5)));
        if (ap < .05) c = vec3(.788, .102, .078);
        if (d > R - .025) c = vec3(.043, .055, .063);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  realm.position.set(...A.realm); realm.renderOrder = 1; group.add(realm);

  // ---- CRACK WEB: fullscreen quad just behind the seal (BEHIND_VS), normal blending.
  // p = (uv - .5)(aspect, 1) - c. 17 spokes: spoke i at a_i = 2 pi i / 17 + .25 (h - .5), zigzag z = .12 r (h(floor(14 r) + 3 i) - .5);
  // perpendicular distance dist = |sin(a - a_i + z)| r ; the white line is dist <= 1 px (so 2 px wide), the ink line dist <= 2.4 px (so 4.8 px wide),
  // length_i = reach (.45 + .7 h_i), reach = 1.4 grow.  4 broken rings at r_k = .13 + .19 k wobbling .05 sin(5a + 9 r_k), gaps from hash(sector).
  const crack = shader({
    vs: BEHIND_VS, additive: false, depthTest: true,
    uniforms: { uGrow: { value: 0 }, uFade: { value: 1 }, uAspect: { value: 16 / 9 }, uPx: { value: 1 / 720 } },
    fs: HASH + /* glsl */ `
      uniform float uGrow, uFade, uAspect, uPx; varying vec2 vUv;
      void main(){
        if (uGrow <= 0.) discard;
        vec2 p = (vUv - .5) * vec2(uAspect, 1.) - vec2(.14, .08);
        float r = length(p), a = atan(p.y, p.x);
        float reach = uGrow * 1.4; const float N = 17.;
        float sec = a / 6.28318 * N; float i = floor(sec + .5);
        float ai = i / N * 6.28318 + (h11(i) - .5) * .25;
        float z = (h11(floor(r * 14.) + i * 3.) - .5) * .12 * r;
        float da = a - ai + z; da = mod(da + 3.14159, 6.28318) - 3.14159;
        float dist = abs(sin(da)) * r;
        float len = reach * (.45 + .7 * h11(i + 4.));
        float on = step(r, len) * step(.02, r);
        float w = step(dist, uPx) * on, k = step(dist, uPx * 2.4) * on;
        for (int j = 0; j < 4; j++){
          float rk = .13 + .19 * float(j);
          float rr = rk * (1. + .05 * sin(a * 5. + rk * 9.));
          float gap = step(.35, h11(floor(sec) + rk * 20.)) * step(rr, reach);
          w = max(w, step(abs(r - rr), uPx) * gap); k = max(k, step(abs(r - rr), uPx * 2.4) * gap);
        }
        float core = step(r, .03 * uGrow); w = max(w, core); k = max(k, step(r, .045 * uGrow));
        if (k < .5) discard;
        vec3 c = w > .5 ? vec3(1.) : vec3(.043, .055, .063);
        gl_FragColor = vec4(c, uFade);
      }`,
  });
  const cg = new THREE.PlaneGeometry(1, 1);
  const crackMesh = new THREE.Mesh(cg, crack); crackMesh.frustumCulled = false; crackMesh.renderOrder = 8; group.add(crackMesh); own.push(cg, crack);

  // ---- SHARDS: 240 flat triangles, 0.4 to 1.6 m, from a shell (r 5 to 24 m) around the seal, y biased up.
  // After the break: centre = C + V a - (0, g a^2 / 2, 0), g = 3.2 ; orientation = Rodrigues(axis, w a + w 0.3).
  // Flat 2-tone (lit step n.L), shadow hue shift x(.85,.95,1), tones from stone / bone, ink edge at bary < .06.
  // The shard that would cross the seal's screen column shrinks to nothing (sealMask) so the seal is never covered.
  const NSH = 240, chest0 = new THREE.Vector3(); ctx.seal.chest(chest0);
  const tones = [[.553, .58, .596], [.298, .325, .345], [.129, .157, .173], [.561, .553, .525], [.298, .325, .345]];
  const sg = triSoup(NSH,
    () => { const s = 0.4 + rng() * 1.2, a0 = rng() * 6.28, v = []; for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1 + (rng() - .5) * .7, r = s * (.55 + rng() * .45); v.push([Math.cos(a) * r, Math.sin(a) * r, 0]); } return [v]; },
    [["aC", 3], ["aV", 3], ["aR", 4], ["aT", 3], ["aD", 1]],
    () => {
      const th = rng() * 6.283, y = -0.15 + rng() * 1.15, rr = 5 + rng() * 19, c = Math.sqrt(1 - y * y > 0 ? 1 - y * y : 0);
      const dx = Math.cos(th) * c, dz = Math.sin(th) * c, ax = new THREE.Vector3(rng() - .5, rng() - .5, rng() - .5).normalize(), tn = tones[Math.floor(rng() * tones.length)];
      return {
        aC: [chest0.x + dx * rr, chest0.y + y * rr * 0.9 + 2, chest0.z + dz * rr], aV: [dx * (0.4 + rng() * 1.2), -0.5 - rng(), dz * (0.4 + rng() * 1.2)],
        aR: [ax.x, ax.y, ax.z, (rng() < .5 ? -1 : 1) * (1 + rng() * 3)], aT: tn, aD: [rng() * 0.5],
      };
    });
  const sm = new THREE.ShaderMaterial({
    uniforms: { ...U, uT: { value: 0 }, uBreak: { value: 1e9 } }, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: MASK + /* glsl */ `
      attribute vec3 aC, aV, aN, aB, aT; attribute vec4 aR; attribute float aD; uniform float uT, uBreak;
      varying vec3 vN, vB, vT;
      vec3 rot(vec3 v, vec3 k, float a){ return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1. - cos(a)); }
      void main(){
        float age = uT - uBreak - aD;
        vec3 c = aC + aV * max(age, 0.) - vec3(0., 1.6 * age * age, 0.);
        float m = sealMask(c) * smoothstep(1., 3., length(c - cameraPosition)) * (1. - smoothstep(5., 5.8, age));
        float ang = aR.w * (age + .3);
        vN = rot(aN, aR.xyz, ang); vB = aB; vT = aT;
        gl_Position = age < 0. ? vec4(2., 2., 2., 1.) : projectionMatrix * viewMatrix * vec4(c + rot(position, aR.xyz, ang) * m, 1.);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN, vB, vT;
      void main(){
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float lit = step(0., dot(n, normalize(vec3(.4, .8, .45))));
        vec3 c = vT * mix(vec3(.55 * .85, .55 * .95, .55), vec3(1.), lit);
        if (min(vB.x, min(vB.y, vB.z)) < .06) c = vec3(.043, .055, .063);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const shards = new THREE.Mesh(sg, sm); shards.frustumCulled = false; group.add(shards); own.push(sg, sm);
  const px = new THREE.Vector2();

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      // realm: open 1.4 s (smooth), hold, close over the last 1.2 s of its dur
      const ra = ct - realmEv.t, dur = realmEv.dur;
      realm.material.uniforms.uK.value = ra < 0 || ra > dur ? 0 : sstep(0, 1.4, ra) * (1 - sstep(dur - 1.2, dur, ra));
      // crack: grows over `dur`, fades out .25 s after the break
      crack.uniforms.uGrow.value = clamp01((ct - crackEv.t) / Math.max(0.1, crackEv.dur));
      crack.uniforms.uFade.value = ct < crunchEv.t ? 1 : 1 - clamp01((ct - crunchEv.t) / 0.25);
      crack.uniforms.uAspect.value = ctx.aspect();
      try { ctx.engine.renderer.getDrawingBufferSize(px); if (px.y > 0) crack.uniforms.uPx.value = 1 / px.y; } catch (e) { /* default 720 p */ }
      sm.uniforms.uT.value = Math.floor(ct * 12) / 12; sm.uniforms.uBreak.value = shEv.t;
    },
    dispose() { for (const o of own) o.dispose?.(); realm.geometry.dispose(); realm.material.dispose(); },
  };
}
