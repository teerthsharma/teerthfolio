// E03 + E04 THE HULL: 42 vertices, 80 faces (icosphere detail 1) floating at the figure-frame H, turning 0.3 rad/s.
// Born f41-55 as wire + vertex dots; the faces CLOSE in a spiral sweep f101-135 (mint -> violet) with a 2-frame white leading edge,
// a 3 px ink silhouette, diagonal hatch on shadow faces, a 14 px star glint on the upper-left face.
// MATHS
//   sweep order   o_f = norm( atan2(c_z, c_x) + 0.35 pi c_y ),  c = face centroid;  face visible iff o_f < p(t),
//                 p(t) = smooth((t - close0)/(close1 - close0)) (1 + 0.04) ; leading edge = p - 0.045 < o_f
//   face tone     two flat tones from the screen-space flat normal n = normalize(dFdx(P) x dFdy(P)), L = norm(-.3, .7, .6):
//                 lam > .35 lit, lam > -.2 mid, else shadow (violet shift); palette mix(mint, violet, o_f) per band
//   hatch         shadow faces only: h = step(.82, fract((fx + fy)/7)), pixel diagonal, constant in px
//   ink hull      back faces pushed along the smooth normal by 3 px in clip space: clip.xy += n_clip.xy * px 2 w / res
//   dots          42 points, 4 px white + 1 px ink ring; dot j pops (easeOutBack, 0.12 s) when its ray lands (rays.js landTime)
//   wire          120 edges (EdgesGeometry 1 deg), #f3ecd8 at 0.5, fades out by f135 as the faces fill
import { BackSide, BufferAttribute, BufferGeometry, DoubleSide, EdgesGeometry, Group, IcosahedronGeometry, LineBasicMaterial, LineSegments, Mesh, Points, ShaderMaterial, Vector3 } from "three";
import { C, PAL, sstep, landTime } from "./util.js";

const FACE_V = `
attribute float aOrd; attribute vec3 aSm;
uniform float uInk, uRes;
varying vec3 vW; varying float vOrd;
void main(){
  vOrd = aOrd;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vec4 cp = projectionMatrix * viewMatrix * wp;
  if (uInk > 0.0) {
    vec3 nw = normalize(mat3(modelMatrix) * aSm);
    vec4 cn = projectionMatrix * viewMatrix * vec4(wp.xyz + nw, 1.0);
    vec2 d = normalize(cn.xy / cn.w - cp.xy / cp.w + vec2(1e-5));
    cp.xy += d * uInk * 2.0 * cp.w / uRes;       // constant-pixel ink (uRes = viewport height)
  }
  gl_Position = cp;
}`;
const FACE_F = `
uniform float uProg, uInk, uAlpha; uniform vec3 uInkC, uWhite, uL;
uniform vec3 uML, uMM, uMS, uMD, uVL, uVM, uVS, uVD;
varying vec3 vW; varying float vOrd;
void main(){
  if (vOrd > uProg) discard;
  if (uInk > 0.0) { gl_FragColor = vec4(uInkC, uAlpha); return; }
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  if (!gl_FrontFacing) n = -n;
  float lam = dot(n, uL);
  vec3 lit = mix(uML, uVL, vOrd), mid = mix(uMM, uVM, vOrd), sh = mix(uMS, uVS, vOrd), dp = mix(uMD, uVD, vOrd);
  vec3 c = lam > 0.35 ? lit : (lam > -0.2 ? mid : sh);
  if (lam <= -0.2) { float h = step(0.82, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0)); c = mix(c, dp, h * 0.7); }   // diagonal hatch on shadow faces
  float edge = smoothstep(uProg - 0.045, uProg, vOrd);                                                                  // the 2-frame lit leading edge
  c = mix(c, uWhite, edge * step(0.001, uProg) * step(uProg, 1.0));
  gl_FragColor = vec4(c, uAlpha);
}`;
const DOT_V = `
attribute float aLand;
uniform float uT, uPx, uA;
varying float vA;
void main(){
  float k = clamp((uT - aLand) / 0.12, 0.0, 1.0);
  float c1 = 1.70158, t = k - 1.0, bk = 1.0 + (c1 + 1.0) * t * t * t + c1 * t * t;
  gl_PointSize = uPx * bk * step(0.0001, k);
  vA = uA;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOT_F = `
