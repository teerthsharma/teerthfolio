// spawn-seal FX / dome: the grade and the eat. ONE inverted sphere (r 28 m) around the seal, drawn depth-tested and never depth-writing, so
// the seal (nearer than the shell) is never covered or tinted, and bloom never sees it. It paints, over the painted plate only:
//   (1) flashes: #cfe6ff, alpha capped at 0.35 (L8), two-step (full 2 f, half 2 f, off) at PLOP 24 f, morph stretch, 193 f, beam drop, maw open, PLOP 703 f
//   (2) the credit-hold cooling: violet #8a3fff from the screen edges, 542-643 f.  edge = |view.xy| / -view.z ;  a = .28 * cool * smoothstep(.55, 1.25, edge)
//   (3) the Predator eat (bible 3.14, "tools/blend.js eaten-edge hard cut"): void #05030b inside the cone of half-angle theta(a) about the maw
//       direction; a hard magenta band, then a hard violet-blue band, with angular slashes, on the front's outside edge.
// Cues read: "maw" (26.79 s), "cool" (542/24 = 22.58 s, 4.2 s ramp), "plop", "plop2", "morph", "beams", "flash" (free extra flashes: arg strength).
import { GLSL_NOISE, mat, ageOf, clamp01, sealPoint, eatTheta, MAW_T0, MAW_LOCAL } from "./common.js";

export default function dome(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group();
  const M = mat(THREE, {
    side: THREE.BackSide, uniforms: { uCentre: { value: new THREE.Vector3() }, uMaw: { value: new THREE.Vector3(0, 0, -1) }, uTheta: { value: 0 }, uFlash: { value: 0 }, uCool: { value: 0 }, uT: { value: 0 } },
    vert: /* glsl */ `varying vec3 vW; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vV=(viewMatrix*w).xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    frag: /* glsl */ `${GLSL_NOISE} uniform vec3 uCentre,uMaw; uniform float uTheta,uFlash,uCool,uT; varying vec3 vW; varying vec3 vV;
      void main(){ vec3 d=normalize(vW-uCentre); float ang=acos(clamp(dot(d,uMaw),-1.,1.));
        // jagged front: angle jitter from a stepped Voronoi on the direction (xz sweep) so the edge is angular, not a smooth circle
        vec3 side=normalize(cross(uMaw,vec3(0.,1.,.001))); float az=atan(dot(d,cross(uMaw,side)),dot(d,side));
        float jit=(vor(vec2(az*3.,floor(uT*12.)*.13)).x-.4)*.07*uTheta; float th=uTheta+jit;
        vec4 o=vec4(0.);
        // cool violet from the edges (credit hold)
        float edge=length(vV.xy)/max(-vV.z,.1); o=vec4(.54,.25,1.,.28*uCool*smoothstep(.55,1.25,edge));
        // flash
        if(uFlash>0.) o=mix(o,vec4(.81,.90,1.,uFlash),step(o.a,uFlash));
        if(uTheta>.002){
          float slash=step(.5,fract(az*9./6.2831853*2.+ang*6.));
          if(ang<th) o=vec4(.02,.012,.043,1.);                                         // void, only where eaten
          else if(ang<th+.05) o=vec4(1.,.19,.91,1.);                                    // magenta rim
          else if(ang<th+.10) o=vec4(slash>.5?vec3(.35,.25,1.):vec3(.18,.12,.6),1.);    // violet-blue slashes
        }
        if(o.a<=.003) discard; gl_FragColor=o; }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(28, 48, 32), M); mesh.renderOrder = -5; mesh.frustumCulled = false; group.add(mesh);
  // flash events: [seconds, strength]; two-step decay.
  const FL = [[1.0, 0.2, "plop"], [4.375 + 1.415, 0.15, "morph:b"], [193 / 24, 0.2, "shan"], [10.0, 0.3, "beams"], [MAW_T0, 0.3, "maw"], [703 / 24, 0.2, "plop2"]];
  const c0 = new THREE.Vector3(), mc = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      seal.chest(c0); mesh.position.copy(c0); sealPoint(seal, THREE, ...MAW_LOCAL, mc);
      M.uniforms.uCentre.value.copy(c0); M.uniforms.uMaw.value.copy(mc).sub(c0).normalize(); M.uniforms.uT.value = t;
      M.uniforms.uTheta.value = eatTheta(ageOf(cue, t, "maw", MAW_T0));
      let f = 0;
      for (const [t0, s, name] of FL) {
        const base = name.indexOf(":") < 0 && /^(plop|plop2|beams|maw)$/.test(name) ? ageOf(cue, t, name, t0) : t - t0;
        const k = base < 0 || base > 0.34 ? 0 : (base < 0.17 ? 1 : 0.5); f = Math.max(f, k * Math.min(s, 0.35));
      }
      try { if (cue.on("flash")) f = Math.max(f, Math.min(0.35, cue.arg("flash", "strength", 0.2))); } catch { /* optional */ }
      M.uniforms.uFlash.value = f;
      M.uniforms.uCool.value = clamp01(ageOf(cue, t, "cool", 542 / 24) / 4.2);
    },
    dispose() { mesh.geometry.dispose(); M.dispose(); },
  };
}
