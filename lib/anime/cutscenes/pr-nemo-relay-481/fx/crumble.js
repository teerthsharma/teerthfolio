// Stage crumble (bible 3 + 6): seam cracks, tile-chunk fall outside-in along the mosaic seams, dust, sky dissolving in blocks,
// plus the spend shock dome and the credit's pale tinted light. Window beat "crumble" (default 13.5 s, 3.0 s; the bible's half
// speed is the director's time-scale, this layer reads stepped t). Arena centre = beat arg "c" or the seal's base; radius 24 m, 8 rings.
// Chunk i of ring r: angular slot a, delay d = (1 - r/7) * 0.7 * dur + jitter * 0.1 dur (outer ring first); once released it falls
// y(tau) = -0.5 g tau^2 with outward drift and tumble. Pure function of t.
import { GLSL_NOISE, hash, clamp01, sstep, wk, disposeAll, makeCard } from "./util.js";

const RINGS = 8, R_OUT = 24, DENS = 2.0;
const COLS = ["#e8d8c0", "#a86a48", "#6a7a8a"]; // mosaic cream, terracotta, grey-blue

// Sky blocks: shell of grid cells in (az, el); each cell has a random threshold; cell goes near-black #0a0814 (with a maroon
// edge #5a1a28) once uK > threshold. Cell size 18 x 12 cells; hash h21(cell).
const SKY_F = GLSL_NOISE + /* glsl */ `
varying vec3 vP; uniform float uK;
void main(){
  vec3 d = normalize(vP);
  float az = atan(d.z, d.x), el = asin(clamp(d.y, -1.0, 1.0));
  vec2 g = vec2(az * 3.0, el * 4.0);
  vec2 cell = floor(g), f = fract(g);
  float th = h21(cell);
  float on = step(th, uK);
  float edge = step(min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)), 0.06) * on;
  vec3 col = mix(vec3(0.039, 0.031, 0.078), vec3(0.353, 0.102, 0.157), edge);
  gl_FragColor = vec4(col, on * 0.92);
}`;
// Dome: expanding fresnel shell for the spend / blow-back: alpha = rim^2 * (1 - k); silver-cyan #a8d8ff, cap 0.92.
const DOME_F = /* glsl */ `
varying vec3 vN; varying vec3 vV; uniform float uA;
void main(){ float v = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float rim = pow(1.0 - v, 2.0);
  gl_FragColor = vec4(min(mix(vec3(0.788,0.831,0.910), vec3(0.659,0.847,1.0), rim), vec3(0.92)), rim * uA); }`;
// Credit light: pale tinted vertical sweep #c8d8e8 fading with height; alpha = 0.22 * gaussian band * fbm modulation.
const LIGHT_F = /* glsl */ `
varying vec2 vUv; uniform float uA; uniform float uT;
void main(){ float band = exp(-pow((vUv.x - 0.5) * 3.2, 2.0)); float n = fbm(vec2(vUv.x * 4.0, vUv.y * 2.0 - uT * 0.1));
  float a = band * (0.55 + 0.45 * n) * smoothstep(0.0, 0.7, vUv.y) * (1.0 - vUv.y * 0.4) * uA * 0.22;
  gl_FragColor = vec4(vec3(0.784, 0.847, 0.910), a); }`;

