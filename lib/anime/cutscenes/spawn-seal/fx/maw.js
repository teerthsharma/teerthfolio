// spawn-seal FX / maw: predator-maw (bible 3.14, FX 7). A pearl sphere ringed by magenta and violet-blue slashes, 7.5 m behind and above
// Rimuru, that eats sky, ground, lenses and lattice while Rimuru and the pup stay whole.
// Cues read: "maw" (643/24 = 26.79 s; opens over 10 f on twos, spins 1 rev/s on twos, black dust streams in).
// The EAT itself is dome.js (the void shell, drawn behind the seal by depth); every fx object checks eaten() from common.js.
import { GLSL_NOISE, mat, VERT_STD, ageOf, easeOut, sealPoint, sparkField, eatTheta, MAW_T0, MAW_OPEN, MAW_LOCAL, MAW_R } from "./common.js";

export default function maw(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group();
  const mawC = sealPoint(seal, THREE, ...MAW_LOCAL, new THREE.Vector3());

  // PEARL. Object-space direction L = normalize(position) is spun (Y, 1 rev/s on twos) so the water shapes turn with the sphere.
  //   toon: ndl = n . l ; > .45 pearl #dfe8ff, > 0 #a8b4e0, else shadow #5a6a9a    (three flat bands)
  //   water polygons: (u,v) = (atan(L.z,L.x)/2pi * 6, L.y * 3);  F2-F1 < .07 draws a white seam, hash(cell) > .72 fills white (#ffffff)
  //   slashes: s = fract(L.x*2.2 + L.y*3.4 + L.z*1.3); s in [.0,.1) -> violet-blue #5a40ff, s in [.1,.16) -> magenta #ff30e8 (angular, hard)
  //   rim: fresnel f = 1 - |n.v| ; f > .84 magenta ring
  const pearl = mat(THREE, {
    vert: /* glsl */ `varying vec3 vL; varying vec3 vW; varying vec3 vN;
      void main(){ vL=normalize(position); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*w; }`,
    depthWrite: true, uniforms: {},
    frag: /* glsl */ `${GLSL_NOISE} varying vec3 vL; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 n=normalize(vN), v=normalize(cameraPosition-vW), l=normalize(vec3(.3,.8,.5)); float ndl=dot(n,l);
        vec3 c = ndl>.45 ? vec3(.875,.91,1.) : (ndl>0. ? vec3(.66,.71,.88) : vec3(.35,.42,.6));
        vec2 uv=vec2(atan(vL.z,vL.x)/6.2831853*6., vL.y*3.); vec2 vc=vor(uv); float ed=vedge(uv);
        float fill=step(.72,h11(vc.y)); float seam=step(ed,.07);
        c=mix(c,vec3(1.),max(fill*.85,seam));
        float s=fract(vL.x*2.2+vL.y*3.4+vL.z*1.3);
        if(s<.1) c=vec3(.35,.25,1.); else if(s<.16) c=vec3(1.,.19,.91);
        float f=1.-abs(dot(n,v)); if(f>.84) c=vec3(1.,.19,.91);
        gl_FragColor=vec4(c,1.); }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(MAW_R, 40, 28), pearl); sphere.renderOrder = 11;
  // additive magenta/violet halo: BackSide shell, hard two-level rim, pulses 2 Hz on twos; kept at 0.4 max so the pearl never reads as white fog
  const halo = mat(THREE, {
    additive: true, side: THREE.BackSide, vert: VERT_STD, uniforms: { uF: { value: 0 } },
    frag: /* glsl */ `uniform float uF; varying vec3 vW; varying vec3 vN; void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v));
      float lv= f<.35?1.:(f<.6?.45:0.); if(lv<=0.) discard; gl_FragColor=vec4(mix(vec3(1.,.19,.91),vec3(.35,.25,1.),step(.5,f)),lv*.4*uF); }`,
  });
  const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(MAW_R * 1.16, 32, 20), halo); haloMesh.renderOrder = 10;
  group.add(sphere, haloMesh); sphere.visible = haloMesh.visible = false;

  // DUST: black #05030b flecks (normal) and violet/magenta flecks (additive) stream from a shell r 9-15 m into the maw, ballpark 130 + 70.
  const rg = ctx.rng(77), mk = (n, cols, add) => {
    const items = [];
    for (let i = 0; i < n; i++) {
      const u = rg() * 2 - 1, ph = rg() * 6.2832, r = 9 + rg() * 6, s = Math.sqrt(1 - u * u);
      const o = [mawC.x + r * s * Math.cos(ph), mawC.y + r * u * 0.8, mawC.z + r * s * Math.sin(ph)];
      items.push({ o, c: cols[i % cols.length], t0: MAW_T0 + MAW_OPEN + rg() * 1.5, life: 0.9 + rg() * 0.9, size: 0.12 + rg() * 0.22, shape: i % 3 === 0 ? 1 : 0, mode: 1 });
    }
    return sparkField(THREE, { additive: add, items, target: [mawC.x, mawC.y, mawC.z] });
  };
  const dustDark = mk(130, [[0.02, 0.012, 0.043]], false), dustLit = mk(70, [[0.35, 0.25, 1], [1, 0.19, 0.91], [0.87, 0.91, 1]], true);
  dustDark.pts.renderOrder = 12; dustLit.pts.renderOrder = 12; group.add(dustDark.pts, dustLit.pts);
  const size = new THREE.Vector2();

  return {
    group,
    update(t, dt, cue) {
      const a = ageOf(cue, t, "maw", MAW_T0);
      sealPoint(seal, THREE, ...MAW_LOCAL, mawC);
      const open = easeOut(a / MAW_OPEN); // opens over 10 frames, on twos (t is stepped)
      const th = eatTheta(a);
      sphere.visible = haloMesh.visible = a >= 0 && th < 3.0; // swallowed last, after the sky is gone
      sphere.position.copy(mawC); haloMesh.position.copy(mawC);
      sphere.scale.setScalar(Math.max(open, 0.001)); haloMesh.scale.setScalar(Math.max(open, 0.001));
      sphere.rotation.y = Math.PI * 2 * Math.max(a, 0);                // 1 rev/s, quantised by the stepped clock
      sphere.rotation.x = 0.35;
      halo.uniforms.uF.value = 0.7 + 0.3 * (Math.floor(t * 12) % 2);
      try { ctx.engine.renderer.getDrawingBufferSize(size); } catch { size.set(1920, 1080); }
      for (const d of [dustDark, dustLit]) { d.pts.material.uniforms.uTarget.value.copy(mawC); d.set(t, size.y); }
      dustDark.pts.visible = dustLit.pts.visible = a > -0.1 && a < 3;
    },
    dispose() { sphere.geometry.dispose(); pearl.dispose(); haloMesh.geometry.dispose(); halo.dispose(); dustDark.dispose(); dustLit.dispose(); },
  };
}
