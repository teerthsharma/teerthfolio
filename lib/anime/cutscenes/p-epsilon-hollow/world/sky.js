// THE SKY (bible 3.1 + 3.2): the painted dome (baked, layer 0) and the EYE (live, layer 1).
//
// Both are placed by ONE direction, hole0 = the eye's centre, computed from the wide shot (12 deg above its line of sight), and
// both are camera-centred (the sky is at infinity: the vertex shader adds cameraPosition, so a camera 560 m out still sees it).
// The eye's local frame: e1 = normalize(hole x up) (screen right), e2 = e1 x hole (up). p = (d.e1, d.e2) * uEyeS is the eye
// plane in "eye units": almond 1.75 wide x 0.78 tall, iris r 0.24..0.70, pupil r 0.22, photon ring r 0.235. uEyeS is chosen so
// the iris disc is 38% of the wide's frame height: iris diameter 1.4 units = 0.38 * 2 tan(fov/2)  =>  uEyeS = 1.4 / (0.76 tan(fov/2)).
import { BufferGeometry, Float32BufferAttribute, Matrix3, Mesh, ShaderMaterial, Vector3 } from "three";
import { U } from "./palette.js";
import { NOISE2, NOISE3, SLASH } from "./glsl.js";

// ---------------------------------------------------------------------------------------------------------------------
// DOME: void, indigo nebula, teal at 15%, cold stars, the crimson band with torn black wisps (ref 01), the eye's drain.
//   sky(az, el): d = (sin az cos el, sin el, -cos az cos el)   (az = atan(d.x, -d.z): az 0 looks down -z)
//   base      mix(indigo*0.8, void, smoothstep(-0.25, 0.8, el))             indigo at the horizon, void overhead
//   nebula    + indigo*1.6*smoothstep(0.42, 0.8, f3(2.2 d))                 violet clouds; teal mixed in at 15% where f3(4.6 d) is high
//   band      centre elevation bc(az) = -0.03 + 0.10 sin(az + 0.8) + 0.035 sin(2 az - 1)   (integer harmonics: no seam at az = +-pi)
//             half height 0.105 rad (the 12 deg band); crimson at 40% over the void, modulated by the nebula
//   wisps     4 gaussian az windows exp(-dz^2 / 0.245), fbm stretched in elevation, threshold smoothstep(0.45, 0.85, w);
//             the lower edge is torn: lowEdge = bc - 0.03 + 0.04 (f3(13 d)/0.875 - 0.5); core #1a0c0c, rim #ff6a1f -> gold toward the eye
//   drain     the void is darkened around the eye outside the almond: col *= 1 - 0.8 smoothstep(2.4, 0.8, r) (1 - inLid)
const SKY_BODY = /* glsl */ `
  ${NOISE3}
  uniform vec3 uHole, uE1, uE2; uniform float uEyeS;
  uniform vec3 cVoid, cIndigo, cTeal, cCrim, cWispCore, cEmber, cGold;
  vec3 dirOf(float az, float el) { return vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el)); }
  vec3 sky(float az, float el) {
    vec3 d = dirOf(az, el);
    vec3 col = mix(cIndigo * 0.8, cVoid, smoothstep(-0.25, 0.8, el));
    float neb = f3(d * 2.2 + 1.3), neb2 = f3(d * 4.6 - 4.0);
    col += cIndigo * 1.6 * smoothstep(0.42, 0.8, neb);
    col = mix(col, cTeal * 0.35, 0.15 * smoothstep(0.5, 0.78, neb2));
    // cold stars: a hashed cell grid on the direction, one point per lucky cell
    vec2 sc2 = vec2(d.x + 0.37 * d.z, d.y + 0.61 * d.z) * 420.0;
    float star = step(0.9975, h3(vec3(floor(sc2), 3.0))) * smoothstep(0.35, 0.0, length(fract(sc2) - 0.5));
    col += vec3(0.8, 0.85, 0.95) * star * 0.8;
    // the crimson band
    float bc = -0.03 + 0.10 * sin(az + 0.8) + 0.035 * sin(2.0 * az - 1.0);
    float bandM = smoothstep(0.105, 0.0, abs(el - bc));
    col = mix(col, cCrim, 0.4 * bandM * (0.55 + 0.9 * neb));
    // the wisps
    float wm = 0.0;
    for (int k = 0; k < 4; k++) {
      float c = 0.5 + float(k) * 1.5708;
      float dz = abs(mod(az - c + 3.14159265, 6.2831853) - 3.14159265);
      wm = max(wm, exp(-dz * dz / 0.245));
    }
    float wf = f3(vec3(d.x * 4.0, d.y * 10.0, d.z * 4.0) + 7.0) / 0.875;
    float lowEdge = bc - 0.03 + 0.04 * (f3(d * 13.0 + 3.0) / 0.875 - 0.5);
    float vis = wm * smoothstep(0.0, 0.01, el - lowEdge) * smoothstep(bc + 0.13, bc + 0.04, el);
    float wisp = smoothstep(0.45, 0.85, wf) * vis;
    float rim = smoothstep(0.45, 0.5, wf) * (1.0 - smoothstep(0.5, 0.58, wf)) * vis;
    col = mix(col, cWispCore, wisp * 0.92);
    col += mix(cEmber, cGold, 0.5 + 0.5 * dot(d, uHole)) * rim * 0.9;
    // the eye's drain
    float fr = dot(d, uHole);
    vec2 p = vec2(dot(d, uE1), dot(d, uE2)) * uEyeS;
    float r = fr < 0.0 ? 9.0 : length(p);
    float ax = p.x / 1.75;
    float lid = 0.78 * max(1.0 - ax * ax, 0.0);
    float inLid = step(abs(ax), 1.0) * step(abs(p.y), lid);
    col *= 1.0 - 0.8 * smoothstep(2.4, 0.8, r) * (1.0 - inLid);
    return col;
  }`;

