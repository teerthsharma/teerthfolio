// spawn-seal FX / megiddo: seven water lenses and the gold beam cones that land inside the pool ring (bible 3.10, FX 5, FX 9 partner).
// Cues read: "lenses" (9.42 s, form over 28 f, 1.12 overshoot, on twos), "beams" (10.0 s, node order, 22 f), "ignite" (per node, fired by beams).
// Gold speed lines and the 2-frame inverted impact (240-241 f) are reserved beats in scene.js, not drawn here.
import { mat, VERT_STD, ageOf, clamp01, easeOvershoot, sealPoint, eatTheta, eaten, MAW_T0, MAW_LOCAL } from "./common.js";

export default function megiddo(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group(), N = 7;
  const lensMat = mat(THREE, {
    vert: VERT_STD, depthWrite: true, uniforms: {},
    // 2-tone sphere: lit #7fd0ff / core #1fb8ff, rim #e8ffff, plus the hard white crescent (disc minus a shifted disc, on the sphere normal).
    frag: /* glsl */ `varying vec3 vW; varying vec3 vN;
      void main(){ vec3 n=normalize(vN), v=normalize(cameraPosition-vW), L=normalize(vec3(.4,.8,.45));
        float ndl=dot(n,L); vec3 c= ndl>.15 ? vec3(.5,.82,1.) : vec3(.12,.72,1.);
        float f=1.-abs(dot(n,v)); if(f>.8) c=vec3(.91,1.,1.);
        vec3 Lc=normalize(vec3(-.35,.7,.6)); float cr=step(.86,dot(n,Lc))*(1.-step(.93,dot(n,normalize(Lc+vec3(.18,-.1,0.)))));
        c=mix(c,vec3(1.),cr); gl_FragColor=vec4(c,.92); }`,
  });
  const outMat = mat(THREE, { vert: VERT_STD, side: THREE.BackSide, uniforms: {}, frag: `varying vec3 vW; void main(){ gl_FragColor=vec4(.05,.29,.6,1.); }` });
  const lensGeo = new THREE.SphereGeometry(1.6, 24, 16);
  // Beam cone: unit height along +y, radius 0.9 (lens end, y=1) -> 0.2 (contact, y=0); contact width 0.4 m.
  // Bands (hard, 3 levels) by the radial coordinate: outer #ffb35a, body #ffd23a, hot core #fff3b0 (never pure white). Flicker on twos.
  const coneGeo = new THREE.CylinderGeometry(0.9, 0.2, 1, 14, 1, true).translate(0, 0.5, 0);
  const beamMat = mat(THREE, {
    additive: true, side: THREE.DoubleSide, vert: VERT_STD, uniforms: { uF: { value: 1 } },
    frag: /* glsl */ `uniform float uF; varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v));           // 1 at the cone's middle, 0 at its edge
        vec3 c= f>.72 ? vec3(1.,.95,.69) : (f>.38 ? vec3(1.,.82,.23) : vec3(1.,.70,.35));
        float a=(f>.72?.85:(f>.38?.6:.4))*uF*(.75+.25*vUv.y); gl_FragColor=vec4(c*.9,a); }`,
  });
  const outlineMat = mat(THREE, { vert: VERT_STD, side: THREE.BackSide, uniforms: { uF: { value: 1 } }, frag: `uniform float uF; void main(){ gl_FragColor=vec4(.54,.33,.06,.9*uF); }` });
  // contact flare: a flat hard-banded disc on the ground, capped small (no blow-out)
  const flareGeo = new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI / 2);
  const flareMat = mat(THREE, {
    additive: true, vert: VERT_STD, uniforms: { uF: { value: 1 } },
    frag: /* glsl */ `uniform float uF; varying vec2 vUv; void main(){ float r=length(vUv-.5)*2.; vec3 c= r<.4?vec3(1.,.95,.69):(r<.72?vec3(1.,.82,.23):vec3(1.,.55,.2));
      gl_FragColor=vec4(c*.8,uF*(r<.4?.9:.55)); }`,
  });

  const rg = ctx.rng(31), items = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + 0.2, R = 9, Y = 14 + (i % 3) * 2;
    const p = new THREE.Vector3(Math.cos(ang) * R, Y, Math.sin(ang) * R);
    const tgt = new THREE.Vector3(Math.cos(ang) * 4.4, 0.25, Math.sin(ang) * 4.4); // lands in the ring, clear of the seal at the plinth
    const lens = new THREE.Mesh(lensGeo, lensMat), out = new THREE.Mesh(lensGeo, outMat); out.scale.setScalar(1.045);
    lens.add(out); lens.position.copy(p); lens.renderOrder = 8; group.add(lens);
    const dir = tgt.clone().sub(p), len = dir.length();
    const beam = new THREE.Mesh(coneGeo, beamMat), ol = new THREE.Mesh(coneGeo, outlineMat);
    beam.position.copy(tgt); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate().normalize()); beam.scale.set(1, len, 1);
    ol.position.copy(tgt); ol.quaternion.copy(beam.quaternion); ol.scale.set(1.07, len, 1.07);
    beam.renderOrder = 9; ol.renderOrder = 8; group.add(ol, beam);
    const flare = new THREE.Mesh(flareGeo, flareMat); flare.position.copy(tgt).setY(0.19); flare.renderOrder = 9; group.add(flare);
    items.push({ lens, beam, ol, flare, p, tgt, t0: 0, bob: rg() * 6.28 });
  }
  // after the beams drop, the lenses drift a hair (twos); pure function of t.
  const mawC = new THREE.Vector3(), c0 = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      const la = ageOf(cue, t, "lenses", 226 / 24), ba = ageOf(cue, t, "beams", 240 / 24);
      const a = ageOf(cue, t, "maw", MAW_T0), th = eatTheta(a);
      sealPoint(seal, THREE, ...MAW_LOCAL, mawC); seal.chest(c0);
      items.forEach((it, i) => {
        const u = la < 0 ? 0 : clamp01((la - i * 0.07) / (20 / 24)); // 226-254 f, staggered per node
        const s = u <= 0 ? 0 : easeOvershoot(u); // peaks near 1.1 then settles to 1
        const hide = eaten(it.p, c0, mawC, th);
        it.lens.visible = s > 0 && !hide; it.lens.scale.setScalar(Math.max(s, 0.001));
        it.lens.position.y = it.p.y + 0.18 * Math.sin(t * 1.3 + it.bob);
        // beam i: ramps on at 10.0 + i*0.12 s, holds, falls away by ~11.9 s (node order); flicker on twos
        const b0 = ba - i * 0.12, on = b0 < 0 ? 0 : clamp01(b0 / 0.1) * (1 - clamp01((b0 - 1.55) / 0.35));
        const flick = 0.85 + 0.15 * (Math.floor(t * 12 + i) % 2);
        const vis = on > 0 && !hide;
        it.beam.visible = it.ol.visible = it.flare.visible = vis;
        const w = on * flick; it.beam.scale.x = it.beam.scale.z = Math.max(w, 0.001); it.ol.scale.x = it.ol.scale.z = Math.max(1.07 * w, 0.001);
        it.flare.scale.setScalar(0.6 + 0.6 * on * flick);
      });
    },
    dispose() { [lensGeo, coneGeo, flareGeo, lensMat, outMat, beamMat, outlineMat, flareMat].forEach((d) => d.dispose()); },
  };
}
