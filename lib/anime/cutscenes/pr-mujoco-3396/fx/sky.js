// E13 ripple rings (the Rumbling footfalls), shot 8 sea wash in the gap, 14 gulls bursting off the cliff.
import { GLSL_HASH, pxScale, win, smooth } from "./util.js";

export default function buildSky(ctx, O) {
  const { THREE } = ctx;
  const group = new THREE.Group();

  // ---- ripple rings: a card on the far horizon, 10 rings, one born per footfall (22 frames), 1 px #b9a0b8 at 30% ----
  // ring i: age a_i = t - (T0 + i*22/24); radius R = 40 + 45*a_i (9 px per drawing on twos = 108 px/s ~ 45 m/s at 330 m frame height),
  // fade = 1 - 0.4*a_i/8 (fades by 40%); AA line = 1 - smoothstep(0, fwidth(r)*1.2, |r - R|).
  const RU = { uT: { value: 0 }, uT0: { value: 4.92 } };
  const rings = new THREE.Mesh(new THREE.PlaneGeometry(1500, 800), new THREE.ShaderMaterial({
    uniforms: RU, transparent: true, depthWrite: false, depthTest: true,
    vertexShader: "varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: /* glsl */ `uniform float uT,uT0; varying vec2 vP;
      void main(){
        vec2 c = vec2(0., -80.);                       // rings centred on the horizon behind the Wall
        float r = length(vP - c); float fw = fwidth(r)*1.2;
        float n = (uT - uT0) * 24./22.; float acc = 0.;
        for (int j=0;j<10;j++){
          float b = floor(n) - float(j); if (b < 0.) continue;
          float age = uT - (uT0 + b*22./24.);
          float R = 40. + 45.*age; float line = 1. - smoothstep(0., fw, abs(r - R));
          acc += line * (1. - .4*clamp(age/8.,0.,1.)) * step(age, 9.);
        }
        // violet #b9a0b8 up high, peach #f3d7a0 near the horizon glow
        vec3 col = mix(vec3(.953,.843,.627), vec3(.725,.627,.722), smoothstep(-60., 140., vP.y));
        gl_FragColor = vec4(col, clamp(acc,0.,1.)*.3);
      }`,
  }));
  rings.position.set(O[0], O[1] + 80, O[2] - 400); rings.frustumCulled = false; rings.renderOrder = 1; group.add(rings);

  // ---- sea wash in the gap: a plane just in front of where the Wall opens, blue from the gap centre outward ----
  // alpha = (1 - smoothstep(R-w, R, |x|)) * k * vertical ramp; lapis #2f4f8f low, horizon #7f9cc4, sparkle glints (hash >.985 flicker on twos)
  const SU = { uK: { value: 0 }, uT: { value: 0 } };
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.ShaderMaterial({
    uniforms: SU, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: /* glsl */ `${GLSL_HASH} uniform float uK,uT; varying vec2 vP;
      void main(){
        float R = 3. + 15.*uK;                                          // gap half-width grows 3 -> 18 m
        float m = (1. - smoothstep(R-3., R, abs(vP.x))) * smoothstep(-30., -6., vP.y) * (1. - smoothstep(10., 28., vP.y));
        vec3 c = mix(vec3(.184,.310,.561), vec3(.498,.612,.769), smoothstep(-20., 8., vP.y));
        float g = step(.985, h21(floor(vP*vec2(1.2,1.6)) + floor(uT*12.))) * smoothstep(-8.,8.,vP.y); // glints
        c += vec3(.94,.9,.81)*g;
        gl_FragColor = vec4(c, m*.55*min(1.,uK*3.) + g*.7*m);
      }`,
  }));
  wash.position.set(O[0], O[1] + 14, O[2] - 29); wash.frustumCulled = false; group.add(wash);

  // ---- gulls: 14 points, V-shaped wings drawn in the fragment, flap 6 Hz on twos; burst at 10.92 s (f262) ----
  const GN = 14, r = ctx.rng(401);
  const GP = new Float32Array(GN * 3), GS = new Float32Array(GN * 4);
  for (let i = 0; i < GN; i++) { GP.set([O[0] + (r() - .5) * 18, O[1] + 1 + r() * 2, O[2] - 31 - r() * 4], i * 3); GS.set([r(), (r() - .5) * 2, 6 + r() * 5, .8 + r() * .5], i * 4); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(GP, 3)); gg.setAttribute("aS", new THREE.BufferAttribute(GS, 4));
  const GU = { uAge: { value: -1 }, uPx: { value: 600 }, uT: { value: 0 } };
  const gulls = new THREE.Points(gg, new THREE.ShaderMaterial({
    uniforms: GU, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `attribute vec4 aS; uniform float uAge,uPx,uT; varying float vFlap; varying float vOn;
      void main(){ float a = max(uAge - aS.x*.25, 0.);
        // burst up and out of the cliff: v = (lateral*1.5, 7 + 3 aS.z/9 , -1) m/s with a gentle arc
        vec3 p = position + vec3(aS.y*a*4.5, a*(5.+aS.z*.5) - a*a*.4, -a*2.);
        vOn = step(0., uAge - aS.x*.25); vFlap = sin(floor(uT*12.)/12.*6.283*3. + aS.x*20.);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = aS.w*1.8*uPx/max(-mv.z,1.); }`,
    fragmentShader: /* glsl */ `varying float vFlap; varying float vOn;
      void main(){ if (vOn < .5) discard;
        vec2 q = gl_PointCoord*2.-1.; q.y = -q.y;
        // V wings: |y - (|x| * s) | small, tips swing with the flap; wing length 0.9
        float s = .35*vFlap, ax = abs(q.x); float d = abs(q.y - (ax*(.6+s)) + .2) ;
        float body = 1. - smoothstep(.07,.12,d); if (ax > .9) body = 0.;
        float edge = 1. - smoothstep(.12,.2,d);
        if (edge < .1) discard;
        gl_FragColor = vec4(mix(vec3(.353,.231,.133), vec3(.937,.894,.812), body), 1.); }`,
  }));
  gulls.frustumCulled = false; pxScale(THREE, gulls, GU); group.add(gulls);

  return {
    group,
    update(t, dt, cue) {
      RU.uT.value = t; SU.uT.value = t; GU.uT.value = t;
      rings.visible = t > 4.9;
      const gp = win(cue, t, "gap", 10.3, 11.0); SU.uK.value = smooth(0, 1, gp.k); wash.visible = gp.k > 0;
      const gl = win(cue, t, "gulls", 10.92, 14.0); GU.uAge.value = gl.since < Infinity ? gl.since : -1;
    },
    dispose() { rings.geometry.dispose(); rings.material.dispose(); wash.geometry.dispose(); wash.material.dispose(); gg.dispose(); gulls.material.dispose(); },
  };
}