// the patch that makes the baked dome camera-centred, rotatable (the 0.5 deg/s drift) and openable by the slash
const DOME_VERT = /* glsl */ `
  uniform mat3 uRot; varying vec3 vD;
  void main() {
    vD = position;
    vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + uRot * position, 1.0);
    gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
  }`;

// ---------------------------------------------------------------------------------------------------------------------
// THE EYE (live). Opaque inside the almond; outside it the dome shows. Id 0.55 > 0.5 so the layer-1 composite accepts it.
//   sclera   fbm swirl posterised to 4 bands, #0f0517 -> #8c5229 toward the iris
//   iris     r in [0.24, 0.72]; ir = (r - 0.24)/0.46; fibres fbm(cos/sin(th - 0.3 t)*7 + ir*3) rigid-turn at 0.3 rad/s (on twos);
//            value v = 0.45 + 0.75 fib (0.6 + 0.4 sin(46 th + 9 ir + 6 fib)), posterised to 5 bands; Doppler 0.75..1.2 brighter left
//            colour ramp inner #ffdc7a -> mid #f28d2e -> rim #6b24ad
//   tomoe    egg 1: uPin 0..1 fades the fibres to #d0161f and three black tomoe on r = 0.47 (head r 0.065, tail an arc that
//            tapers 0.9 rad behind the head: d = min(|p - head| - 0.065, | |p| - 0.47 | - 0.065 (1 - da/0.9)))
//   strands  3 log-spirals s = fract((th + 2.4 ln r - 0.45 t)/2pi + i/3) (memory #05d9f2, files #ffc74d, scheduler #f25aad)
//   pupil    r < 0.222 pure black; photon ring |r - 0.235| < 0.022, #fff2d1 at 2.0 + 1.5 swell (blooms); limbal ring #14031f at r 0.71
//   swell    uSwell 0..1 over 0..3 s lifts the iris to 1 + 0.8 swell (the bloom swell)
const EYE_FRAG = /* glsl */ `
  ${NOISE2}
  ${SLASH}
  uniform vec3 uHole, uE1, uE2; uniform float uEyeS, uTime, uSwell, uPin, uId;
  uniform vec3 cIrisIn, cIrisMid, cIrisRim, cSclIn, cSclOut, cLid, cLimb, cMem, cFil, cSch, cPhoton, cRed;
  varying vec3 vD;
  float tomoe(vec2 p, float a0) {
    float R = 0.47;
    vec2 hc = R * vec2(cos(a0), sin(a0));
    float head = length(p - hc) - 0.065;
    float da = mod(a0 - atan(p.y, p.x), 6.2831853);
    float tail = da < 0.9 ? abs(length(p) - R) - 0.065 * (1.0 - da / 0.9) : 1.0;
    return min(head, tail);
  }
  void main() {
    vec3 ec; float ed;
    if (slashCut(ec, ed) > 0.5) discard;
    vec3 d = normalize(vD);
    if (dot(d, uHole) < 0.2) discard;
    vec2 p = vec2(dot(d, uE1), dot(d, uE2)) * uEyeS;
    float r = length(p);
    float th = atan(p.y, p.x);
    float lr = log(max(r, 1e-3));
    float ax = p.x / 1.75;
    float lid = 0.78 * max(1.0 - ax * ax, 0.0);
    if (abs(ax) > 1.0 || abs(p.y) > lid + 0.035) discard;               // outside the almond and its lid line: the dome shows
    // sclera: the accretion disc's far light, lensed into a bowl; posterised swirl
    vec2 cs = vec2(cos(th), sin(th));
    float sw = floor(fbm2(cs * 3.0 + vec2(lr * 2.2 - uTime * 0.3, lr * 4.0)) * 4.0 + 0.5) / 4.0;
    vec3 col = mix(cSclIn, cSclOut, smoothstep(1.2, 0.72, r)) * (0.3 + 0.9 * sw * sw);
    // iris
    float thf = th - 0.3 * uTime;                                          // rigid turn, 0.3 rad/s
    vec2 cf = vec2(cos(thf), sin(thf));
    float ir = clamp((r - 0.24) / 0.46, 0.0, 1.0);
    float fib = fbm2(cf * 7.0 + vec2(ir * 3.0, 0.0));
    float fib2 = 0.5 + 0.5 * sin(thf * 46.0 + ir * 9.0 + fib * 6.0);
    float v = floor((0.45 + 0.75 * fib * (0.6 + 0.4 * fib2)) * 5.0 + 0.5) / 5.0;   // 5 value bands
    vec3 iris = mix(cIrisIn, cIrisMid, smoothstep(0.0, 0.35, ir));
    iris = mix(iris, cIrisRim, smoothstep(0.35, 0.95, ir));
    float doppler = 0.75 + 0.45 * smoothstep(0.5, -0.5, p.x / max(r, 1e-3));
    vec3 irisCol = iris * v * doppler;
    vec3 shar = cRed * (0.55 + 0.45 * ir) * doppler;
    irisCol = mix(irisCol, shar, uPin);
    float tm = 0.0;
    for (int k = 0; k < 3; k++) {
      float dd = tomoe(p, float(k) * 2.0943951 + 0.35 * uTime);
      float w = fwidth(dd) * 0.8 + 1e-5;
      tm = max(tm, 1.0 - smoothstep(-w, w, dd));
    }
    irisCol = mix(irisCol, vec3(0.02, 0.0, 0.03), uPin * tm * step(r, 0.7));
    irisCol *= 1.0 + 0.8 * uSwell;
    float irisMask = smoothstep(0.73, 0.69, r) * smoothstep(0.22, 0.25, r);
    col = mix(col, irisCol, irisMask);
    col = mix(col, cLimb, smoothstep(0.03, 0.0, abs(r - 0.71)));            // the limbal ring
    // the strands (matter spiralling into the pupil)
    vec3 sc[3]; sc[0] = cMem; sc[1] = cFil; sc[2] = cSch;
    for (int i = 0; i < 3; i++) {
      float s = fract((th + 2.4 * lr - 0.45 * uTime) / 6.2831853 + float(i) / 3.0);
      float k = smoothstep(0.012, 0.0, abs(s - 0.5) - 0.002) * smoothstep(1.5, 0.75, r) * smoothstep(0.2, 0.3, r);
      col = mix(col, sc[i] * 1.2, k * 0.75);
    }
    // the pupil (event horizon) and the photon ring
    col = mix(col, vec3(0.0), smoothstep(0.225, 0.215, r));
    col = mix(col, cPhoton * (2.0 + 1.5 * uSwell), smoothstep(0.022, 0.0, abs(r - 0.235)));
    // the lid line, tapered at the corners
    float lw = 0.03 * (1.0 - 0.75 * abs(ax));
    col = mix(col, cLid * 1.1, step(abs(abs(p.y) - lid), lw));
    col = mix(col, ec, ed);
    gl_FragColor = vec4(col, uId);
  }`;

