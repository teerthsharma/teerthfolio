// FX 7: SUN DISC + LENS (the only thing that blooms in this dock: radius ~24 px, strength .25, threshold above 1.0 so snow never blooms).
//
// DISC (layer 0, a static far glow baked into the plate): a billboard at SUN_DIR * 0.4 far.
//     r = |p| (disc radius = 1), core  = 1 - smoothstep(1 - aa, 1 + aa, r)      HDR colour #fff3d8 * 1.55  (luma > 1: the bloom source)
//     ring = ring of radius 1.45, 0.07 thick, #f2a05a at 0.85                    the cel ring round the sun
//     halo = exp(-1.6 (r - 1)) * .22 outside the ring, #ffc98a                  a soft apricot falloff (luma < 1)
// LENS GHOST (layer 1, screen space, faint): ONE round flare on the line from the sun through the screen centre,
//     ghost ndc = -0.55 * sunNdc,  radius 0.075 frame heights, #f2a05a at 0.14, hidden when the sun is behind the camera or off screen,
//     placed at the seal's depth + margin so it can never lie over the seal.
// engine.sun is set to the sun's world position (light-shaft source if the style enables shafts) and restored on dispose.
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const far = (ctx.scene.far ?? 1500) * 0.4;
  const dir = new THREE.Vector3(...S.SUN_DIR);
  const pos = dir.clone().multiplyScalar(far);

  const discMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSz: { value: far * 0.045 } },
    vertexShader: /* glsl */ `
      uniform float uSz; varying vec2 vP;
      ${S.GLSL_BILL}
      void main() {
        vP = position.xy * 2.0 * 3.2;                        // quad spans 3.2 disc radii
        vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 w = c + (camRight() * position.x + camUp() * position.y) * 2.0 * 3.2 * uSz;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        float r = length(vP), aa = fwidth(r) + 1e-4;
        float core = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        float ring = (1.0 - smoothstep(0.035 - aa, 0.035 + aa, abs(r - 1.45))) * 0.85;
        float halo = exp(-1.6 * max(r - 1.0, 0.0)) * 0.22 * step(1.0, r) * (1.0 - smoothstep(2.4, 3.1, r));
        vec3 sun = vec3(1.0, 0.953, 0.847) * 1.55;               // #fff3d8, HDR: the bloom source
        vec3 col = sun * core + vec3(0.949, 0.627, 0.353) * ring + vec3(1.0, 0.788, 0.541) * halo;
        float a = max(core, max(ring, halo));
        gl_FragColor = vec4(col / max(a, 1e-3) * min(a, 1.0), a);
      }`,
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), discMat);
  disc.position.copy(pos); disc.frustumCulled = false; disc.renderOrder = 1;
  disc.userData.layer = 0; // static far glow: baked into the plate (survives the framework's layer pass)
  ctx.setLayer(disc, 0);
  group.add(disc);

  const ghostMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uSun: { value: pos.clone() }, uSeal: { value: new THREE.Vector3() }, uAspect: { value: 16 / 9 }, uBehind: { value: 0.55 }, uOn: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform vec3 uSun, uSeal; uniform float uAspect, uBehind;
      varying vec2 vP; varying float vVis;
      void main() {
        vec4 s = projectionMatrix * viewMatrix * vec4(uSun, 1.0);
        vec2 sn = s.xy / max(abs(s.w), 1e-4);
        vVis = step(0.0, s.w) * (1.0 - smoothstep(1.0, 1.35, max(abs(sn.x), abs(sn.y))));
        vec2 g = -0.55 * sn;
        vec4 sc = viewMatrix * vec4(uSeal, 1.0);
        float d = max(-sc.z + uBehind, 0.4);
        vec4 pc = projectionMatrix * vec4(0.0, 0.0, -d, 1.0);
        float R = 0.075 * 2.0;                                   // radius in ndc-height units (frame height = 2)
        vP = position.xy * 2.0;
        gl_Position = vec4(g + vec2(position.x * 2.0 * R / uAspect, position.y * 2.0 * R), pc.z / pc.w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOn; varying vec2 vP; varying float vVis;
      void main() {
        float r = length(vP), aa = fwidth(r) + 1e-4;
        float m = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        gl_FragColor = vec4(0.949, 0.627, 0.353, m * 0.14 * vVis * uOn);
      }`,
  });
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ghostMat);
  ghost.frustumCulled = false; ghost.renderOrder = 42;
  group.add(ghost);

  const prevSun = ctx.engine.sun ? ctx.engine.sun.clone() : null;
  ctx.engine.sun = pos.clone();
  const sealP = new THREE.Vector3();

  return {
    group,
    update(t, dt, cue) {
      ctx.seal.chest(sealP);
      ghostMat.uniforms.uSeal.value.copy(sealP);
      ghostMat.uniforms.uBehind.value = 0.55 * (ctx.seal.scale ?? 1);
      ghostMat.uniforms.uAspect.value = cue?.aspect ?? ctx.aspect();
      // the flare is a morning glint: strongest in the open, quiet under the rain
      ghostMat.uniforms.uOn.value = 1 - 0.8 * S.sm(24.4, 25.8, t);
    },
    dispose() { ctx.engine.sun = prevSun; disc.geometry.dispose(); discMat.dispose(); ghost.geometry.dispose(); ghostMat.dispose(); },
  };
}
