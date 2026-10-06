// E11 lightning bolt + strike, sky dusk-drop (shot 5), ground flash + ring (shot 6).
// Bolt: midpoint-displacement polyline (jag 8 m, 75 m tall) + 5 forks, rebuilt per drawing with a per-drawing seed.
// Visible f162-169 (6.75-7.05 s) on twos, hidden on drawing n%3==1. Core #fffbe0, mid #ffd24a, glow #ff8a3a. Additive.
import { makeRibbon, win, smooth } from "./util.js";

export default function buildStrike(ctx, O) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const col = (m, c, mid, glow) => { m.U.uCore.value.set(c); m.U.uMid.value.set(mid); m.U.uGlow.value.set(glow); };
  const main = makeRibbon(THREE, 40, "add", {}); col(main, "#fffbe0", "#ffd24a", "#ff8a3a"); group.add(main.mesh);
  const forks = []; for (let i = 0; i < 5; i++) { const f = makeRibbon(THREE, 14, "add", {}); col(f, "#fffbe0", "#ffd24a", "#ff8a3a"); forks.push(f); group.add(f.mesh); }

  // jagged polyline from a to b: recursive midpoint displacement, amplitude halves each level (fractal lightning)
  function jag(a, b, amp, depth, rnd, out) {
    if (depth === 0) { out.push(b); return; }
    const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(.5);
    m.x += (rnd() - .5) * amp; m.z += (rnd() - .5) * amp * .6;
    jag(a, m, amp * .55, depth - 1, rnd, out); jag(m, b, amp * .55, depth - 1, rnd, out);
  }
  const tgt = new THREE.Vector3(), top = new THREE.Vector3();

  // sky dusk: a dark lapis card at the far end of the sky only (behind titans); alpha = 20% sky-value drop
  const dusk = new THREE.Mesh(new THREE.PlaneGeometry(1800, 900),
    new THREE.MeshBasicMaterial({ color: "#24100c", transparent: true, opacity: 0, depthWrite: false, fog: false }));
  dusk.position.set(O[0], O[1] + 80, O[2] - 520); dusk.frustumCulled = false; dusk.renderOrder = -1; group.add(dusk);

  // ground flash disc + expanding ring at the seal's feet. radial: flash = (1-r)^2 * e^{-age*k}, ring = gaussian on |r - R(age)|
  const gU = { uK: { value: 0 }, uAge: { value: 0 }, uC: { value: new THREE.Color("#e9a252") }, uC2: { value: new THREE.Color("#ffd24a") } };
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: gU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: "varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: /* glsl */ `uniform float uK,uAge; uniform vec3 uC,uC2; varying vec2 vP;
      void main(){ float r=length(vP); if (r>1.) discard;
        float f = pow(1.-r,2.)*exp(-uAge*6.);                       // 4-frame ground flash
        float R = clamp(uAge*2.2,0.,1.), ring = exp(-pow((r-R)*14.,2.))*(1.-R); // 12 m ring racing out
        vec3 c = uC*f*.9 + uC2*ring*1.2; gl_FragColor = vec4(c*uK,1.); }`,
  }));
  flash.rotation.x = -Math.PI / 2; flash.frustumCulled = false; group.add(flash);

  // pre-glow: a soft orb above the seal in shot 5 (the bolt aims). Billboard-free: a camera-facing sprite.
  const orb = new THREE.Sprite(new THREE.SpriteMaterial({ color: "#ffd24a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  orb.scale.setScalar(14); group.add(orb);

  return {
    group,
    update(t, dt, cue) {
      const sealP = ctx.seal.group.position, s = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
      const dk = win(cue, t, "dusk", 6.4, 6.8);
      const stk = win(cue, t, "strike", 6.75, 7.05);
      // sky value drops 20% over shot 5, recovers over 1.2 s after the strike
      dusk.material.opacity = 0.2 * dk.k * (1 - smooth(0, 1.2, stk.since < Infinity ? stk.since - 0.3 : 0));
      // pre-glow orb above the seal: 0 -> 1 over shot 5
      orb.position.set(sealP.x + 3, sealP.y + 38, sealP.z - 4); orb.material.opacity = 0.75 * dk.k * (stk.since < Infinity ? 0 : 1);

      // the bolt: drawing index n counted from the strike start on 12 fps; hidden at n%3==1
      const since = stk.since, nDraw = Number.isFinite(since) ? Math.floor(since * 12) : -1, live = since >= 0 && since < 0.3 && nDraw >= 0 && nDraw % 3 !== 1;
      if (live) {
        const rnd = ctx.rng(5000 + nDraw);
        top.set(sealP.x + 5 + (rnd() - .5) * 4, sealP.y + 75, sealP.z - 5);
        tgt.set(sealP.x, sealP.y + 1.25 * s + 0.6, sealP.z); // stops short of the head: the seal is never covered
        const pts = [top.clone()]; jag(top, tgt, 8, 5, rnd, pts);
        const n = pts.length;
        main.set(pts, u => 0.25 + 1.1 * Math.sin(u * Math.PI) * 0.6 + (u > .95 ? -0.15 : 0), u => 1 - smooth(.9, 1, u));
        main.U.uI.value = 1.4; main.U.uT.value = t;
        forks.forEach(f => {
          const from = pts[4 + Math.floor(rnd() * (n - 12))], out = [from.clone()];
          const dirx = (rnd() - .5) * 26, dirz = (rnd() - .5) * 10, len = 12 + rnd() * 14;
          const end = new THREE.Vector3(from.x + dirx, from.y - len, from.z + dirz);
          jag(from, end, 5, 3, rnd, out);
          f.set(out, u => 0.18 * (1 - u * .8), u => 1 - u); f.U.uI.value = 1.0; f.U.uT.value = t;
        });
      } else { main.hide(); forks.forEach(f => f.hide()); }

      // ground flash: 4 frames, plus shock ring over 0.6 s. Placed at the seal's feet, radius 12 m x seal scale.
      const age = Number.isFinite(since) ? since : 99;
      flash.position.set(sealP.x, sealP.y + 0.06, sealP.z); flash.scale.setScalar(12);
      gU.uAge.value = age; gU.uK.value = age < 0.8 ? 1 : 0;
      flash.visible = age < 0.8;
    },
    dispose() { main.dispose(); forks.forEach(f => f.dispose()); dusk.geometry.dispose(); dusk.material.dispose(); flash.geometry.dispose(); flash.material.dispose(); orb.material.dispose(); },
  };
}