uniform vec3 uWhite, uInkC; varying float vA;
void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(r < 0.7 ? uWhite : uInkC, vA); }`;
const STAR_V = `uniform float uPx, uA; varying float vA; void main(){ gl_PointSize = uPx; vA = uA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STAR_F = `varying float vA;
void main(){ vec2 a = abs((gl_PointCoord - 0.5) * 2.0);
  if (sqrt(a.x) + sqrt(a.y) > 1.0 || vA <= 0.0) discard;                                    // 4-point astroid star
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }`;

export function make(ctx, S) {
  const { T, F, plan } = S;
  const ico = new IcosahedronGeometry(1, 1); // non-indexed: 80 faces
  const P = ico.attributes.position, nf = P.count / 3;
  const ord = new Float32Array(P.count), sm = new Float32Array(P.count * 3), cen = [];
  let lo = 1e9, hi = -1e9;
  for (let f = 0; f < nf; f++) {
    const c = new Vector3();
    for (let k = 0; k < 3; k++) c.add(new Vector3(P.getX(f * 3 + k), P.getY(f * 3 + k), P.getZ(f * 3 + k)));
    c.multiplyScalar(1 / 3); cen.push(c);
    const o = Math.atan2(c.z, c.x) + 0.35 * Math.PI * c.y; // spiral sweep ordered by atan2 plus 0.35 y
    lo = Math.min(lo, o); hi = Math.max(hi, o);
    for (let k = 0; k < 3; k++) ord[f * 3 + k] = o;
  }
  for (let i = 0; i < P.count; i++) {
    ord[i] = (ord[i] - lo) / (hi - lo);
    const v = new Vector3(P.getX(i), P.getY(i), P.getZ(i)).normalize(); sm.set([v.x, v.y, v.z], i * 3); // smooth (sphere) normal for the ink hull
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", P.clone()); geo.setAttribute("aOrd", new BufferAttribute(ord, 1)); geo.setAttribute("aSm", new BufferAttribute(sm, 3));
  const L = new Vector3(-0.3, 0.7, 0.6).normalize();
  const fu = (ink) => ({
    uProg: { value: 0 }, uInk: { value: ink }, uRes: S.resH, uAlpha: { value: 1 }, uInkC: { value: C(PAL.ink) }, uWhite: { value: C("#ffffff") }, uL: { value: L },
    uML: { value: C("#7ff0cf") }, uMM: { value: C(PAL.mint) }, uMS: { value: C(PAL.mintSh) }, uMD: { value: C(PAL.mintDeep) },
    uVL: { value: C(PAL.violetLit) }, uVM: { value: C(PAL.violet) }, uVS: { value: C(PAL.violetSh) }, uVD: { value: C(PAL.violetDeep) },
  });
  const faceMat = new ShaderMaterial({ vertexShader: FACE_V, fragmentShader: FACE_F, uniforms: fu(0), side: DoubleSide });
  const inkMat = new ShaderMaterial({ vertexShader: FACE_V, fragmentShader: FACE_F, uniforms: fu(3), side: BackSide });
  const faces = new Mesh(geo, faceMat), inkHull = new Mesh(geo, inkMat);
  faces.renderOrder = 3; inkHull.renderOrder = 2; faces.frustumCulled = inkHull.frustumCulled = false;

  const wire = new LineSegments(new EdgesGeometry(ico, 1), new LineBasicMaterial({ color: C(PAL.cream), transparent: true, opacity: 0.5, depthWrite: false }));
  wire.renderOrder = 3;

  // vertex dots: one per hull vertex, popping when its ray lands
  const dp = new Float32Array(42 * 3), dl = new Float32Array(42).fill(1e9);
  S.verts.forEach((v, j) => dp.set([v.x, v.y, v.z], j * 3));
  for (const r of plan) if (r.v >= 0) dl[r.v] = landTime(T, r);
  const dgeo = new BufferGeometry(); dgeo.setAttribute("position", new BufferAttribute(dp, 3)); dgeo.setAttribute("aLand", new BufferAttribute(dl, 1));
  const dotMat = new ShaderMaterial({ vertexShader: DOT_V, fragmentShader: DOT_F, transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uPx: { value: 7 }, uA: { value: 1 }, uWhite: { value: C("#ffffff") }, uInkC: { value: C(PAL.ink) } } });
  const dots = new Points(dgeo, dotMat); dots.renderOrder = 6; dots.frustumCulled = false;

  // the star glint: 14 px, on the face nearest the upper-left of the lens-side key
  let gi = 0, gd = -2; const key = new Vector3(-0.5, 0.8, 0.4).normalize();
  cen.forEach((c, i) => { const d = c.clone().normalize().dot(key); if (d > gd) { gd = d; gi = i; } });
  const sgeo = new BufferGeometry(); sgeo.setAttribute("position", new BufferAttribute(new Float32Array(cen[gi].clone().multiplyScalar(1.03).toArray()), 3));
  const starMat = new ShaderMaterial({ vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true, depthWrite: false, uniforms: { uPx: { value: 14 }, uA: { value: 0 } } });
  const star = new Points(sgeo, starMat); star.renderOrder = 7; star.frustumCulled = false;

  const hull = new Group(); hull.add(inkHull, faces, wire, dots, star);
  const group = new Group(); group.add(hull);
  return {
    group,
    update(ts) {
      const R = S.hullR(ts);
      hull.visible = R > 0.001;
      hull.position.copy(F.H); hull.scale.setScalar(Math.max(1e-3, R)); hull.rotation.y = S.hullAng(ts);
      const p = sstep(T.close0, T.close1, ts) * 1.04 * (ts >= T.close0 ? 1 : 0);
      faceMat.uniforms.uProg.value = p; inkMat.uniforms.uProg.value = p;
      const wireA = 0.5 * sstep(T.born, T.born + 0.58, ts) * (1 - sstep(T.close0, T.close1, ts));
      wire.material.opacity = wireA; wire.visible = wireA > 0.002;
      dotMat.uniforms.uT.value = ts; dotMat.uniforms.uA.value = 1 - sstep(T.close0, T.close1, ts); dots.visible = ts >= T.snap;
      dotMat.uniforms.uPx.value = 7 * S.resH.value / 720;
      // glint: rises as the faces close, then twinkles on twos
      const tw = 0.6 + 0.4 * Math.sin(ts * 9);
      starMat.uniforms.uA.value = p > 0.35 ? tw : 0; starMat.uniforms.uPx.value = 14 * S.resH.value / 720 * (0.8 + 0.2 * tw);
    },
    dispose() { for (const o of [geo, ico, dgeo, sgeo, wire.geometry, faceMat, inkMat, dotMat, starMat, wire.material]) o.dispose(); },
  };
}
