// E: aureole (2 px #c99a4a ring at 1.6 m + 4 radial rays, from f158 = 6.58 s) and E12 cube spiral ribbons (shot 7)
// + the last blue cube's flight trail (f248-260) and the catch glint (f296).
// Aureole keeps clear of the pup: ring at 1.6 m, rays only start beyond 1.75 m, drawn behind the chest by 0.8 m.
import { makeRibbon, win, smooth, clamp, GLSL_HASH } from "./util.js";

export default function buildAura(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const AU = { uT: { value: 0 }, uK: { value: 0 } };
  const aur = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: AU, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: /* glsl */ `${GLSL_HASH} uniform float uT,uK; varying vec2 vP;
      void main(){
        float r = length(vP)*2.3;                       // plane half-size 1 = 2.3 m  -> r in metres
        float fw = fwidth(r);
        // ring: 2 px at 1.6 m  (1 - smoothstep on |r-1.6| at pixel width)
        float ring = 1. - smoothstep(0., fw*1.6, abs(r - 1.6));
        // 4 radial rays rotating slowly: |sin(2*(theta - w t))| ^ 24 envelope, only beyond 1.75 m, fading to 2.3 m
        float th = atan(vP.y, vP.x) - uT*.35;
        float ray = pow(abs(sin(2.*th)), 28.) * smoothstep(1.7,1.85,r) * (1. - smoothstep(1.85,2.3,r));
        float leaf = .8 + .2*step(.5, h21(floor(vec2(th*40., r*30.)) + floor(uT*12.)));     // gold-leaf dither
        vec3 c = vec3(.788,.604,.290) * (ring*1.5 + ray*1.1) * leaf;
        gl_FragColor = vec4(c*uK, 1.);
      }`,
  }));
  aur.frustumCulled = false; group.add(aur);
  const sealC = new THREE.Vector3(), cam = new THREE.Vector3(), fwd = new THREE.Vector3();
  aur.onBeforeRender = (rr, sc, camera) => {
    // billboard toward the camera, pushed back 0.8 x scale so the ring sits behind the chest and never over the pup
    camera.getWorldPosition(cam);
    const hs = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
    ctx.seal.chest(sealC);
    fwd.subVectors(sealC, cam).normalize();
    aur.position.copy(sealC).addScaledVector(fwd, 0.8 * hs);
    aur.quaternion.copy(camera.quaternion);
    aur.scale.setScalar(2.3 * hs);
    aur.updateMatrix(); aur.matrixWorld.copy(aur.matrix);
  };
  aur.matrixAutoUpdate = false;

  // ---- cube spiral ribbons: 22 coral streaks, each a head chasing along a spiral (th = 4 pi u) from the block's top course to the mouth ----
  const NR = 22, rbs = [], r = ctx.rng(515);
  for (let i = 0; i < NR; i++) {
    const rb = makeRibbon(THREE, 20, "solid", {}); rb.U.uA.value.set(i % 5 === 0 ? "#efe4cf" : "#e96a5a"); rb.U.uB.value.set("#b8492f");
    group.add(rb.mesh); rbs.push({ rb, t0: 7.85 + (i / NR) * 2.2 + r() * .1, dur: .5 + r() * .15, ph: r() * 6.28, lift: 1 + r() * 2.5 });
  }
  // the final blue cube: lapis ribbon, nose flight f248-260, flipped f280-296 (trail only; the cube mesh itself is cast's)
  const blue = makeRibbon(THREE, 20, "solid", {}); blue.U.uA.value.set("#7f9cc4"); blue.U.uB.value.set("#2f4f8f"); group.add(blue.mesh);

  const mouth = new THREE.Vector3(), block = new THREE.Vector3(), q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  const spiral = (p0, p1, u, ph, lift, hs) => {
    // line p0->p1 with a circular wobble of radius (1-u)*0.9*hs rotating th = 4 pi u about the axis, plus an arc lift sin(pi u)
    const out = tmp.clone().lerpVectors(p0, p1, u * u * (3 - 2 * u)); const th = 4 * Math.PI * u + ph, R = (1 - u) * 0.9 * hs;
    out.x += Math.cos(th) * R; out.z += Math.sin(th) * R; out.y += Math.sin(u * Math.PI) * lift * hs + Math.sin(th) * R * .5; return out;
  };
  function mouthPoint(out) {
    ctx.seal.chest(out); const hs = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
    ctx.seal.group.getWorldQuaternion(q); const f = tmp.set(0, 0, 1).applyQuaternion(q);
    out.addScaledVector(f, 0.22 * hs); out.y += 0.12 * hs; return out;
  }
  return {
    group,
    update(t, dt, cue) {
      AU.uT.value = t;
      const k = smooth(6.58, 7.0, t) * (1 - smooth(10.3, 11.0, t) * .5) * (1 - smooth(18.5, 19.5, t));
      AU.uK.value = k; aur.visible = k > 0.01;
      // the aureole persists, dimmer, through the credit; invisible pre-strike
      const hs = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
      mouthPoint(mouth);
      // the block sits beside the swollen seal: seal-local (-3.2, 0.2, -0.8) in seal units (scale applies)
      block.set(-3.2 * hs, 0.9 * hs, -0.8 * hs); ctx.seal.group.localToWorld(block);
      const eat = win(cue, t, "eat", 7.7, 10.3);
      rbs.forEach(o => {
        const u0 = (t - o.t0) / o.dur;
        if (u0 <= 0 || u0 >= 1.25 || !(eat.k > 0)) return o.rb.hide();
        const head = clamp(u0), tail = clamp(u0 - 0.35), pts = [], n = 20;
        for (let j = 0; j < n; j++) { const u = tail + (head - tail) * (j / (n - 1)); pts.push(spiral(block, mouth, u, o.ph, o.lift, hs).clone()); }
        o.rb.set(pts, u => 0.22 * hs * (0.25 + 0.75 * u), u => u);
      });
      const cf = win(cue, t, "cubeflight", 10.33, 10.83);
      if (cf.k > 0 && cf.k < 1.5 && t < 12.4) {
        const nose = mouth.clone(); nose.y += 0.1 * hs;
        const head = clamp(cf.k), tail = clamp(cf.k - 0.5), pts = [];
        for (let j = 0; j < 20; j++) { const u = tail + (head - tail) * (j / 19); pts.push(spiral(block, nose, u, 1.3, 1.6, hs).clone()); }
        blue.set(pts, u => 0.14 * hs * (0.2 + 0.8 * u), u => u);
      } else blue.hide();
    },
    dispose() { aur.geometry.dispose(); aur.material.dispose(); rbs.forEach(o => o.rb.dispose()); blue.dispose(); },
  };
}
