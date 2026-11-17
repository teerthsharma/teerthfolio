// FX for _chart: one emissive orb in the far sky and small lamps on the far ground, static plate objects (layer 0). Additive, no depth write and the id
// alpha kept, so it reads as sky: it blooms, opens into a bokeh disc out of focus, takes no line and casts no shadow.
// It is also the shaft source (engine.sun), restored on dispose.
import { AddEquation, Color, CustomBlending, Group, Mesh, OneFactor, ShaderMaterial, SphereGeometry, ZeroFactor } from "three";

export default function build(ctx) {
  const { engine, scene, palette } = ctx;
  const O = scene.set.orb;
  const mat = new ShaderMaterial({
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vN = mat3(modelMatrix) * normal; vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
      void main() { float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0); float r = sqrt(1.0 - f * f);
        float w = fwidth(r) + 1e-3; float core = 1.0 - smoothstep(0.5 - w, 0.5 + w, r);
        gl_FragColor = vec4(uCol * (2.8 * core + 0.6 * (1.0 - r) * (1.0 - r)), 0.0); }`,
    uniforms: { uCol: { value: new Color(palette.orb) } },
    blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor,
    transparent: true, depthWrite: false,
  });
  const orb = new Mesh(new SphereGeometry(O.r, 32, 16), mat);
  orb.position.fromArray(O.at);
  orb.frustumCulled = false; // drawn from the first plate on, so its program links at load, not when the wide cuts in
  orb.userData.layer = 0;
  orb.userData.noShadow = true;
  const group = new Group();
  group.add(orb);
  for (const [x, y, z, r] of scene.set.lamps) {
    const m = new Mesh(orb.geometry, mat);
    m.position.set(x, y, z); m.scale.setScalar(r / O.r);
    m.frustumCulled = false; m.userData.layer = 0; m.userData.noShadow = true;
    group.add(m);
  }
  const prevSun = engine.sun;
  engine.sun = orb.position.clone();
  return {
    group,
    update() {},
    dispose() { mat.dispose(); orb.geometry.dispose(); engine.sun = prevSun; },
  };
}
