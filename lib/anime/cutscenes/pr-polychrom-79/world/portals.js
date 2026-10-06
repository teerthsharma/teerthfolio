// pr-polychrom-79 / world: THE GATE OF BABYLON portal field. 90 instanced swirl-disc portals over the whole sky dome in
// 3 depth layers (the three arcs). One draw call, one program. Animated, so the group is layer 1.
//
// Layout (deterministic, ctx.rng): radius R = 42 / 72 / 115 m. 80 portals in the -z hemisphere (the way the shots look),
// 10 behind. az ~ centre -0.35 with a triangular spread, heavier up and to the left; el 0.10 .. 1.35 rad.
//   position   P = R (sin az cos el, sin el, -cos az cos el)
//   width      f = 6% .. 14% of the frame width. Frame width at distance R for a 58 deg lens at 16:9 is ~1.97 R,
//              so radius r = 0.985 f R, scaled (1 + 0.25 sin az): the nearer, right-hand ones are larger
//   facing     lookAt a point over the plateau (0, 1.5, 3), then a 20..60 deg tilt (0.35..1.05 rad) about the disc's own axis
//   open order arc a = depth layer; inside an arc, by |az + 0.35| (the centre outward); delay = arcStart[a] + rank * 0.08 s
//
// Shader (per fragment, v in portal radii, plane = +-1.5; r = |v| / grow):
//   open  = clamp((uClock - delay) / 0.45, 0, 1);  grow = (1 - (1 - open)^3)(1 + 0.14 sin(pi open))   -- an overshooting iris
//   swirl: angle' = ang + (1 - min(r,1)) * 3.4 + 0.7 uT + 2pi seed  (the liquid spirals in), n = vnoise(dir(angle') (0.6 + 2.4 r))
//   ripple: ph = fract(4 r - 2 uT)  (4 rings across the radius, 2 rings/s outward; uT is the STEPPED clock so it plays on twos)
//   body (r < 1): core #fff2c0 (r < .22), mid #ffe27a (.55), ripple #ffb020 (.9), rim #c98a12; brightness .62 + .5 n + .5 ring crest
//   refract rings: a hairline at r = .97 and expanding rings beyond the rim, split per channel by +-1.5% radius (chromatic)
//   outer glow: #ff8a1a exp(-(r - 1) 5) 0.6;   opening flash: #fff2c0 for the first 30% of open
//   result is ADDITIVE (alpha channel preserved: it carries the set id), capped at 1.35 so it blooms but never blows white
import { Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from "three";

// additive blend that leaves the destination alpha (the set id) alone: rgb = src + dst
export const additive = (m) => Object.assign(m, { transparent: true, depthWrite: false, blending: 5, blendEquation: 100, blendSrc: 201, blendDst: 201, blendSrcAlpha: 200, blendDstAlpha: 201 });

export const hex = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

const VERT = /* glsl */ `
  attribute float aDelay; attribute float aSeed;
  varying vec2 vV; varying float vDelay; varying float vSeed;
  void main() {
    vV = position.xy; vDelay = aDelay; vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform float uClock; uniform float uT; uniform float uGain;
  varying vec2 vV; varying float vDelay; varying float vSeed;
  float hh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
  float crest(float r, float t) { float ph = fract(r * 4.0 - t * 2.0); return smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.1, 0.42, ph)); }
  void main() {
    float open = clamp((uClock - vDelay) / 0.45, 0.0, 1.0);
    if (open <= 0.0) discard;
    float grow = (1.0 - pow(1.0 - open, 3.0)) * (1.0 + 0.14 * sin(open * 3.14159));
    float r = length(vV) / max(grow, 1e-3);
    if (r > 1.5) discard;
    float ang = atan(vV.y, vV.x);
    float sw = ang + (1.0 - min(r, 1.0)) * 3.4 + uT * 0.7 + vSeed * 6.2832;
    vec2 sp = vec2(cos(sw), sin(sw)) * (0.6 + r * 2.4);
    float n = vnz(sp * 1.7 + vSeed * 17.0) * 0.6 + vnz(sp * 3.9) * 0.4;
    float cr = crest(r, uT);
    // disc body: colour by radius (hard-ish bands, the cel read), brightness from the swirl and the ripple crest
    vec3 body = ${hex("#c98a12")};
    body = mix(body, ${hex("#ffb020")}, smoothstep(0.92, 0.84, r));
    body = mix(body, ${hex("#ffe27a")}, smoothstep(0.6, 0.5, r));
    body = mix(body, ${hex("#fff2c0")}, smoothstep(0.26, 0.18, r));
    body *= 0.62 + 0.5 * n + 0.5 * cr;
    vec3 col = body * step(r, 1.0);
    // refracted light rings: hairline at the rim, rings that run out past it, split per channel
    vec3 ring;
    ring.r = smoothstep(0.035, 0.0, abs(r * 1.015 - 0.97));
    ring.g = smoothstep(0.035, 0.0, abs(r - 0.97));
    ring.b = smoothstep(0.035, 0.0, abs(r * 0.985 - 0.97));
    col += ring * ${hex("#ffe27a")} * 1.1;
    col += ${hex("#ffb020")} * cr * smoothstep(1.5, 1.0, r) * step(1.0, r) * 0.45;
    col += ${hex("#ff8a1a")} * exp(-max(r - 1.0, 0.0) * 5.0) * step(1.0, r) * 0.6;
    col += ${hex("#fff2c0")} * smoothstep(0.3, 0.0, open) * exp(-r * r * 2.0) * 1.2;   // the opening flash
    col *= uGain;
    gl_FragColor = vec4(min(col, vec3(1.35)), 1.0);
  }`;

export function buildPortals(ctx) {
  const R3 = ctx.rng("portals");
  const N = 90, layers = [42, 72, 115], arcStart = [0, 0.7, 1.4];
  const geo = new PlaneGeometry(3, 3);
  const aDelay = new Float32Array(N), aSeed = new Float32Array(N);
  const mat = additive(new ShaderMaterial({
    side: DoubleSide, vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uClock: { value: -1 }, uT: { value: 0 }, uGain: { value: 1 } },
  }));
  const mesh = new InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.layer = 1;
  const aim = new Vector3(0, 1.5, 3), dummy = new Object3D(), data = [];
  const spot = (R, az, el) => new Vector3(R * Math.sin(az) * Math.cos(el), R * Math.sin(el), -R * Math.cos(az) * Math.cos(el));
  for (let i = 0; i < N; i++) {
    const layer = i % 3, R = layers[layer], front = i < 80;
    let az, el, r;
    if (i === 0) { az = -0.12; el = 0.5; r = 0.985 * 0.1 * R; } // the first portal: front and centre (shot 2's first ripple)
    else {
      az = front ? -0.35 + (R3() + R3() + R3() - 1.5) * 1.1 : Math.PI + (R3() - 0.5) * 2.2;
      el = 0.10 + 1.25 * Math.pow(R3(), front ? 0.85 : 1.0);
      r = 0.985 * (0.06 + 0.08 * R3()) * R * (1 + 0.25 * Math.sin(az));
    }
    const P = spot(R, az, el);
    dummy.position.copy(P); dummy.lookAt(aim);
    dummy.rotateY((0.35 + 0.7 * R3()) * (R3() < 0.5 ? -1 : 1)); // 20..60 deg tilt off facing
    dummy.rotateZ(R3() * 6.28);
    dummy.scale.setScalar(r);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    aSeed[i] = R3();
    data.push({ pos: P, normal: new Vector3(0, 0, 1).applyQuaternion(dummy.quaternion), r, layer, az, el, key: Math.abs(az + 0.35) });
  }
  // open order: per arc, the centre outward, 0.08 s apart; the first portal opens 0.9 s before the arcs
  aDelay[0] = -0.9;
  for (let a = 0; a < 3; a++) {
    const ids = data.map((_, i) => i).filter((i) => i % 3 === a && i !== 0).sort((p, q) => data[p].key - data[q].key);
    ids.forEach((id, rank) => { aDelay[id] = arcStart[a] + rank * 0.08; });
  }
  data.forEach((d, i) => { d.delay = aDelay[i]; });
  geo.setAttribute("aDelay", new InstancedBufferAttribute(aDelay, 1));
  geo.setAttribute("aSeed", new InstancedBufferAttribute(aSeed, 1));
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, data, uniforms: mat.uniforms, dispose() { geo.dispose(); mat.dispose(); } };
}
