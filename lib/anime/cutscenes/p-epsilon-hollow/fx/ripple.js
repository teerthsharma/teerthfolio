// CRACK RIPPLE (bible 3.4 / FX 4): a gold front runs outward over the planet's cracks at 40 m/s, 14.6-23.0 s, 1.5 m wide.
// The world's planetMaterial lights its own cracks from the same cue ("ripple"); this shell adds the gold seams on top so the front reads
// even if the world's uniform is absent. It is a thin spherical cap (radius R + 0.12 m) centred under the pup's pole.
//
// MATHS
//   pole frame      centre C = at - (0, R, 0); for a surface point w: r = w - C, ang = acos(r.y / |r|), dist = R ang   (geodesic metres from the pup)
//   front           f(t) = 40 (t - 14.6) m; wake = f - dist; the front is wake in [0, 1.5), the glow wake in [1.5, 28].
//   cracks          Voronoi seams F2 - F1 < 0.045 (front: 0.09, a wider seam) on the polar-projected plane  uv = dist (cos az, sin az) / 5.5.
//   shading         3 stepped levels floor(3 (1 - wake/28)) / 3 of gold #ffb524 (x2.4 at the front, hot), a 2x2 stipple fills the front ring between seams.
//   clear zone      dist < 3 m is discarded (L2: nothing near the pup).
export function ripple(ctx, T) {
  const { THREE } = ctx, R = ctx.scene.fx?.planetR ?? 170;
  const geo = new THREE.SphereGeometry(R + 0.12, 160, 96, 0, Math.PI * 2, 0, 2.2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCtr: { value: new THREE.Vector3() }, uFront: { value: -1 }, uR: { value: R }, uGold: { value: new THREE.Color("#ffb524") } },
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uCtr; uniform float uFront; uniform float uR; uniform vec3 uGold; varying vec3 vW;
      float hh2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 vor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
          vec2 o = vec2(hh2(i + g), hh2(i + g + 17.0)); float d = length(g + o - f);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return vec2(d1, d2 - d1); }
      void main() {
        if (uFront < 0.0) discard;
        vec3 r = vW - uCtr; float dist = acos(clamp(r.y / length(r), -1.0, 1.0)) * uR;
        float wake = uFront - dist;
        if (dist < 3.0 || wake < 0.0 || wake > 28.0) discard;
        vec2 uv = vec2(cos(atan(r.z, r.x)), sin(atan(r.z, r.x))) * dist / 5.5;
        float seam = vor(uv).y;
        bool front = wake < 1.5;
        if (front) {
          if (seam < 0.09) { gl_FragColor = vec4(uGold * 2.4, 1.0); return; }
          vec2 g = floor(gl_FragCoord.xy); if (mod(g.x, 2.0) < 0.5 && mod(g.y, 2.0) < 0.5) { gl_FragColor = vec4(uGold * 1.1, 1.0); return; }
          discard;
        }
        if (seam > 0.045) discard;
        float lvl = floor(3.0 * (1.0 - wake / 28.0)) / 3.0;
        if (lvl <= 0.0) discard;
        gl_FragColor = vec4(uGold * (0.6 + 1.2 * lvl), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.visible = false;
  return {
    obj: mesh,
    update(ts, t) {
      const [a, b] = T.ripple, on = t >= a && t <= b;
      mesh.visible = on;
      mat.uniforms.uFront.value = on ? 40 * (t - a) : -1;
      mat.uniforms.uCtr.value.set(ctx.seal.at[0], ctx.seal.at[1] - R, ctx.seal.at[2]);
      mesh.position.set(ctx.seal.at[0], ctx.seal.at[1] - R, ctx.seal.at[2]);
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
