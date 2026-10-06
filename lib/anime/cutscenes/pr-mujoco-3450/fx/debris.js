// E12 DEBRIS SHARDS (debris-chunk): 24 ink-edged flat polygon shards thrown from the hull corner along the punch diagonal.
// MATHS (a pure function of the stepped clock; twos):
//   launch     p0 = (1.1, 1.1, -0.9) (the bible's burst point); v_i = D * 2.2 s_i + cone(h) 0.9 + up 1.4,  s_i in [.75, 1.25]
//   flight     p(a) = p0 + v a - (0, 4.6, 0) a^2 / 2, clamped to the plain (y >= .05 : shards skid, not sink); a = age in seconds
//   tumble     rotation = 8 rad/s * a about a per-shard axis (axis from hash)
//   size       s_i in [0.04, 0.15] m, shrink to 0 over the last 8 frames of the 26-frame life (f112 -> f120)
//   colour     cream #f3ecd8 / mint #3de0b0 for the first 18; violet #b79bff for the 6 late shards (launched 10 frames later)
//   shading    two flat tones from the face normal (lam > 0 lit, else x0.62 toward the deep tone), 1.25x ink hull behind
//   glint      one white 4-point star per shard, blinking on twos (1 px read at distance)
import { BackSide, BufferAttribute, BufferGeometry, Group, Mesh, Points, ShaderMaterial, TetrahedronGeometry, Vector3, Euler, Quaternion } from "three";
import { C, PAL, fr, hash, clamp, GLSL_HASH } from "./util.js";

const SH_V = `attribute vec3 aCol; varying vec3 vW, vC; void main(){ vC = aCol; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SH_F = `uniform vec3 uL, uDeep; varying vec3 vW, vC;
void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); float lam = dot(n, uL);
  vec3 c = lam > 0.0 ? vC : mix(vC, uDeep, 0.45) * 0.78; gl_FragColor = vec4(c, 1.0); }`;
const GL_V = `uniform float uPx; attribute float aOn; void main(){ gl_PointSize = uPx * aOn; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GL_F = `void main(){ vec2 a = abs((gl_PointCoord - 0.5) * 2.0); if (sqrt(a.x) + sqrt(a.y) > 1.0) discard; gl_FragColor = vec4(1.0); }`;

export function make(ctx, S) {
  const { T, F } = S, N = 24;
  const group = new Group(), shards = [];
  const mat = new ShaderMaterial({ vertexShader: SH_V, fragmentShader: SH_F, uniforms: { uL: { value: new Vector3(-0.3, 0.7, 0.6).normalize() }, uDeep: { value: C(PAL.violetDeep) } } });
  const inkMat = new ShaderMaterial({ vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.0); }`, uniforms: { uInk: { value: C(PAL.ink) } }, side: BackSide });
  const base = new TetrahedronGeometry(1, 0);
  const o0 = new Vector3(1.1, 1.1, -0.9), up = new Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const late = i >= 18, h = (k) => hash(i * 13.7 + k);
    const g = base.clone(); g.scale(1, 0.38 + 0.2 * h(1), 0.6 + 0.3 * h(2)); // a flat chip, not a cube
    const col = C(late ? PAL.violet : (i % 2 ? PAL.mint : PAL.cream));
    const ca = new Float32Array(g.attributes.position.count * 3); for (let v = 0; v < ca.length; v += 3) { ca[v] = col.r; ca[v + 1] = col.g; ca[v + 2] = col.b; }
    g.setAttribute("aCol", new BufferAttribute(ca, 3));
    const m = new Mesh(g, mat), ink = new Mesh(g, inkMat); ink.scale.setScalar(1.28);
    const grp = new Group(); grp.add(ink, m); grp.frustumCulled = false; m.frustumCulled = ink.frustumCulled = false;
    grp.renderOrder = 5; group.add(grp);
    const axis = new Vector3(h(3) - 0.5, h(4) - 0.5, h(5) - 0.5).normalize();
    const cone = new Vector3(h(6) - 0.5, h(7) - 0.5, h(8) - 0.5).multiplyScalar(0.9 * 2);
    const v = F.D.clone().multiplyScalar(2.2 * (0.75 + 0.5 * h(9))).add(cone).addScaledVector(up, 1.4);
    shards.push({ grp, g, axis, v, size: 0.04 + 0.11 * h(10), delay: late ? fr(10) : 0, phase: Math.floor(h(11) * 4) });
  }
  // glints
  const gp = new Float32Array(N * 3), go = new Float32Array(N);
  const ggeo = new BufferGeometry(); ggeo.setAttribute("position", new BufferAttribute(gp, 3)); ggeo.setAttribute("aOn", new BufferAttribute(go, 1));
  const gmat = new ShaderMaterial({ vertexShader: GL_V, fragmentShader: GL_F, uniforms: { uPx: { value: 6 } }, transparent: true, depthWrite: false });
  const glints = new Points(ggeo, gmat); glints.renderOrder = 9; glints.frustumCulled = false; group.add(glints);
  const q = new Quaternion(), tmp = new Vector3();
  return {
    group,
    update(ts) {
      gmat.uniforms.uPx.value = 6 * S.resH.value / 720;
      const life = T.deb1 - T.deb0, step = Math.round(ts * 12);
      shards.forEach((s, i) => {
        const a = ts - T.deb0 - s.delay, on = a >= 0 && a <= life - s.delay;
        s.grp.visible = on; go[i] = 0;
        if (!on) return;
        tmp.copy(o0).addScaledVector(s.v, a); tmp.y -= 2.3 * a * a; if (tmp.y < 0.05) tmp.y = 0.05;
        s.grp.position.copy(tmp);
        q.setFromAxisAngle(s.axis, 8 * a); s.grp.quaternion.copy(q);
        const shrink = 1 - clamp((a - (life - s.delay - fr(8))) / fr(8));
        s.grp.scale.setScalar(Math.max(1e-3, s.size * shrink * 1.6));
        gp.set([tmp.x, tmp.y, tmp.z], i * 3);
        go[i] = ((step + s.phase) % 4 === 0 && shrink > 0.3) ? 1 : 0; // glint blinks on twos
      });
      ggeo.attributes.position.needsUpdate = true; ggeo.attributes.aOn.needsUpdate = true;
    },
    dispose() { for (const s of shards) s.g.dispose(); for (const o of [base, ggeo, gmat, mat, inkMat]) o.dispose(); },
  };
}
