// S0 cast shadows: layer-1 casters and nearby layer-0 sets drawn into two light-space depth maps, one fitted round the scene
// sphere and (tier 2+) a tight one round the hero; rxCast reads the tight one where it reaches, with hardware PCF on 4 rotated
// taps sharpened to a one-pixel cel edge. Fragment shaders only.
import { BackSide, BufferAttribute, BufferGeometry, Color, DepthTexture, DoubleSide, InstancedMesh, LessEqualCompare, LinearFilter, Matrix4, Mesh, MeshDepthMaterial, NearestFilter, OrthographicCamera, RedFormat, Scene, Sphere, UnsignedByteType, UnsignedIntType, Vector3, Vector4, WebGLRenderTarget } from "three";

export function shadowUniforms() {
  return { tShadow: { value: null }, uShadowMat: { value: new Matrix4() }, uShadowP: { value: new Vector4(0, 0.002, 1 / 1024, 1) },
    tShadowH: { value: null }, uShadowMatH: { value: new Matrix4() }, uShadowPH: { value: new Vector4(0, 0.0004, 1 / 1024, 1) } };
}

export const SHADOW_GLSL = /* glsl */ `
  uniform sampler2DShadow tShadow; uniform mat4 uShadowMat; uniform vec4 uShadowP;
  uniform sampler2DShadow tShadowH; uniform mat4 uShadowMatH; uniform vec4 uShadowPH;
  // x the shadow (0 lit .. 1), y how far inside the map's frustum the point is (0 at its edge)
  vec2 rxCastM(sampler2DShadow t, mat4 M, vec4 P, vec3 worldPos, vec3 n) {
    // rows of M: d(depth)/d(world) runs away from the key; |d(u)/d(world)| is 1 / frustum width
    vec3 dz = vec3(M[0].z, M[1].z, M[2].z);
    float tw = P.z / length(vec3(M[0].x, M[1].x, M[2].x));
    float ndl = -dot(n, normalize(dz));
    vec3 s = (M * vec4(worldPos + n * tw * (0.5 + 2.0 * sqrt(max(0.0, 1.0 - ndl * ndl))), 1.0)).xyz;
    float z = s.z - P.y;
    vec2 o = vec2(P.z * 1.5);
    float lit = 0.25 * (texture(t, vec3(s.xy + vec2(-0.25, -0.75) * o, z)) + texture(t, vec3(s.xy + vec2(0.75, -0.25) * o, z))
      + texture(t, vec3(s.xy + vec2(0.25, 0.75) * o, z)) + texture(t, vec3(s.xy + vec2(-0.75, 0.25) * o, z)));
    float w = min(0.5, 0.5 * fwidth(lit) + 1e-3);
    // faces turned from the key are form shadow already (the fade ends past the terminator, so the two shadows meet);
    // a set cut by the map edge fades instead of ending on a line
    vec2 e = min(s.xy, 1.0 - s.xy);
    return vec2((1.0 - smoothstep(0.5 - w, 0.5 + w, lit)) * smoothstep(-0.12, -0.02, ndl), clamp(min(min(e.x, e.y), min(s.z, 1.0 - s.z)) * 16.0, 0.0, 1.0));
  }
  float rxCast(vec3 worldPos, vec3 worldNormal) {
    if (uShadowP.x < 0.5) return 0.0;
    vec3 n = worldNormal * inversesqrt(max(dot(worldNormal, worldNormal), 1e-6));
    vec2 a = rxCastM(tShadow, uShadowMat, uShadowP, worldPos, n);
    if (uShadowPH.x < 0.5) return a.x * a.y;
    vec2 h = rxCastM(tShadowH, uShadowMatH, uShadowPH, worldPos, n);
    return mix(a.x * a.y, h.x, h.y);
  }
`;

const BIAS = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const R_MAX = 8, HERO = 1024;
const sizeFor = (tier) => (tier >= 3 ? 2048 : tier >= 2 ? 1024 : 512);
const cut = new WeakMap(); // the one depth material cannot discard, so a cutout would cast its whole quad
const cutout = (m) => { let v = cut.get(m); if (v === undefined) cut.set(m, (v = m.alphaTest > 0 || /\bdiscard\b/.test(m.fragmentShader ?? ""))); return v; };
const skips = (o) => o.isPoints || o.isLine || o.isSprite ||
  [].concat(o.material).some((m) => m.side === BackSide || m.transparent || m.depthWrite === false || cutout(m));
// a layer-0 set casts if it is a culled mesh near the focus that neither surrounds it (ground, rooms) nor outgrows the fit
function setReach(o, focus, s) {
  if (!o.isMesh || !o.frustumCulled) return -1;
  const src = o.isInstancedMesh ? o : o.geometry;
  if (!src.boundingSphere) src.computeBoundingSphere();
  s.copy(src.boundingSphere).applyMatrix4(o.matrixWorld);
  const d = s.center.distanceTo(focus);
  return s.radius > R_MAX || d <= s.radius || d - s.radius > R_MAX ? -1 : d + s.radius;
}

