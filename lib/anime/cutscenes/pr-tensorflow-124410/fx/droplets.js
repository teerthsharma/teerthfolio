// Droplet cloud (frozen spray and the drowning burst): GL_POINTS, each an outlined 2-tone bead.
// Maths: point size px = aSize * (H/2) * P11 / depth   (world metres -> pixels at the drawing-buffer height H).
//   bead: d = |pc - .5|*2 ; ink ring .74 < d < 1 ; fill white above a hard diagonal cut, cyan #19d3ff below ; 1 highlight dot.
// Positions are written by the owner each step (a pure function of the stepped clock).
export const DROP_VERT = /* glsl */ `
  attribute float aSize; uniform float uHpx; varying float vD;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z;
    gl_PointSize = clamp(aSize * uHpx * 0.5 * projectionMatrix[1][1] / max(vD, 0.1), 1.0, 96.0);
    gl_Position = projectionMatrix * mv; }`;
export const DROP_FRAG = /* glsl */ `
  uniform vec3 uFill, uShade, uInk; uniform float uA; varying float vD;
  void main(){ vec2 p = (gl_PointCoord - .5) * 2.; float d = length(p); if (d > 1.0) discard;
    vec3 c = (p.x + p.y * 0.8 > 0.15) ? uShade : uFill;           // hard diagonal cut: lit upper-left, shade lower-right
    if (d > 0.74) c = uInk;
    if (length(p - vec2(-.38, .38)) < .16) c = vec3(1.);            // the one highlight
    gl_FragColor = vec4(c, uA); }`;

export function makeDroplets(ctx, n, { fill = "#f4fbff", shade = "#19d3ff", ink = "#05020a", order = 142 } = {}) {
  const { THREE } = ctx;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), size = new Float32Array(n);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const u = { uHpx: { value: 720 }, uFill: { value: new THREE.Color(fill) }, uShade: { value: new THREE.Color(shade) }, uInk: { value: new THREE.Color(ink) }, uA: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: DROP_VERT, fragmentShader: DROP_FRAG, uniforms: u, transparent: true, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = order; pts.visible = false;
  const sz = new THREE.Vector2();
  pts.onBeforeRender = (r) => { r.getDrawingBufferSize(sz); u.uHpx.value = sz.y; };
  return { pts, pos, size, geo: g, mat, commit() { g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; } };
}
