// HULL PROBES as gold-leaf scratches on a plaster Wall card. Same Rumbling picture, not a second mountain.
// MATHS  42 probe directions from the icosphere verts. Scratch i is a gold stripe in card UV:
//        d = |q.x - (0.12 + 0.8 o_i) + 0.04 sin(9 q.y + ph_i)|; on = 1 - smoothstep(0, 1.5 fwidth(d), d - 0.01).
//        Visible iff probe order o_i < uProg (the hull close). Luma cap 0.92. Graphite #3a3228, never #000.
// TOOLKIT: noise, cel (compose). Programs built here once.

export const meta = {
  name: "gold-scratch",
  params: { probes: { def: 42 }, lumaMax: { def: 0.92 } },
};

export function make(ctx, S) {
  const { THREE } = ctx;
  const n = Math.min(42, S.verts?.length ?? 0);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const v = S.verts[i];
    const o = (Math.atan2(v.z, v.x) + 0.35 * Math.PI * v.y + Math.PI) / (2 * Math.PI);
    const ph = (v.x + v.y * 1.7 + v.z * 2.3) * 4.0;
    pairs.push(`vec2(${o.toFixed(4)}, ${ph.toFixed(4)})`);
  }
  while (pairs.length < 42) pairs.push("vec2(2.0, 0.0)");
  const scratches = pairs.map((p) => `
        {
          vec2 pr = ${p};
          if (pr.x <= uProg) {
            float x0 = 0.10 + 0.80 * pr.x;
            float d = abs(q.x - x0 + 0.045 * sin(9.0 * q.y + pr.y));
            float fw = max(0.004, fwidth(d) * 1.5);
            acc = max(acc, 1.0 - smoothstep(0.0, fw, d - 0.008));
          }
        }`).join("");
  const U = { uProg: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uProg;
      varying vec2 vUv;
      ${ctx.tools.glslFor(["noise", "cel"])}
      const vec3 PAPER = vec3(0.8314, 0.7686, 0.6902);
      const vec3 GOLD = vec3(0.8314, 0.6353, 0.3216);
      const vec3 GRAPH = vec3(0.2275, 0.1961, 0.1569);
      const vec3 SEPIA = vec3(0.3529, 0.2314, 0.1333);
      void main() {
        vec2 q = vUv;
        vec3 col = mix(PAPER, GOLD * 0.55, fbm(q * 6.0) * 0.5);
        vec2 vc = vor(q * 5.0);
        col = mix(col, SEPIA, (1.0 - smoothstep(0.0, max(0.03, fwidth(vc.y) * 1.6), vc.y)) * 0.3);
        float acc = 0.0;
        ${scratches}
        col = mix(col, GOLD, acc * 0.85);
        col = mix(col, GRAPH, acc * 0.15);
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        float a = 0.22 + 0.55 * acc;
        if (a < 0.02) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), mat);
  mesh.position.set(0, 1.4, -2.4);
  mesh.frustumCulled = false; mesh.renderOrder = 1;
  const group = new THREE.Group(); group.add(mesh);
  return {
    group,
    update(ts) {
      const T = S.T;
      const p = ts >= T.close0 ? Math.min(1.04, (ts - T.close0) / Math.max(1e-3, T.close1 - T.close0)) : 0;
      U.uProg.value = p * p * (3 - 2 * p) * 1.04;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
