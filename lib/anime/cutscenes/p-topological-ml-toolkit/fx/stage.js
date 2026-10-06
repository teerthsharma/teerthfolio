// STAGE FX (bible 3.12, 3.13, 5 shots 1, 8, 11): the shell wave that opens the cut, the pop flash, the accordion fold's crease lines, the map-fold wipe home.
//
// SHELL WAVE (shot 1, f0-f29, #9fd0ff): the stage swells to radius 40 m. radius(k) = 40 x easeOut(k), k = t / 1.2.
//   dome   a fresnel rim, additive:  a = (1 - |N . V|)^2.2 (1 - k)       (the shell is only visible edge-on, like a soap film seen from inside)
//   floor  a flat ring at radius 0.95 R on the ground: white #f4fbff 0.022 over an ink twin #1d3f9a 0.045 (colour-traced FX edge, bible 9a-19)
// POP FLASH (f248): a full-screen #e4f1ff at alpha 0.32 x (1 - age / 0.125): 3 frames, peak on the first. The impact frame itself is a reserved beat.
// CREASES (f250-f278): a #1d3f9a 2 px line along each hinge (z = -22, -50, -82 bible units; the hinge under the seal's feet is left out: the hero stays clear).
//   They appear 2 frames before the fold (the anticipation), hold, then shrink and vanish by f278: width(t) = w (1 - smooth(fold + 0.9, fold + 1.2, t)).
// MAP-FOLD WIPE (shot 11, 15.0 - 15.4 s): a band of accordion paper sweeps across the frame. Band centre c(u) = -0.22 + 1.44 u, half width 0.13,
//   four leaves across the band; leaf i alternates #eef3f8 / #e3eaf3 with a hard tilt gradient, crease lines #1d3f9a at the leaf joins, a #9fb8dc map grid.
import { HEX, rgb, smooth, easeOut, clamp, makeStrips } from "./util.js";

const TRI = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);

export default function build(ctx, env) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const col = (h) => new THREE.Color(h);

  // ---- shell wave ----
  const shellGeo = new THREE.SphereGeometry(1, 48, 24);
  const shellMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, cCol: { value: col(HEX.shell) } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float uA; uniform vec3 cCol; varying vec3 vN; varying vec3 vV;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(1.0 - f, 2.2) * uA; gl_FragColor = vec4(cCol * a, 1.0); }`,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat); shell.frustumCulled = false; shell.renderOrder = 11;
  const ringGeo = new THREE.PlaneGeometry(2, 2);
  const ringMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, cW: { value: col(HEX.white) }, cI: { value: col(HEX.ink) } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uA; uniform vec3 cW, cI; varying vec2 vP;
      void main(){ float r = length(vP); float d = abs(r - 0.95);
        float ink = 1.0 - smoothstep(0.040, 0.046, d), fill = 1.0 - smoothstep(0.018, 0.023, d);
        vec3 c = mix(cI, cW, fill); float a = ink * uA; if (a < 0.01) discard; gl_FragColor = vec4(c, a); }`,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.frustumCulled = false; ring.renderOrder = 11;
  group.add(shell, ring);

  // ---- creases ----
  const creases = makeStrips(THREE, 8, { mode: "solid", order: 12 });
  group.add(creases.mesh);
  const INK = rgb(THREE, HEX.crease);
  const hinges = (ctx.scene && ctx.scene.fold && ctx.scene.fold.hinges) || [-22, -50, -82];
  const A = new THREE.Vector3(), B = new THREE.Vector3();

  // ---- full-screen passes: pop flash and the map-fold wipe ----
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute("position", new THREE.BufferAttribute(TRI, 3));
  const flashMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, uniforms: { uA: { value: 0 }, cCol: { value: col(HEX.flash) } },
    vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uA; uniform vec3 cCol; void main(){ if (uA <= 0.001) discard; gl_FragColor = vec4(cCol, uA); }`,
  });
  const flash = new THREE.Mesh(triGeo, flashMat); flash.frustumCulled = false; flash.renderOrder = 1000;
  const wipeMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, uniforms: { uW: { value: -1 }, uAsp: { value: 1.78 }, cP: { value: col(HEX.paper) }, cS: { value: col(HEX.paperShade) }, cG: { value: col(HEX.paperGrid) }, cI: { value: col(HEX.ink) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uW, uAsp; uniform vec3 cP, cS, cG, cI; varying vec2 vUv;
      void main(){
        if (uW < 0.0 || uW > 1.0) discard;
        float c = -0.22 + 1.44 * uW, hw = 0.13;                    // band centre and half width
        float lx = (vUv.x - (c - hw)) / (2.0 * hw);
        if (lx < 0.0 || lx > 1.0) discard;
        float li = floor(lx * 4.0), lu = fract(lx * 4.0);
        float odd = mod(li, 2.0);
        vec3 col = mix(cP, cS, odd);
        col *= mix(1.0, 0.90, mix(lu, 1.0 - lu, odd));            // hard tilt gradient, alternating per leaf
        vec2 g = vec2(vUv.x * uAsp, vUv.y) * 20.0;
        col = mix(col, cG, 0.5 * max(step(0.95, fract(g.x)), step(0.95, fract(g.y))));   // the map grid on the paper back
        float crease = max(1.0 - smoothstep(0.0, 0.03, lu), 1.0 - smoothstep(0.0, 0.03, 1.0 - lu));
        col = mix(col, cI, crease);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const wipe = new THREE.Mesh(triGeo, wipeMat); wipe.frustumCulled = false; wipe.renderOrder = 1001;
  group.add(flash, wipe);

  function update(t) {
    const T = env.T, F = env.F, sc = F.sc(), at = F.at();
    // shell
    const k = (t - T.shell) / 1.2;
    const on = k >= 0 && k <= 1.15;
    const R = 40 * sc * easeOut(clamp(k));
    shell.position.set(at[0], at[1], at[2]); shell.scale.setScalar(on ? Math.max(R, 1e-3) : 1e-4);
    shellMat.uniforms.uA.value = on ? 1.4 * (1 - smooth(0.6, 1.15, k)) : 0;
    ring.position.set(at[0], at[1] + 0.06, at[2]); ring.scale.setScalar(on ? Math.max(R * 1.0, 1e-3) : 1e-4);
    ringMat.uniforms.uA.value = on ? 1 - smooth(0.7, 1.15, k) : 0;
    // flash
    const a = t - T.pop;
    flashMat.uniforms.uA.value = a >= 0 && a < 0.125 ? 0.32 * (1 - a / 0.125) : 0;
    // creases
    creases.begin();
    const f0 = T.fold - 2 / 24, f1 = T.fold + 1.2;
    if (t >= f0 && t < f1) {
      const w = 0.09 * sc * (1 - smooth(T.fold + 0.9, f1, t)) * (t < T.fold ? 0.5 : 1);
      const al = t < T.fold ? 0.6 : 1;
      for (const z of hinges) {
        F.toWorld(-45, 0.05, z, A); F.toWorld(45, 0.05, z, B);
        creases.seg(A.x, A.y, A.z, B.x, B.y, B.z, w, w, 0, 1, al, INK[0], INK[1], INK[2]);
      }
    }
    creases.end();
    // wipe
    wipeMat.uniforms.uW.value = (t - T.wipe) / 0.4;
    wipeMat.uniforms.uAsp.value = ctx.aspect ? ctx.aspect() : 1.78;
  }
  return { group, update, dispose() { shellGeo.dispose(); shellMat.dispose(); ringGeo.dispose(); ringMat.dispose(); creases.dispose(); triGeo.dispose(); flashMat.dispose(); wipeMat.dispose(); } };
}