export function buildCrumble(ctx, frame, win) {
  const THREE = ctx.THREE, g = new THREE.Group();
  const wC = win("crumble", 13.5, 3.0), wS = win("spend", 13.5, 1.2), wCr = win("credit", 18.8, 6.2);
  const cen = (wC.b && wC.b.c) || null;
  const centre = new THREE.Vector3();

  // chunk list
  const chunks = [];
  for (let r = 0; r < RINGS; r++) {
    const rad = 3 + r * 3, n = Math.round((2 * Math.PI * rad / 3) * DENS * 0.5);
    for (let a = 0; a < n; a++) chunks.push({ r, ang: (a / n) * 6.283 + (r % 2) * 0.05, rad, w: 0.9 + hash(a + r * 31) * 0.6, jit: hash(a * 7 + r) });
  }
  const tri = new THREE.CylinderGeometry(1, 1, 0.45, 3); // triangle prism tile
  const imesh = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ color: 0xffffff }), chunks.length);
  imesh.frustumCulled = false; imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chunks.forEach((c, i) => imesh.setColorAt(i, new THREE.Color(COLS[(i + c.r) % 3])));
  imesh.instanceColor.needsUpdate = true; g.add(imesh);
  const dummy = new THREE.Object3D();

  // seam cracks: a glowing line along each ring seam and a radial seam per chunk (lines on the floor), fade in before the break
  const lp = [];
  for (let r = 0; r < RINGS; r++) { const rad = 3 + r * 3; for (let s = 0; s < 48; s++) { const a0 = (s / 48) * 6.283, a1 = ((s + 1) / 48) * 6.283; lp.push(Math.cos(a0) * rad, 0.03, Math.sin(a0) * rad, Math.cos(a1) * rad, 0.03, Math.sin(a1) * rad); } }
  for (let a = 0; a < 36; a++) { const ang = (a / 36) * 6.283; lp.push(Math.cos(ang) * 3, 0.03, Math.sin(ang) * 3, Math.cos(ang) * R_OUT, 0.03, Math.sin(ang) * R_OUT); }
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const lmat = new THREE.LineBasicMaterial({ color: new THREE.Color("#ffd890"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const seams = new THREE.LineSegments(lgeo, lmat); seams.frustumCulled = false; seams.renderOrder = 2; g.add(seams);

  // dust
  const ND = 220, dpp = new Float32Array(ND * 3), dal = new Float32Array(ND);
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dpp, 3)); dg.setAttribute("al", new THREE.BufferAttribute(dal, 1));
  const dm = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 700 } }, vertexShader: "attribute float al; varying float vA; uniform float uPx; void main(){ vA = al; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(2.0, 0.9 * uPx / -mv.z); gl_Position = projectionMatrix * mv; }", fragmentShader: "varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(0.42, 0.40, 0.44, vA * (1.0 - r * 2.0) * 0.5); }", transparent: true, depthWrite: false });
  const dust = new THREE.Points(dg, dm); dust.frustumCulled = false; dust.renderOrder = 2; g.add(dust);

  // sky blocks
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }", fragmentShader: SKY_F, transparent: true, depthWrite: false, side: THREE.BackSide }));
  sky.frustumCulled = false; sky.renderOrder = 1; sky.visible = false; g.add(sky);

  // spend dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }", fragmentShader: DOME_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  dome.frustumCulled = false; dome.renderOrder = 7; dome.visible = false; g.add(dome);

  // credit light
  const light = makeCard(ctx, LIGHT_F, {}, 60, 40, { back: 25, order: 0 }); g.add(light);

  const sz = new THREE.Vector2();
  return {
    group: g,
    update(t) {
      ctx.engine.renderer?.getDrawingBufferSize(sz); dm.uniforms.uPx.value = sz.y || 700;
      if (cen) centre.set(cen[0], cen[1], cen[2]); else centre.copy(frame.base);
      const kc = (t - wC.t0) / wC.dur; // <0 pre-tremble; 0..1 break
      // pre-break: seam cracks glow in over the last 1.2 s before
      lmat.opacity = clamp01((t - (wC.t0 - 1.2)) / 1.2) * (kc > 1.2 ? 0 : 0.85) * (0.7 + 0.3 * ((Math.floor(t * 12) & 1)));
      seams.visible = lmat.opacity > 0.01; seams.position.copy(centre);
      // chunks
      let any = false;
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const delay = (1 - c.r / (RINGS - 1)) * 0.7 + c.jit * 0.1; // outside-in (fraction of dur)
        const tau = (kc - delay) * wC.dur;
        if (tau < 0 || kc > 3) { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); imesh.setMatrixAt(i, dummy.matrix); continue; }
        any = true;
        const out = 1 + tau * 0.15;
        dummy.position.set(centre.x + Math.cos(c.ang) * c.rad * out, centre.y - 0.5 * 9.8 * tau * tau * 0.55, centre.z + Math.sin(c.ang) * c.rad * out);
        dummy.rotation.set(tau * (1.5 + c.jit * 2), c.ang + tau * c.jit, tau * 1.1);
        dummy.scale.set(c.w, 1, c.w); dummy.updateMatrix(); imesh.setMatrixAt(i, dummy.matrix);
      }
      imesh.visible = any; imesh.instanceMatrix.needsUpdate = true;
      // dust rises from released rings
      const dk = clamp01(kc);
      for (let i = 0; i < ND; i++) {
        const age = (t * 0.6 + hash(i)) % 1, ang = hash(i + 40) * 6.283, rad = (3 + hash(i + 80) * 21) * (1 + 0.1 * age);
        dpp[i * 3] = centre.x + Math.cos(ang) * rad; dpp[i * 3 + 1] = centre.y + age * 4; dpp[i * 3 + 2] = centre.z + Math.sin(ang) * rad;
        dal[i] = kc >= 0 && kc < 1.6 ? (1 - age) * sstep(0, 0.15, dk) : 0;
      }
      dg.attributes.position.needsUpdate = true; dg.attributes.al.needsUpdate = true;
      // sky blocks: dissolve from 20 percent to 100 percent across the break
      sky.visible = kc > 0.1; sky.material.uniforms.uK.value = clamp01((kc - 0.1) / 0.9) * 0.9;
      sky.position.copy(frame.base);
      // spend dome: expands 0 -> 30 m over 0.9 s, silver-cyan
      const ks = (t - wS.t0) / 0.9;
      dome.visible = ks >= 0 && ks <= 1; dome.position.copy(frame.chest);
      dome.scale.setScalar(1 + 29 * ks); dome.material.uniforms.uA.value = (1 - ks) * 0.3;
      // credit light
      const kl = wk(wCr, t);
      light.visible = kl >= 0 && kl <= 1; light.material.uniforms.uA.value = sstep(0, 0.2, kl) * (1 - sstep(0.85, 1, kl)); light.material.uniforms.uT.value = t;
      light.userData.anchor.copy(frame.chest); light.userData.lift = 8;
    },
    dispose() { disposeAll(g); },
  };
}
