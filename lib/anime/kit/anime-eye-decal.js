// ANIME EYE DECAL (shared kit, canonical name from scripts/INDEX.md: `anime-eye-decal`).
// A crisp, analytic anime eye painted on a quad that sits on the head surface: sclera, iris with a
// two-stop gradient and a limbus ring, a pupil (round, slit, ring, tomoe, none), two highlights, an upper lash
// with an outer wing, a thin lower lash, a lid shadow. Everything is one fragment shader, anti-aliased by fwidth,
// so it stays sharp at any distance and costs one quad per eye.
//
//   eyeMaterial(o)                    -> ShaderMaterial (uniforms are the live parameters, see PARAMS)
//   eyeDecal(o)                       -> Mesh: one eye, a plane of o.size = [w, h] metres, unit frame x,y in [-1,1]
//   eyePair(head, o)                  -> Group { left, right, set(expression, k), look(x, y) }: two eyes laid on the
//                                        head ellipsoid { c:[x,y,z], r:[rx,ry,rz] } at +-o.gap, o.y, facing out
//   faceOnHead(head, x, y, lift)      -> { p: Vector3, n: Vector3 }: the point on the head toward (x, y) and its normal
//   EXPRESSIONS                       neutral, calm (half-lidded), terror, rage, sad, smug, petrified, shut, awe
//   EYE_STYLES                        round (kawaii), tsurime (sharp), tareme (droopy), slit, ring, tomoe, blank
//
// The eye unit frame: p in [-1, 1]^2, +x toward the OUTER corner of this eye (mirrored for the left eye by uSide).
//   upper lid   yU(x) = open * hu * (1 - x^2)^0.6 + slant * x * 0.25,  lowered by lid: yU' = mix(yU, 0, lid)
//   lower lid   yL(x) = -open * hl * (1 - x^2)^0.8
//   inside      yL < p.y < yU' and |p.x| < 1  (the lash band extends the upper edge by lw (1 - 0.6|x|) + a wing at the outer corner)
//   iris        ellipse centred c = look * (0.28, 0.22), radius (0.52, 0.72) * irisScale; d = |(p - c) / rad|
//               colour = mix(irisLow, irisHigh, smoothstep(-1, 1, (p.y - c.y) / rad.y)) darkened toward the limbus
//               ring by smoothstep(0.78, 1, d); the upper lid casts a soft shadow: x0.78 within 0.3 of yU'
//   pupil       round |(p - c)/(rad pupilScale)| < 1; slit |x'| < 0.17 pupilScale, |y'| < 1; ring: a thin annulus
//               (Rinnegan); tomoe: three commas at 120 degrees (Sharingan); blank: none (petrified)
//   highlights  a big one at c + rad (-0.30, 0.34) of radius 0.24 rad, a small one at c + rad (0.34, -0.36) of 0.10 rad
// Colour discipline (owner law L8): the sclera is capped at luma 0.9 and nothing here exceeds 1.0, so a decal
// can never cross the bloom threshold; `uPetrify` mixes the whole eye to stone grey.
import { Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

export const EYE_STYLES = {
  round: { hu: 0.78, hl: 0.55, slant: 0, irisScale: 1.0, pupil: 0, pupilScale: 0.5, lash: 0.11, wing: 0.0 },
  tsurime: { hu: 0.66, hl: 0.42, slant: 0.5, irisScale: 0.92, pupil: 0, pupilScale: 0.46, lash: 0.15, wing: 0.35 },
  tareme: { hu: 0.74, hl: 0.58, slant: -0.45, irisScale: 1.0, pupil: 0, pupilScale: 0.52, lash: 0.1, wing: 0.0 },
  slit: { hu: 0.62, hl: 0.4, slant: 0.35, irisScale: 1.0, pupil: 1, pupilScale: 0.9, lash: 0.14, wing: 0.25 },
  ring: { hu: 0.7, hl: 0.5, slant: 0.1, irisScale: 1.05, pupil: 2, pupilScale: 0.35, lash: 0.1, wing: 0.1 },
  tomoe: { hu: 0.68, hl: 0.46, slant: 0.3, irisScale: 1.0, pupil: 3, pupilScale: 0.3, lash: 0.13, wing: 0.3 },
  blank: { hu: 0.7, hl: 0.5, slant: 0, irisScale: 1.0, pupil: 4, pupilScale: 0.5, lash: 0.11, wing: 0.0 },
};

// expression = deltas on the eye's live parameters; k blends from the neutral to the full expression
export const EXPRESSIONS = {
  neutral: { open: 1, lid: 0, pupil: 1, hl: 1, slant: 0, look: [0, 0], petrify: 0 },
  calm: { open: 0.85, lid: 0.32, pupil: 1, hl: 1, slant: 0.05, look: [0, -0.05], petrify: 0 },
  terror: { open: 1.18, lid: 0, pupil: 0.45, hl: 1, slant: 0, look: [0, 0.05], petrify: 0 }, // wide eyes, pin pupils
  rage: { open: 0.8, lid: 0.22, pupil: 0.8, hl: 0.4, slant: 0.7, look: [0, 0], petrify: 0 },
  sad: { open: 0.95, lid: 0.12, pupil: 1.15, hl: 1.3, slant: -0.6, look: [0, -0.15], petrify: 0 },
  smug: { open: 0.7, lid: 0.45, pupil: 1, hl: 0.8, slant: 0.3, look: [0.05, -0.05], petrify: 0 },
  petrified: { open: 1.0, lid: 0, pupil: 0.6, hl: 0, slant: 0, look: [0, 0], petrify: 1 },
  shut: { open: 0.05, lid: 1, pupil: 1, hl: 0, slant: 0, look: [0, 0], petrify: 0 },
  awe: { open: 1.2, lid: 0, pupil: 1.2, hl: 1.5, slant: -0.1, look: [0, 0.1], petrify: 0 },
};

const VERT = "varying vec2 vP; void main() { vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const FRAG = /* glsl */ `
  varying vec2 vP;
  uniform vec3 uSclera; uniform vec3 uIrisHi; uniform vec3 uIrisLo; uniform vec3 uLash; uniform vec3 uPupilCol; uniform vec3 uStone;
  uniform float uSide; uniform float uOpen; uniform float uLidAmt; uniform vec4 uShape; // hu, hl, slant, wing
  uniform vec2 uIrisS; uniform float uLashW; uniform vec2 uLook; uniform float uPupilKind; uniform float uPupilS; uniform float uHL; uniform float uPetrify;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float disc(vec2 p, vec2 c, vec2 r, float aa) { return 1.0 - smoothstep(-aa, aa, length((p - c) / r) - 1.0); }
  void main() {
    vec2 p = vec2(vP.x * uSide, vP.y);                    // +x is the outer corner for either eye
    float aa = fwidth(p.y) * 1.2 + 1e-4;
    float ax = clamp(abs(p.x), 0.0, 1.0);
    float k = max(1.0 - ax * ax, 0.0);
    float yU = uOpen * uShape.x * pow(k, 0.6) + uShape.z * p.x * 0.25;
    yU = mix(yU, 0.0, uLidAmt);
    float yL = -uOpen * uShape.y * pow(k, 0.8);
    // upper lash: the lid edge thickened, with a wing flicking up at the outer corner
    float lw = uLashW * (1.0 - 0.6 * ax) + uShape.w * smoothstep(0.55, 1.0, p.x) * 0.5;
    float wingY = yU + uShape.w * smoothstep(0.7, 1.0, p.x) * 0.35;
    float inside = smoothstep(-aa, aa, yU - p.y) * smoothstep(-aa, aa, p.y - yL) * step(abs(p.x), 1.0);
    float lash = smoothstep(-aa, aa, (wingY + lw) - p.y) * smoothstep(-aa, aa, p.y - (yU - 0.02)) * step(abs(p.x), 1.04) * step(0.0, 1.0 - ax + 0.05);
    float lower = (1.0 - smoothstep(0.0, aa * 1.5, abs(p.y - yL) - 0.02)) * step(abs(p.x), 0.95); // thin lower lash
    if (inside + lash + lower < 0.01) discard;
    // iris
    vec2 c = vec2(uLook.x * uSide, uLook.y) * vec2(0.28, 0.22);   // uLook.x is in screen terms; p is mirrored by uSide
    vec2 rad = vec2(0.52, 0.72) * uIrisS;
    float d = length((p - c) / rad);
    vec3 iris = mix(uIrisLo, uIrisHi, smoothstep(-1.0, 1.0, (p.y - c.y) / rad.y));
    iris *= 1.0 - 0.45 * smoothstep(0.78, 1.0, d);        // limbus ring
    float irisM = 1.0 - smoothstep(1.0 - aa / rad.y, 1.0 + aa / rad.y, d);
    vec3 col = mix(uSclera, iris, irisM);
    // pupil kinds: 0 round, 1 slit, 2 ring (Rinnegan), 3 tomoe (Sharingan), 4 none
    vec2 q = (p - c) / (rad * uPupilS);
    float pm = 0.0;
    if (uPupilKind < 0.5) pm = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, length(q));
    else if (uPupilKind < 1.5) pm = (1.0 - smoothstep(0.17 - aa, 0.17 + aa, abs(q.x) * (1.0 + 0.4 * q.y * q.y))) * step(abs(q.y), 1.0);
    else if (uPupilKind < 2.5) { float rr = length(q) * 1.6; pm = max(1.0 - smoothstep(0.0, aa * 2.0, abs(rr - 0.45) - 0.045), 1.0 - smoothstep(0.0, aa * 2.0, abs(rr - 0.9) - 0.04)); }
    else if (uPupilKind < 3.5) { float a = atan(q.y, q.x); pm = 1.0 - smoothstep(0.0, aa * 2.0, length(q) - 0.18); // centre dot
      for (int i = 0; i < 3; i++) { float ang = 6.28318 * float(i) / 3.0 + 1.0; vec2 cc = 2.6 * vec2(cos(ang), sin(ang)) * 0.32; pm = max(pm, disc(q * 2.6, cc, vec2(0.34), aa * 2.0)); } }
    col = mix(col, uPupilCol, pm * irisM);
    // lid shadow on the eye under the upper lid
    col *= 1.0 - 0.22 * smoothstep(0.32, 0.0, yU - p.y);
    // highlights: a big one upper-left and a small one lower-right, in the iris frame
    float hl = max(disc(p, c + rad * vec2(-0.30, 0.34), vec2(0.24) * rad.y, aa), disc(p, c + rad * vec2(0.34, -0.36), vec2(0.10) * rad.y, aa)) * irisM;
    col = mix(col, vec3(0.98), hl * uHL);
    // lashes over everything, then the lower line
    col = mix(col, uLash, max(lash, lower));
    // petrify: to stone grey, highlights gone
    float L = dot(col, LUMA);
    col = mix(col, uStone * (0.55 + 0.6 * L), uPetrify);
    // law: the sclera never exceeds luma 0.9; nothing exceeds 1
    float l2 = dot(col, LUMA); col *= min(1.0, 0.98 / max(l2, 1e-4));
    gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);   // alpha 1: a character pixel (hulled, set lines skip it)
  }`;

// o: { style, iris:"#hex", irisLo:"#hex", sclera, lash, pupilCol, side: 1 | -1, look:[x,y], expression }
export function eyeMaterial(o = {}) {
  const st = EYE_STYLES[o.style ?? "round"];
  const m = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: {
      uSclera: { value: new Color(o.sclera ?? "#f2efe6") },
      uIrisHi: { value: new Color(o.iris ?? "#5a3a2a") }, uIrisLo: { value: new Color(o.irisLo ?? o.iris ?? "#5a3a2a").multiplyScalar(o.irisLo ? 1 : 0.55) },
      uLash: { value: new Color(o.lash ?? "#1d1620") }, uPupilCol: { value: new Color(o.pupilCol ?? "#120c14") }, uStone: { value: new Color("#8a8a92") },
      uSide: { value: o.side ?? 1 }, uOpen: { value: 1 }, uLidAmt: { value: 0 }, uShape: { value: new Vector4(st.hu, st.hl, st.slant, st.wing) },
      uIrisS: { value: new Vector2(st.irisScale, st.irisScale) }, uLashW: { value: st.lash }, uLook: { value: new Vector2(...(o.look ?? [0, 0])) },
      uPupilKind: { value: st.pupil }, uPupilS: { value: st.pupilScale }, uHL: { value: 1 }, uPetrify: { value: 0 },
    },
  });
  m.userData.style = st;
  return m;
}

// apply an expression at strength k (0 neutral .. 1 full) to ONE eye material
export function setEyeExpression(mat, name, k = 1, o = {}) {
  const e = EXPRESSIONS[name] ?? EXPRESSIONS.neutral, n = EXPRESSIONS.neutral, u = mat.uniforms, st = mat.userData.style;
  const L = (a, b) => a + (b - a) * k;
  u.uOpen.value = L(n.open, e.open);
  u.uLidAmt.value = L(n.lid, e.lid);
  u.uPupilS.value = st.pupilScale * L(n.pupil, e.pupil);
  u.uHL.value = L(n.hl, e.hl);
  u.uShape.value.z = st.slant + L(n.slant, e.slant);
  u.uPetrify.value = L(n.petrify, e.petrify);
  u.uLook.value.set(L(n.look[0], e.look[0]) + (o.look?.[0] ?? 0), L(n.look[1], e.look[1]) + (o.look?.[1] ?? 0));
}

export function faceOnHead(head, x, y, lift = 0) {
  const [cx, cy, cz] = head.c, [rx, ry, rz] = head.r;
  const u = (x - cx) / rx, v = (y - cy) / ry;
  const z = cz + rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));
  const n = new Vector3((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)).normalize();
  return { p: new Vector3(x, y, z).addScaledVector(n, lift), n };
}

// one eye as a mesh (size [w, h] m; the quad covers the unit frame)
export function eyeDecal(o = {}) {
  const size = o.size ?? [0.085, 0.1];
  const m = new Mesh(new PlaneGeometry(size[0], size[1]), eyeMaterial(o));
  m.userData.eye = true;
  m.renderOrder = 2;
  return m;
}

// two eyes on a head ellipsoid. head = { c, r } (the pup's HEAD2 = { c:[0,0.555,0.03], r:[0.27,0.245,0.255] }).
// o: { gap (x of each eye, default 0.122), y (default 0.572), size, style, iris, ..., lift }
export function eyePair(head, o = {}) {
  const g = new Group(), gap = o.gap ?? 0.122, y = o.y ?? 0.572, lift = o.lift ?? 0.004;
  const eyes = [];
  for (const side of [1, -1]) { // the outer corner of each eye points away from the nose line
    const e = eyeDecal({ ...o, side });
    const f = faceOnHead(head, side * gap, y, lift);
    e.position.copy(f.p);
    e.lookAt(f.p.clone().add(f.n));
    g.add(e); eyes.push(e);
  }
  g.userData.eyes = eyes;
  g.userData.set = (name, k = 1, oo = {}) => { for (const e of eyes) setEyeExpression(e.material, name, k, oo); };
  g.userData.look = (x, yy) => { for (const e of eyes) e.material.uniforms.uLook.value.set(x, yy); };
  g.userData.dispose = () => { for (const e of eyes) { e.geometry.dispose(); e.material.dispose(); } };
  return g;
}
