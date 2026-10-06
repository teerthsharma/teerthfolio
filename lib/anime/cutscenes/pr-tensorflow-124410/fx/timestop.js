// TIME STOP (bible FX "Time stop inversion" + "Palette swap"): full-frame invert held 1.2 s, the giant clock, TICK/TOCK, hanging spray,
// and the per-beat palette wash.
//
// Invert:  a screen-glued quad at depth D = (seal view depth + 0.55 m) with blend  out = 1 * (1 - dst) : the complement of every pixel
//          behind the seal; the seal (nearer than D) fails the depth test, so it keeps its locked colours. Appears on ONE frame at the
//          stop beat (hard cut) and holds `hold` = 1.2 s. (The reserved `impact` beat in scene.js still gives the 2 inverted drawings.)
// Palette: a multiply quad  out = dst * tint,  tint = mix(white, hue, 0.55). Hue by the bible's colour script, swapped by hard cut,
//          on twos (barrage alternates yellow / violet each step), and the first 2 frames (1/6 s) of every shot flash the complement.
// Clock:   screen-glued disc (the sky), q = ((ndc.x - cx) * aspect, ndc.y - cy) / R,  r = |q|, a = atan(q.x, q.y) (0 = 12, clockwise).
//          face #ffe14a with a bullseye ring cut (fract(4r) > .5 darkens), 12 hour ticks (|sin(6a)| ridge) and 60 minute ticks,
//          rim ink at 1.0 < r < 1.09, hands = tapered segments: minute length .78 R (7 m of an 18 m face is .78 of the radius), hour .5 R.
//          Face value 1.35 (the only bloom in the cut). Minute hand: 6 ticks of 0.325 s, the last at 6.95 s lands one tick short of 12
//          (the "4 edges to 3" egg), then it drops onto 12 at the drowning beat + 0.74 s with a damped overshoot.
// Spray:   72 frozen beads around the edge; hung from t0 until the stop ends, then they fall: y -= 4.9 (t - t_end)^2.
import { sstep, hash, beatOf, screenPlane, letter, GLSL_UTIL } from "./common.js";
import { makeDroplets } from "./droplets.js";
import { create as createInvert } from "./time-stop-invert.js";

const TINT_FRAG = /* glsl */ `varying vec2 vUv; uniform vec3 uTint; void main(){ gl_FragColor = vec4(uTint, 1.0); }`;