const AXIS_Y = new Vector3(0, 1, 0);
export function eyeFrame(hole) {
  const up = AXIS_Y;
  const e1 = hole.clone().cross(up);
  if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
  e1.normalize();
  const e2 = e1.clone().cross(hole).normalize();
  return { e1, e2 };
}

export function buildSky(ctx, { hole0, e1, e2, eyeS, S }) {
  const rot = { value: new Matrix3() };
  const eyeU = {
    uHole: { value: hole0.clone() }, uE1: { value: e1.clone() }, uE2: { value: e2.clone() }, uEyeS: { value: eyeS },
  };
  // ---- the dome (layer 0): baked once over the whole azimuth circle ----
  const dome = ctx.bake.sky(SKY_BODY, {
    az: [-Math.PI, Math.PI], el: [-0.9, 1.25], pxPerRad: 560,
    uniforms: {
      ...eyeU,
      cVoid: U("void"), cIndigo: U("indigo"), cTeal: U("teal"), cCrim: U("crimson"), cWispCore: U("wispCore"), cEmber: U("ember"), cGold: U("gold"),
    },
  });
  const m = dome.material;
  Object.assign(m.uniforms, { uRot: rot, uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB });
  m.vertexShader = DOME_VERT;
  let f = SLASH + m.fragmentShader;
  f = f.replace("void main() {", "void main() { vec3 ec; float ed; if (slashCut(ec, ed) > 0.5) discard;");
  f = f.replace("gl_FragColor = vec4(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, 0.0);", "gl_FragColor = vec4(mix(texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, ec, ed), 0.0);");
  m.fragmentShader = f;
  m.needsUpdate = true;
  dome.userData.layer = 0;

  // ---- the eye (layer 1): a plane tangent to the sky sphere at hole0, camera-centred, drawn at the far plane ----
  const halfAng = Math.min(1.3, 2.5 / eyeS + 0.1), h = Math.tan(halfAng), D = 300;
  const corner = (x, y) => hole0.clone().addScaledVector(e1, x * h).addScaledVector(e2, y * h).multiplyScalar(D);
  const P = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(P.flatMap((v) => [v.x, v.y, v.z]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const eyeMat = new ShaderMaterial({
    depthWrite: true, depthTest: true,
    uniforms: {
      ...eyeU, uRot: rot, uTime: { value: 0 }, uSwell: { value: 0 }, uPin: { value: 0 }, uId: { value: 0.55 },
      uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB,
      cIrisIn: U("irisIn"), cIrisMid: U("irisMid"), cIrisRim: U("violetRim"), cSclIn: U("sclIn"), cSclOut: U("sclOut"), cLid: U("lid"),
      cLimb: U("limb"), cMem: U("memory"), cFil: U("files"), cSch: U("sched"), cPhoton: U("photon"), cRed: U("sharingan"),
    },
    vertexShader: DOME_VERT,
    fragmentShader: EYE_FRAG,
  });
  const eye = new Mesh(geo, eyeMat);
  eye.frustumCulled = false;
  eye.renderOrder = -9;
  eye.userData.layer = 1;

  return {
    dome, eye,
    // th: sky drift angle (rad); the dome and the eye rotate together about +y; returns the world-space hole direction
    update(ts, th, swell, pin) {
      const c = Math.cos(th), s = Math.sin(th);
      rot.value.set(c, 0, s, 0, 1, 0, -s, 0, c); // R_y(th): x' = x c + z s, z' = -x s + z c
      eyeMat.uniforms.uTime.value = ts;
      eyeMat.uniforms.uSwell.value = swell;
      eyeMat.uniforms.uPin.value = pin;
      return hole0.clone().applyAxisAngle(AXIS_Y, th);
    },
    dispose() { dome.userData.target?.dispose?.(); dome.geometry.dispose(); dome.material.dispose(); geo.dispose(); eyeMat.dispose(); },
  };
}
