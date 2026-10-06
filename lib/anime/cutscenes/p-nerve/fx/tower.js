// p-nerve FX: the bell. Bible FX 3 (toll: flat white shock ring 3 f, amber rim pulse #e8a23a e^-5t) and 3.4 (cel pigeons
// that burst off on the first toll). Cues read: toll (x3).
import * as THREE from "three";
import { billboard, triSoup, hex } from "./common.js";

export default function tower(ctx, S) {
  const { U, TL, A, D } = S;
  const group = new THREE.Group(); group.name = "nerve-tower";
  const rng = ctx.rng(23);
  const own = [];
  const bell = new THREE.Vector3(...A.bell);
  const tolls = TL.evs("toll", D.toll);

  // flat white shock ring, 3 drawn frames at 24 fps (0.125 s): radius_f = lerp(.35, 1.0, (f+1)/3), half-width .09, hard edge
  const ring = billboard({
    U, size: [4.2, 4.2], additive: true, uniforms: { uAgo: { value: 9 } },
    fs: /* glsl */ `
      uniform float uAgo; varying vec2 vUv; varying vec3 vW;
      void main(){
        float k = uAgo / .125; if (k > 1.) discard;
        float r = mix(.35, 1., (floor(k * 3.) + 1.) / 3.);
        float d = abs(length((vUv - .5) * 2.) - r);
        float a = step(d, .09) * sealMask(vW);
        if (a < .01) discard;
        gl_FragColor = vec4(1., 1., 1., a);
      }`,
  });
  ring.position.copy(bell); group.add(ring);

  // amber rim pulse: amp = e^{-5 t}, posterised to 4 flat steps. Disc d<1: rim band (.72..1) at amp, core at .35 amp.
  const pulse = billboard({
    U, size: [3.4, 3.4], additive: true, uniforms: { uAgo: { value: 9 }, uCol: { value: hex("#e8a23a") } },
    fs: /* glsl */ `
      uniform float uAgo; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
      void main(){
        float amp = floor(exp(-5. * uAgo) * 4. + .5) / 4.;
        float d = length((vUv - .5) * 2.);
        float a = (step(.72, d) * step(d, 1.) + step(d, .72) * .35) * amp * .85 * sealMask(vW);
        if (a < .01) discard;
        gl_FragColor = vec4(uCol, a);
      }`,
  });
  pulse.position.copy(bell); pulse.renderOrder = 19; group.add(pulse);

  // cel pigeons: 8 birds, 3 flat triangles each (body + two wings), launched on the first toll. Flap: wing tip y += .22 sin(16 age + phase)
  // weighted by smoothstep(.03,.38,|x|); heading = velocity; basis (r, u, f) with f = v/|v|, r = f x up... (up x f), u = f x r.
  const NB = 8;
  const bg = triSoup(NB,
    () => [[[0, 0, .15], [.06, 0, -.12], [-.06, 0, -.12]], [[.04, 0, .05], [.04, 0, -.1], [.38, 0, -.02]], [[-.04, 0, .05], [-.04, 0, -.1], [-.38, 0, -.02]]],
    [["aS", 3], ["aV", 3], ["aP", 2]],
    () => {
      const v = new THREE.Vector3((rng() - 0.7) * 5, 2 + rng() * 3, (rng() - 0.5) * 5);
      return { aS: [bell.x + (rng() - .5) * .8, bell.y - 0.6 + rng() * .4, bell.z + (rng() - .5) * .8], aV: [v.x, v.y, v.z], aP: [rng() * 6, rng() * 0.25] };
    });
  const bm = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uStart: { value: 1e9 } }, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: /* glsl */ `
      attribute vec3 aS, aV; attribute vec2 aP; uniform float uT, uStart; varying float vOn;
      void main(){
        float age = uT - uStart - aP.y;
        vOn = (age > 0. && age < 5.) ? 1. : 0.;
        vec3 f = normalize(aV), r = normalize(cross(vec3(0., 1., 0.), f)), u = cross(f, r);
        vec3 l = position;
        l.y += sin(age * 16. + aP.x) * .22 * smoothstep(.03, .38, abs(l.x));
        vec3 w = aS + aV * max(age, 0.) + r * l.x + u * l.y + f * l.z;
        gl_Position = vOn > .5 ? projectionMatrix * viewMatrix * vec4(w, 1.) : vec4(2., 2., 2., 1.);
      }`,
    fragmentShader: /* glsl */ `varying float vOn; void main(){ gl_FragColor = vec4(.08, .075, .11, 1.); }`,
  });
  const birds = new THREE.Mesh(bg, bm); birds.frustumCulled = false; group.add(birds); own.push(bg, bm);

  return {
    group,
    update(t, dt, cue) {
      const L = TL.last(tolls, cue.t);
      ring.material.uniforms.uAgo.value = L.ago; pulse.material.uniforms.uAgo.value = L.ago;
      bm.uniforms.uT.value = Math.floor(cue.t * 12) / 12; bm.uniforms.uStart.value = tolls[0].t;
    },
    dispose() { for (const o of own) o.dispose?.(); for (const m of [ring, pulse]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
