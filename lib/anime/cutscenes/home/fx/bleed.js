// FX 1: THE WET-WASH BLEED (open, f0-f40) + Thors's pigment bloom (f55-f67).
//
// The pocket opens on wet cream paper (#fcf3e6) and the fjord bleeds out of a hole round the pup.
// A full-screen quad placed IN CLIP SPACE at the depth of the seal plus a margin, so the seal and everything
// nearer than it is never covered (owner law: the seal is in every frame):
//     clip.z = (P * (0,0,-d,1)).z / w     with   d = viewDepth(seal) + 0.5 * scale
// Hole: p = (ndc - sealNdc) * (aspect, 1) / 2   (units of frame height),  r = |p|, a = atan(p)
//     R(k) = mix(0.42, 1.9, smoothstep(0,1,k)) + 0.18 * (0.4 + k) * (fbm(circle(a) * 2.2 + 1.3 k) - 0.5)   a noise-wobbled edge
//     paper = smoothstep(R - aa, R + aa, r)                         0 inside the hole, 1 on the paper (fwidth antialiased)
//     ring  = paper * (1 - smoothstep(R + 0.012, R + 0.045, r))     the darker pigment ring #c9c3ea hugging the edge
//     colour = mix(cream, apricot #ffb978, smoothstep(.1,.9,k)), mottled +-2.5% by fbm so no frame is one flat colour
// The hole starts at 0.42 frame heights so frame 0 is ~70% paper at most (law: no frame over 85% one colour).
import { GLSL_NOISE, clock } from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const C = clock(ctx.scene);
  const sealP = new THREE.Vector3();

  // ---- the veil ----
  const veilMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: {
      uK: { value: 0 }, uAspect: { value: 16 / 9 }, uSeal: { value: new THREE.Vector3() }, uBehind: { value: 0.55 },
      uCream: { value: new THREE.Color("#fcf3e6") }, uApricot: { value: new THREE.Color("#ffb978") }, uRing: { value: new THREE.Color("#c9c3ea") },
    },
    vertexShader: /* glsl */ `
      uniform vec3 uSeal; uniform float uBehind;
      varying vec2 vN; varying vec2 vC;
      void main() {
        vec4 sc = viewMatrix * vec4(uSeal, 1.0);
        float d = max(-sc.z + uBehind, 0.4);
        vec4 pc = projectionMatrix * vec4(0.0, 0.0, -d, 1.0);
        vec4 s4 = projectionMatrix * sc;
        vN = position.xy; vC = s4.xy / max(abs(s4.w), 1e-4);
        gl_Position = vec4(position.xy, pc.z / pc.w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK, uAspect; uniform vec3 uCream, uApricot, uRing;
      varying vec2 vN; varying vec2 vC;
      ${GLSL_NOISE}
      void main() {
        vec2 p = (vN - vC) * vec2(uAspect, 1.0) * 0.5;
        float r = length(p), a = atan(p.y, p.x);
        float e = uK * uK * (3.0 - 2.0 * uK);
        float wob = (fbm(vec2(cos(a), sin(a)) * 2.2 + 1.3 * uK) - 0.5) * 0.18 * (0.4 + uK);
        float R = mix(0.42, 1.9, e) + wob;
        float aa = fwidth(r) * 1.2 + 1e-4;
        float paper = smoothstep(R - aa, R + aa, r);
        float ring = paper * (1.0 - smoothstep(R + 0.012, R + 0.045, r));
        vec3 base = mix(uCream, uApricot, smoothstep(0.1, 0.9, uK));
        float mott = (fbm(vN * vec2(uAspect, 1.0) * 3.0) - 0.5) * 0.05;
        vec3 col = base * (1.0 + mott);
        col = mix(col, uRing, ring * 0.85);
        gl_FragColor = vec4(col, paper * 0.97);
      }`,
  });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMat);
  veil.frustumCulled = false; veil.renderOrder = 40;
  group.add(veil);

  // ---- Thors's wet bloom: a cream pigment disc under his feet that blooms and dries (he steps out of it) ----
  const bloomMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uR: { value: 0 }, uFade: { value: 1 } },
    vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uR, uFade; varying vec2 vP;
      ${GLSL_NOISE}
      // disc of radius R with a noise edge (R + 0.12 (fbm - .5)), pigment ring #c9c3ea just outside the cream
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);
        float R = uR + 0.14 * (fbm(vec2(cos(a), sin(a)) * 2.0 + uR) - 0.5);
        float aa = fwidth(r) * 1.2 + 1e-4;
        float inside = 1.0 - smoothstep(R - aa, R + aa, r);
        float ring = smoothstep(R - 0.09, R - 0.01, r) * inside;
        vec3 col = mix(vec3(0.988, 0.953, 0.902), vec3(0.788, 0.765, 0.918), ring * 0.7);
        gl_FragColor = vec4(col, inside * 0.9 * uFade);
      }`,
  });
  const bloom = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), bloomMat);
  bloom.position.set(-2.4, 0.04, -0.5); bloom.frustumCulled = false; bloom.visible = false;
  group.add(bloom);

  return {
    group,
    update(t, dt, cue) {
      const k = Math.min(1, Math.max(0, (t - C.bleed[0]) / (C.bleed[1] - C.bleed[0])));
      veil.visible = k < 1;
      if (veil.visible) {
        ctx.seal.chest(sealP);
        veilMat.uniforms.uSeal.value.copy(sealP);
        veilMat.uniforms.uBehind.value = 0.55 * (ctx.seal.scale ?? 1);
        veilMat.uniforms.uAspect.value = cue?.aspect ?? ctx.aspect();
        veilMat.uniforms.uK.value = k;
      }
      const b = t - C.thors; // 0..0.45 s blooms (threes), 0.45..0.9 s dries
      bloom.visible = b >= 0 && b < 0.95;
      if (bloom.visible) {
        const th = Math.floor(b * 8) / 8; // on threes
        bloomMat.uniforms.uR.value = 1.15 * Math.min(1, th / 0.45) * (2 - Math.min(1, th / 0.45));
        bloomMat.uniforms.uFade.value = 1 - Math.max(0, (th - 0.45) / 0.5);
      }
    },
    dispose() { veil.geometry.dispose(); veilMat.dispose(); bloom.geometry.dispose(); bloomMat.dispose(); },
  };
}