export class ShadowPass {
  constructor(renderer, uniforms, { tier = 2 } = {}) {
    this.r = renderer; this.u = uniforms; this.tier = tier;
    this.size = sizeFor(tier);
    const mk = (n) => {
      const dt = new DepthTexture(n, n, UnsignedIntType);
      dt.compareFunction = LessEqualCompare;
      dt.minFilter = dt.magFilter = LinearFilter;
      return new WebGLRenderTarget(n, n, { format: RedFormat, type: UnsignedByteType, minFilter: NearestFilter, magFilter: NearestFilter, depthTexture: dt });
    };
    this.rt = mk(this.size); this.rtH = mk(HERO);
    const dt = this.rt.depthTexture;
    this.mat = new MeshDepthMaterial({ side: DoubleSide, colorWrite: false });
    this.cam = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.cam.layers.mask = 3;
    this.heroRadius = 1.2; // metres round the focus the tight map covers
    this.L = new Vector3(); this.ax = new Vector3(); this.ay = new Vector3(); this.c = new Vector3(); this.s = new Sphere();
    this.hidden = []; this.masked = [];
    uniforms.tShadow.value = dt; uniforms.tShadowH.value = this.rtH.depthTexture;
    uniforms.uShadowP.value.z = 1 / this.size;
    const geo = new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    const tinted = new InstancedMesh(geo, this.mat, 1);
    tinted.setColorAt(0, new Color());
    const warm = new Scene().add(new Mesh(geo, this.mat), new InstancedMesh(geo, this.mat, 1), tinted);
    const prev = renderer.getRenderTarget();
    renderer.initRenderTarget(this.rtH); // a shadow sampler must hold a compare texture even on tiers that never draw this map
    renderer.setRenderTarget(this.rt);
    renderer.compile(warm, this.cam);
    renderer.setRenderTarget(prev);
    geo.dispose();
  }
  render(scene, { focus, radius, lightDir }) {
    if (!focus || !lightDir || !(radius > 0) || lightDir.lengthSq() < 1e-12) { this.off(); return; }
    const r = this.r, u = this.u, cam = this.cam, size = sizeFor(this.tier), hidden = this.hidden, masked = this.masked;
    if (size !== this.size) { this.size = size; this.rt.setSize(size, size); }
    let reach = radius;
    scene.traverseVisible((o) => {
      const m = o.layers.mask;
      if (o.userData.noShadow) { hidden.push(o); return; }
      if ((m & 3) === 0 || !o.material) return;
      let d = skips(o) ? -1 : 0;
      if (d === 0 && (m & 2) === 0) { d = setReach(o, focus, this.s); reach = Math.max(reach, d); }
      if (d < 0) masked.push(o, m);
    });
    radius = Math.max(radius, Math.min(R_MAX, Math.ceil(reach)));
    const L = this.L.copy(lightDir).normalize(), polar = Math.abs(L.y) > 0.99, hero = this.tier >= 2 && this.heroRadius > 0;
    // half: the map's half width; the depth range runs from `back` behind the focus to 2 * radius toward the key, so far casters reach both maps
    const fit = (half, n, back, mat) => {
      const t = (2 * half) / n;
      cam.up.set(0, polar ? 0 : 1, polar ? 1 : 0);
      cam.position.copy(L); cam.lookAt(0, 0, 0);
      const ax = this.ax.set(1, 0, 0).applyQuaternion(cam.quaternion), ay = this.ay.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const c = this.c.copy(focus), fx = c.dot(ax), fy = c.dot(ay);
      c.addScaledVector(ax, Math.round(fx / t) * t - fx).addScaledVector(ay, Math.round(fy / t) * t - fy);
      cam.position.copy(c).addScaledVector(L, 2 * radius);
      cam.left = cam.bottom = -half; cam.right = cam.top = half; cam.near = radius; cam.far = 2 * radius + back;
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      mat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).premultiply(BIAS);
    };

    for (const o of hidden) o.visible = false;
    for (let i = 0; i < masked.length; i += 2) masked[i].layers.mask &= ~3;
    const prev = r.getRenderTarget(), face = r.getActiveCubeFace(), level = r.getActiveMipmapLevel();
    const ac = r.autoClear, ov = scene.overrideMaterial, bg = scene.background;
    try {
      scene.overrideMaterial = this.mat; scene.background = null; r.autoClear = false;
      for (const [rt, half, n, back, mat] of [[this.rt, radius, size, radius, u.uShadowMat.value], ...(hero ? [[this.rtH, this.heroRadius, HERO, this.heroRadius, u.uShadowMatH.value]] : [])]) {
        fit(half, n, back, mat);
        r.setRenderTarget(rt);
        r.state.buffers.depth.setMask(true);
        r.clear(false, true, false);
        r.render(scene, cam);
      }
    } finally {
      scene.overrideMaterial = ov; scene.background = bg; r.autoClear = ac;
      r.setRenderTarget(prev, face, level);
      for (const o of hidden) o.visible = true;
      for (let i = 0; i < masked.length; i += 2) masked[i].layers.mask = masked[i + 1];
      hidden.length = 0; masked.length = 0;
    }
    u.tShadow.value = this.rt.depthTexture;
    u.uShadowP.value.x = 1; u.uShadowP.value.z = 1 / size;
    // the tight map's depth bias is 5 mm of its own range
    u.uShadowPH.value.set(hero ? 1 : 0, 0.005 / (radius + this.heroRadius), 1 / HERO, 1);
  }
  off() {
    this.u.uShadowP.value.x = 0; this.u.uShadowPH.value.x = 0;
  }
  dispose() {
    this.off();
    if (this.u.tShadow.value === this.rt.depthTexture) this.u.tShadow.value = null;
    this.rt.dispose(); this.rtH.dispose();
    this.mat.dispose();
  }
}
