// GOLD LEAF flakes: cheap additive points over the Wall. Gilding dust, not a particle field for its own sake.
// MATHS  y = 6 + mod(8 a + 0.25 t, 10); sway = 0.4 sin(1.1 t + 18 a); flicker on twos.
//        size = (2.2 + 2.4 b) px * (resY / 720). Core #e9a252, rim #c99a4a. Luma kept under 0.92 via colour choice.
// TOOLKIT: local hash only (compose later with gold-leaf-matcap if the toolsmith ships it).

export const meta = {
  name: "gold-leaf",
  params: { count: { def: 90 }, lumaMax: { def: 0.92 } },
};

export default function buildGoldLeaf(ctx) {
  const { THREE } = ctx;
  const R = ctx.rng(53), N = 90;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos.set([(R() - 0.5) * 36, 2 + R() * 14, -29.2], i * 3);
    seed.set([R(), R(), R(), R()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aS", new THREE.BufferAttribute(seed, 4));
  const U = { uT: { value: 0 }, uOn: { value: 1 }, uRes: { value: 720 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aS; uniform float uT, uOn, uRes; varying float vA; varying float vH;
      void main() {
        float rise = mod(aS.x * 8.0 + uT * 0.25, 10.0);
        vec3 p = position;
        p.y += rise * 0.35;
        p.x += sin(uT * 1.1 + aS.y * 18.0) * 0.4;
        float fl = 0.55 + 0.45 * sin(uT * 7.0 + aS.z * 30.0);
        vA = (1.0 - rise / 10.0) * fl * uOn;
        vH = aS.w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.2 + 2.4 * aS.y) * uRes / 720.0;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vH;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r = length(q);
        if (r > 1.0 || vA < 0.02) discard;
        // flake diamond, gold leaf not a round spark
        float diamond = abs(q.x) + abs(q.y);
        if (diamond > 1.05) discard;
        vec3 c = mix(vec3(0.788, 0.604, 0.290), vec3(0.914, 0.635, 0.322), vH);
        float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(c, vA * (1.0 - r) * 0.85);
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 8; pts.userData.layer = 1;
  const group = new THREE.Group(); group.add(pts);
  const size = new THREE.Vector2();
  return {
    group,
    update(t) {
      U.uT.value = t;
      U.uOn.value = t < 16.2 ? 1 : Math.max(0, 1 - (t - 16.2) * 0.8);
      ctx.engine?.renderer?.getDrawingBufferSize?.(size);
      if (size.y) U.uRes.value = size.y;
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