const CLOCK_FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uAspect, uMin, uHour, uA, uR; uniform vec2 uC; uniform vec3 uFace, uRing, uInk;
  ${GLSL_UTIL}
  float hand(vec2 q, float ang, float len, float w0, float w1){
    vec2 d = vec2(sin(ang), cos(ang)); float t = clamp(dot(q, d) / len, 0., 1.); vec2 c = d * len * t;
    return length(q - c) - mix(w0, w1, t); }
  void main(){
    vec2 ndc = vUv * 2. - 1.;
    vec2 q = vec2((ndc.x - uC.x) * uAspect, ndc.y - uC.y) / uR;
    float r = length(q); if (r > 1.14) discard;
    float a = atan(q.x, q.y); if (a < 0.) a += 6.28318;
    vec3 col = uFace;
    // bullseye rings: darken alternate quarter-radius bands (hard)
    col = mix(col, uRing, step(.5, fract(r * 4.)) * step(r, .96) * 0.55);
    // ticks
    float hour = smoothstep(.07, .035, abs(sin(a * 6.) ) * r) * step(.80, r) * step(r, .96);
    float minute = step(.88, r) * step(r, .96) * smoothstep(.07, .02, abs(sin(a * 30.)) * r * 0.5);
    col = mix(col, uInk, max(hour, minute));
    // hands: ink, with a 1-step cream highlight bar on the minute hand
    float dm = hand(q, uMin, .78, .03, .012), dh = hand(q, uHour, .5, .055, .02);
    float hd = min(dm, dh);
    col = mix(col, uInk, smoothstep(.006, -.006, hd));
    col = mix(col, uInk, smoothstep(.1, .075, length(q)));      // hub
    col = mix(col, vec3(1., .98, .86), smoothstep(.02, .0, length(q) - .035) * .0);
    // rim: ink, 1.0 < r < 1.09 plus a thin inner rule
    float rim = smoothstep(.012, .0, abs(r - 1.045) - .045);
    col = mix(col, uInk, rim);
    float cover = smoothstep(1.14, 1.10, r);
    // value > 1 on the face only: the clock is the one thing that blooms
    col *= mix(1.0, 1.35, step(r, .98) * (1. - max(hour, minute)) * (1. - smoothstep(.006, -.006, hd)));
    gl_FragColor = vec4(col, cover * uA); }`;

// tint hues by the colour script (hex), start times from the bible shot list
const SHOTS = [[0, "#b890ff"], [1.5, "#ffe060"], [3.0, "#ff80d8"], [5.0, "#ffe060"], [6.21, "#fff0d8"], [7.46, "#70ffe0"], [9.54, "#ffd0ee"], [13.0, "#ffffff"]];
const COMP = ["#ffe090", "#9a70ff", "#80ffc0", "#9a70ff", "#e0f0ff", "#ff9070", "#a0ffd0", "#ffffff"];

export default function timestop(ctx, sh) {
  const { THREE } = ctx;
  const { frame, stage, atlas, fps } = sh;
  const group = new THREE.Group();
  const C = (h) => new THREE.Color(h);
  const V = THREE.Vector3;

  const tint = screenPlane(ctx, { frag: TINT_FRAG, blend: "multiply", order: 100, uniforms: { uTint: { value: new THREE.Color(1, 1, 1) } } });
  const invertMod = createInvert(ctx, sh);
  const invert = invertMod.group;
  const clock = screenPlane(ctx, { frag: CLOCK_FRAG, order: 125, margin: 0.55, uniforms: {
    uMin: { value: 0 }, uHour: { value: 0 }, uA: { value: 1 }, uR: { value: 0.5 }, uC: { value: new THREE.Vector2(0.55, 0.52) },
    uFace: { value: C("#ffe14a") }, uRing: { value: C("#ff9a2a") }, uInk: { value: C("#05020a") } } });
  group.add(tint, invert, clock);

  // ---- TICK / TOCK lettering and hanging spray ----
  const tt = letter(ctx, atlas, 166); group.add(tt.mesh);
  const N = 72, spray = makeDroplets(ctx, N); group.add(spray.pts);
  const base = []; for (let i = 0; i < N; i++) base.push([(hash(i * 1.7) - 0.5) * 7, (hash(i * 2.9) - 0.3) * 4.2, (hash(i * 4.1) - 0.5) * 4.5, 0.18 + 0.28 * hash(i * 6.3)]);
  const P = new V();

  const white = new THREE.Color(1, 1, 1), tmp = new THREE.Color();
  const shotIdx = (t) => { let k = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i][0]) k = i; return k; };

  // tick instants: 6 ticks 0.325 s apart ending at 6.95 s, then the drop onto 12
  const tickTimes = (drownT) => { const a = []; for (let i = 5; i >= 0; i--) a.push(6.95 - i * 0.325); a.push(drownT + 0.74); return a; };
  function minuteAngle(t, drownT) {
    const tk = tickTimes(drownT); let n = 0, last = -9;
    for (let i = 0; i < tk.length; i++) if (t >= tk[i]) { n = i + 1; last = tk[i]; }
    const m = n === 7 ? 60 : 53 + Math.min(n, 6);     // 53 at the stop's start ... 59 (one tick short of 12) ... 60
    const since = last < -1 ? 9 : t - last;
    const kick = Math.exp(-since * 14) * Math.cos(since * 38) * 1.6;   // degrees: spring after each tick
    return (m * 6 + kick) * Math.PI / 180;
  }

  function update(t) {
    frame.update();
    const stop = beatOf(ctx, "timestop"), clk = beatOf(ctx, "clock"), drown = beatOf(ctx, "drown");
    const hold = stop.args.hold ?? 1.2;

    // palette wash (hard cut, twos)
    const si = shotIdx(t), tSh = t - SHOTS[si][0], twos = Math.floor(t * fps);
    let hue = SHOTS[si][1];
    if (si === 3) hue = (twos & 1) ? "#ffe060" : "#b078ff";            // barrage: yellow / violet by step
    if (tSh < 2 / 12 && si > 0) hue = COMP[si];                          // 2-frame complement flash on the cut
    const inStop = t >= stop.t && t < stop.t + hold;
    const strength = si === 7 ? 0 : (si === 6 ? 0.35 : 0.55);
    tmp.set(inStop ? "#e8e0ff" : hue); tint.material.uniforms.uTint.value.copy(white).lerp(tmp, inStop ? 0.4 : strength);
    tint.visible = strength > 0 || inStop;

    // invert: one frame cut on, hold, off
    invertMod.update(t);

    // the clock
    const ck0 = clk.t, ck1 = Math.max(clk.t + clk.dur, drown.t + 1.2);
    const showClk = t >= ck0 && t < ck1;
    clock.visible = showClk;
    if (showClk) {
      const u = clock.material.uniforms;
      const rise = sstep(ck0, ck0 + 0.25, t), out = 1 - sstep(ck1 - 0.3, ck1, t);
      u.uA.value = Math.min(rise, out);
      u.uMin.value = minuteAngle(t, drown.t);
      u.uHour.value = -0.02; // hour hand one hair left of 12 (11:59)
      const cn = stage.clockNdc || [0.55, 0.52]; u.uC.value.set(cn[0], cn[1]); u.uR.value = (stage.clockR ?? 0.5) * (0.92 + 0.08 * rise);
      // TICK / TOCK pops on each tick of the hand, beside the clock, alternating
      const ticks = tickTimes(drown.t);
      let shown = false;
      for (let i = 0; i < ticks.length; i++) {
        const age = t - ticks[i];
        if (age >= 0 && age < 0.22) {
          tt.show((i & 1) ? "TOCK" : "TICK", -0.72, 0.6 + (hash(i) - 0.5) * 0.08, 0.26 * (1.12 - age), ((i & 1) ? 1 : -1) * 0.14, 1, 2.0);
          shown = true; break;
        }
      }
      if (!shown) tt.hide();
    } else tt.hide();

    // hanging spray: from shortly before the stop to the drowning; frozen until the stop ends, then falls
    const sA = stop.t - 0.4, sEnd = stop.t + hold, sB = drown.t + 0.7;
    if (t >= sA && t < sB) {
      const c = stage.spray || stage.edge, fall = Math.max(0, t - sEnd);
      for (let i = 0; i < N; i++) {
        const b = base[i];
        frame.L(c[0] + b[0], c[1] + b[1] + 1.0, c[2] + b[2], P);
        P.y -= 4.9 * fall * fall * (0.8 + 0.4 * hash(i)) + (t < stop.t ? Math.max(0, stop.t - t) * -2 : 0);
        spray.pos[i * 3] = P.x; spray.pos[i * 3 + 1] = P.y; spray.pos[i * 3 + 2] = P.z; spray.size[i] = b[3] * (ctx.seal.scale || 1);
      }
      spray.commit(); spray.pts.visible = true; spray.mat.uniforms.uA.value = 1 - sstep(sB - 0.3, sB, t);
    } else spray.pts.visible = false;
  }
  function dispose() {
    tint.material.dispose(); tint.geometry.dispose(); invertMod.dispose();
    clock.material.dispose(); clock.geometry.dispose();
    tt.mesh.material.dispose(); tt.mesh.geometry.dispose(); spray.geo.dispose(); spray.mat.dispose();
  }
  return { group, update, dispose };
}
