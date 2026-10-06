// FRESCO-BORDER REGISTER: the GPU forest as a Giotto chapel border, not a second Rumbling / not a Namek cartoon.
// Screen-space NDC plate (cheap). Vine + pear-tree register in plaster, gold leaf, graphite.
// MATHS  p = (ndc.x * asp, ndc.y); frame = min(1-|x|, 1-|y|). Ornament lives where frame < 0.18.
//        tree i: trunk slab + 3 canopy ellipses. Gold leaf via fbm. Craquelure via vor + fwidth.
// TOOLKIT: noise, cel, ink, grunge. Program linked in build().

export const meta = {
  name: "fresco-border",
  params: { frame: { def: 0.18 }, lumaMax: { def: 0.92 } },
};

export function buildFrescoBorder(ctx) {
  const { THREE } = ctx;
  const tools = ctx.tools.glslFor(["noise", "cel", "ink", "grunge"]);
  const U = { uAsp: { value: 16 / 9 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: "varying vec2 vN; void main(){ vN = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uAsp; varying vec2 vN;
      ${tools}
      const vec3 PAPER = vec3(0.8314, 0.7686, 0.6902);
      const vec3 PLASTER = vec3(0.9373, 0.8941, 0.8118);
      const vec3 GOLD_A = vec3(0.7216, 0.5176, 0.1804);
      const vec3 GOLD_B = vec3(0.8941, 0.7059, 0.3216);
      const vec3 GRAPH = vec3(0.2275, 0.1961, 0.1569);
      const vec3 SEPIA = vec3(0.3529, 0.2314, 0.1333);
      const vec3 VERD = vec3(0.3725, 0.5608, 0.4784);
      vec3 capLuma(vec3 c) {
        float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
        return c * min(1.0, 0.920 / max(Y, 1e-4));
      }
      float sdEll(vec2 p, vec2 c, vec2 r) { return (length((p - c) / r) - 1.0) * min(r.x, r.y); }
      float tree(vec2 p, vec2 o, float s) {
        vec2 q = (p - o) / s;
        float trunk = max(abs(q.x) - 0.05, max(q.y - 0.12, -0.62 - q.y));
        float cap = sdEll(q, vec2(0.0, 0.30), vec2(0.30, 0.24));
        cap = min(cap, sdEll(q, vec2(-0.18, 0.18), vec2(0.17, 0.14)));
        cap = min(cap, sdEll(q, vec2(0.17, 0.18), vec2(0.16, 0.13)));
        return min(trunk, cap);
      }
      void main() {
        vec2 p = vec2(vN.x * uAsp, vN.y);
        float frame = min(1.0 - abs(vN.x), 1.0 - abs(vN.y));
        float band = 1.0 - smoothstep(0.0, 0.18, frame);
        if (band < 0.02) discard;
        vec3 col = mix(PAPER, PLASTER, fbm(p * 5.5));
        col *= grunge2(p * 4.0, 0.3, 0.2);
        col = mix(col, mix(GOLD_A, GOLD_B, fbm(p * 14.0)), 0.48);
        float acc = 1e3;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          acc = min(acc, tree(p, vec2(-1.55 + fi * 0.44, -0.78), 0.20));
          acc = min(acc, tree(p, vec2(-1.55 + fi * 0.44, 0.78), 0.17));
        }
        col = mix(col, mix(VERD, GOLD_A, 0.4), aaf(acc) * 0.85);
        col = mix(col, GRAPH, jaggedInk(acc, 0.0, 1.3, 22.0, p) * 0.8);
        vec2 vc = vor(p * 7.0);
        col = mix(col, SEPIA, (1.0 - smoothstep(0.0, max(0.025, fwidth(vc.y) * 1.6), vc.y)) * 0.35);
        col = mix(col, GRAPH, isoInk(frame, 0.16, 1.6) * 0.7);
        gl_FragColor = vec4(capLuma(col), band * 0.92);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = 18;
  const group = new THREE.Group(); group.add(quad);
  return {
    group,
    update() { U.uAsp.value = ctx.aspect ? ctx.aspect() : 16 / 9; },
    dispose() { quad.geometry.dispose(); mat.dispose(); },
  };
}
