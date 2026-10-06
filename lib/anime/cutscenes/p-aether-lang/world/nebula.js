// NEBULA SHELL + far plate (bible 3.1). The MAPPA void: near-black #030208 with four FLAT, ink-edged cloud bands, orchid only near the core.
//
// MATHS (fragment, rig-centred direction d = normalize(vWorld - centre), core direction cd):
//   theta = acos(d . cd)                      angle from the core
//   phi   = atan(d_perp . e2, d_perp . e1)    azimuth about the core axis (e1, e2 a basis normal to cd)
//   phi'  = phi + 1.6 theta - 0.035 flow      log-spiral shear, frozen when flow freezes (8.6 s)
//   p     = theta * (cos phi', sin phi') * 2.6  azimuthal-equidistant map: seamless except at the antipode (behind the camera)
//   n     = fbm(1.5 p + 2.4 q), q = (fbm(1.2 p), fbm(1.2 p + c))                       painted cloud density
//   dens  = clamp(smoothstep(.35,.95,n) (0.8 + 0.4 brush) + 0.55 exp(-2.2 theta), 0, 1)  brush = vnoise(14 phi', 60 theta)
//   x = 4 dens;  band = floor(x) in {0,1,2,3} -> #030208 #0f0a36 #4d26b3 (#9942c2 only theta < 0.9)    posterised, 4 flat bands
//   ink  = 1 - smoothstep(.7, 1.6, |x - round(x)| / fwidth(x))   a 1-2 px dark edge on every band boundary (razor, no gradient)
//   shafts: 3 angular streaks (|phi - a_k| < .035 + .03 theta) mixed 12% to #ede0ff, fading by theta = 2
//   wisps: ridged noise > .78 mixed 35% to #6190ff in bands 1 and 2
//   vignette: colour *= 1 - .9 smoothstep(1.1, 2.3, theta)   black beyond ~55% of the sky, like the real field
//   outside the bubble (gl_FrontFacing): fresnel veil + a 3 px ring #ede0ff where |n.v| -> 0 (the bloom edge, bible 6.2)
// Every colour is written pow(c, 2.2) and capped at 1.4.
import { DoubleSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { V } from "../../../paint.js";
import { CORE, SHELL_R, NOISE, OUT, PAL, TL, hx, smooth, flowAt, startOf, u } from "./shared.js";

export default function nebula(ctx, rig) {
  const { THREE } = ctx;
  // far plate (layer 0, static): the pocket before the void: island dark with one radial source, #0f0a36 to #030208
  const plate = ctx.bake.plateLayer(`vec3 paint(vec2 p) {
      vec2 q = vec2(p.x - 0.889, p.y - 0.5);
      float r = length(q);
      float n = fbm(q * 3.0 + 4.0);
      float band = floor((0.85 - r * 1.1 + 0.18 * n) * 4.0) / 4.0;
      vec3 c = mix(${V(PAL.black)}, ${V(PAL.indigo)}, clamp(band * 1.4, 0.0, 1.0));
      return c * (1.0 - 0.7 * smoothstep(0.55, 1.1, r));
    }`);

  const mat = new ShaderMaterial({
    uniforms: { uFlow: u(0), uFade: u(1), uCore: u(new THREE.Vector3(...CORE).add(rig.position)), uCenter: u(new THREE.Vector3(0, 1, 0).add(rig.position)) },
    side: DoubleSide, transparent: true, depthWrite: false,
    vertexShader: "varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform float uFlow, uFade; uniform vec3 uCore, uCenter; varying vec3 vWorld;
      ${NOISE} ${OUT}
      void main() {
        vec3 d = normalize(vWorld - uCenter), cd = normalize(uCore - uCenter);
        float c = clamp(dot(d, cd), -1.0, 1.0), th = acos(c);
        vec3 e1 = normalize(cross(abs(cd.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), cd)), e2 = cross(cd, e1);
        vec3 tg = d - cd * c;
        float ph = atan(dot(tg, e2), dot(tg, e1) + 1e-5);
        float ph2 = ph + 1.6 * th - uFlow * 0.035;
        vec2 p = th * vec2(cos(ph2), sin(ph2)) * 2.6;
        vec2 q = vec2(fbm(p * 1.2), fbm(p * 1.2 + vec2(5.2, 1.3)));
        float n = fbm(p * 1.5 + 2.4 * q);
        float brush = vnoise(vec2(ph2 * 14.0, th * 60.0));
        float dens = clamp(smoothstep(0.35, 0.95, n) * (0.8 + 0.4 * brush) + 0.55 * exp(-2.2 * th), 0.0, 1.0);
        float x = dens * 4.0, b = min(floor(x), 3.0);
        vec3 col = b < 0.5 ? ${hx(PAL.black)} : (b < 1.5 ? ${hx(PAL.indigo)} : (b < 2.5 ? ${hx(PAL.violet)} : (th < 0.9 ? ${hx(PAL.orchid)} : ${hx(PAL.violet)})));
        float wisp = smoothstep(0.78, 0.84, ridged(p * 2.4 + 3.0)) * step(0.99, x) * (1.0 - step(2.99, x));
        col = mix(col, ${hx(PAL.wisp)}, wisp * 0.35);
        for (int k = 0; k < 3; k++) {
          float a = 0.4 + 1.9 * float(k) + uFlow * 0.01;
          float da = abs(mod(ph - a + 3.14159, 6.28318) - 3.14159);
          col = mix(col, ${hx(PAL.white)}, 0.12 * step(da, 0.035 + 0.03 * th) * (1.0 - smoothstep(1.2, 2.0, th)));
        }
        float de = abs(x - floor(x + 0.5)), ink = (1.0 - smoothstep(0.7, 1.6, de / (fwidth(x) + 1e-4))) * step(0.5, x);
        col = mix(col, ${hx(PAL.ink)}, ink * 0.9);
        col *= 1.0 - 0.9 * smoothstep(1.1, 2.3, th);
        float alpha = uFade;
        if (gl_FrontFacing) { // the bubble seen from outside
          float fr = abs(dot(d, normalize(vWorld - cameraPosition)));
          float ring = 1.0 - smoothstep(fwidth(fr) * 1.5, fwidth(fr) * 3.0, fr);
          col = mix(col + (1.0 - fr) * (1.0 - fr) * vec3(0.4, 0.28, 0.75), ${hx(PAL.white)}, ring);
          alpha = mix(0.4, 1.0, max(ring, 1.0 - fr)) * uFade;
        }
        emit(col, alpha);
      }`,
  });
  const shell = new Mesh(new SphereGeometry(1, 56, 36), mat);
  shell.frustumCulled = false; shell.renderOrder = -3; shell.userData.layer = 1;
  shell.position.set(0, 1, 0);
  shell.visible = false;

  return {
    plate, shell,
    update(t, cue) {
      const a = startOf(cue, "bloom", TL.bloom), b = a + (TL.bloomEnd - TL.bloom), end = startOf(cue, "clear", TL.voidEnd);
      const k = smooth((t - a) / (b - a)); // bubble 0.02 -> 140 m, smoothstep (bible 6.2)
      shell.visible = t >= a && t < end;
      shell.scale.setScalar(0.02 + (SHELL_R - 0.02) * k);
      mat.uniforms.uFlow.value = flowAt(t, startOf(cue, "freeze", TL.freeze));
      mat.uniforms.uFade.value = 1 - smooth((t - (end - 0.3)) / 0.3);
    },
    dispose() { mat.dispose(); shell.geometry.dispose(); plate.material.dispose(); plate.geometry.dispose(); },
  };
}
