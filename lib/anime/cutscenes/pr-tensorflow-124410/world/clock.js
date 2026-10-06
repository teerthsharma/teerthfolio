// THE GIANT CLOCK (layer 1): an 18 m face in the sky on the bullseye centre, 7 m minute hand. It appears on ZA WARUDO with a hard
// cut and stays until the poster tear. The only element allowed to bloom: its face is painted at 1.35x (luma over 1).
//   discard outside the face disc (r <= R) and its magenta drop-shadow disc (offset (0.55, -0.55) m)
//   rings:   r/R < 0.82 citrus face #ffe14a, 0.82..0.9 an orange band #ff9a2a, 0.9..1 the ink rim (3 px look: 0.1 R)
//   ticks:   angle a clockwise from 12 (atan(x, y)); k = a / 2pi * 60; arc distance to the nearest tick
//            dm = |fract(k + .5) - .5| / 60 * 2pi r; minute ticks half-width 0.06 m (r 0.72..0.82 R), hour ticks every 5:
//            0.16 m (r 0.62..0.82 R), and the 12 o'clock tick 0.24 m
//   hands:   tapered capsules, signed distance d = |p - dir t| - w(t), t = clamp(dot(p, dir), -tail, len): the minute hand
//            7 m (w 0.22 -> 0.10, tail 1.4), the hour hand 4.6 m (w 0.32 -> 0.18), the second hand 7.6 m coral and thin
//   the minute hand stands ONE TICK (6 degrees) before twelve from the moment the clock appears; it drops onto twelve on
//   `handDrop` with a small overshoot; the second hand ticks on every 0.25 s while time is stopped
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { L } from "./layout.js";

const V = /* glsl */ `varying vec2 vP; uniform float uR; void main() { vP = position.xy * uR * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const F = /* glsl */ `
  varying vec2 vP; uniform float uR; uniform float uMin; uniform float uHour; uniform float uSec;
  const vec3 INK = vec3(0.0015, 0.0006, 0.003);
  float cap(vec2 p, float a, float len, float w0, float w1, float tail) {
    vec2 dir = vec2(sin(a), cos(a));
    float t = clamp(dot(p, dir), -tail, len);
    return length(p - dir * t) - mix(w0, w1, clamp(t / len, 0.0, 1.0));
  }
  void main() {
    float r = length(vP), aa = fwidth(r) * 1.1 + 1e-4;
    float dMain = r - uR, dSh = length(vP - vec2(0.55, -0.55)) - uR;
    if (dMain > aa && dSh > aa) discard;
    float inMain = 1.0 - smoothstep(-aa, aa, dMain);
    float u = r / uR;
    vec3 col = vec3(0.82, 0.023, 0.33);                       // the magenta drop shadow #d02a9a
    vec3 face = vec3(1.0, 0.753, 0.07) * 1.35;                // citrus #ffe14a, painted hot: the clock blooms
    face = mix(face, vec3(1.0, 0.33, 0.023), smoothstep(0.82 - aa / uR, 0.82 + aa / uR, u));   // the orange band #ff9a2a
    face = mix(face, INK, smoothstep(0.9 - aa / uR, 0.9 + aa / uR, u));                         // the ink rim
    // ticks
    float a = atan(vP.x, vP.y), k = a / 6.2831853 * 60.0;
    float fk = abs(fract(k + 0.5) - 0.5), dm = fk / 60.0 * 6.2831853 * r;
    float kk = floor(k + 0.5), five = step(abs(kk - 5.0 * floor(kk / 5.0 + 0.5)), 0.01);
    float twelve = step(abs(kk), 0.01) + step(abs(kk - 60.0), 0.01);
    float hw = mix(0.06, 0.16, five) + 0.08 * min(twelve, 1.0);
    float rin = mix(0.72, 0.62, five) * uR;
    float tick = (1.0 - smoothstep(hw, hw + aa, dm)) * step(rin, r) * step(r, 0.82 * uR);
    face = mix(face, INK, tick);
    // hands
    float dMin = cap(vP, uMin, 7.0, 0.22, 0.10, 1.4);
    float dHr = cap(vP, uHour, 4.6, 0.32, 0.18, 0.9);
    float dSc = cap(vP, uSec, 7.6, 0.06, 0.05, 1.8);
    face = mix(face, vec3(0.9, 0.11, 0.08), 1.0 - smoothstep(0.0, aa, dSc));
    face = mix(face, INK, 1.0 - smoothstep(0.0, aa, min(dMin, dHr)));
    face = mix(face, INK, 1.0 - smoothstep(0.5 - aa, 0.5, r));                                  // the centre cap
    face = mix(face, vec3(1.0, 0.753, 0.07), 1.0 - smoothstep(0.22 - aa, 0.22, r));
    gl_FragColor = vec4(mix(col, face, inMain), 0.5);
  }`;

export function buildClock() {
  const C = L.CLOCK;
  const mat = new ShaderMaterial({ uniforms: { uR: { value: C.r }, uMin: { value: 0 }, uHour: { value: 0 }, uSec: { value: 0 } }, vertexShader: V, fragmentShader: F, side: DoubleSide, depthWrite: true });
  const m = new Mesh(new PlaneGeometry(1.2, 1.2), mat); // position.xy * uR * 2 = 2.4 R across: room for the shadow
  m.position.set(C.x, C.y, C.z); m.frustumCulled = false; m.visible = false;
  const TICK = (Math.PI * 2) / 60;
  m.userData.set = (t, T, wt) => {
    const on = t >= T.clockOn && t < T.tear;
    m.visible = on;
    if (!on) return;
    // minute hand: one tick before twelve, then the drop onto twelve with an overshoot
    const k = Math.min(1, Math.max(0, (t - T.handDrop) / 0.18));
    const over = k >= 1 ? Math.max(0, 1 - (t - T.handDrop - 0.18) / 0.25) * Math.sin((t - T.handDrop) * 60) * 0.01 : 0;
    mat.uniforms.uMin.value = -TICK * (1 - k) + over;
    mat.uniforms.uHour.value = -TICK * 0.083;
    // the second hand ticks every 0.25 s (stepped), so it visibly runs in the stopped second
    mat.uniforms.uSec.value = Math.floor((t - T.clockOn) * 4) * TICK * 5 - TICK * 5;
  };
  m.userData.dispose = () => { mat.dispose(); m.geometry.dispose(); };
  return m;
}
