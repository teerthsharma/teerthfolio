// The small parts of the dam dimension: the giant clock in the sky (the cause of the way home: its minute hand is
// one tick from twelve while time is stopped, and when time resumes it falls on twelve), the hanging droplets,
// the pup's ink twin (cel bands, ink hatching and a palette rim, so the pup wears the dimension's line), and the
// clock-tick sound (two synthesised clicks, WebAudio only, built lazily and only if the site's sound is on).

import { BoxGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, ShaderMaterial, TorusGeometry } from "three";
import { getUi } from "../../../../../lib/world/store";
import { COMMON, merge, part, R } from "./ink";

export const CLOCK = { x: -3.2, y: 17.5, z: -46, r: 8 };

// the face, the bezel, twelve bars: static; the two hands are separate meshes that turn about the centre
export function clockGeometry() {
  const p = [];
  p.push(part(new CylinderGeometry(CLOCK.r, CLOCK.r, 0.4, 40).rotateX(Math.PI / 2), R.cream, { z: -0.25 }));
  p.push(part(new TorusGeometry(CLOCK.r + 0.15, 0.55, 6, 48), R.ink));
  p.push(part(new TorusGeometry(CLOCK.r - 1.1, 0.12, 4, 48), R.ink, { z: 0.05 }));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const big = k % 3 === 0;
    p.push(part(new BoxGeometry(big ? 0.55 : 0.3, big ? 1.7 : 1.0, 0.3), R.ink, { x: Math.sin(a) * (CLOCK.r - 1.1 - (big ? 0.8 : 0.5)), y: Math.cos(a) * (CLOCK.r - 1.1 - (big ? 0.8 : 0.5)), z: 0.1, rz: -a }));
  }
  p.push(part(new CylinderGeometry(0.6, 0.6, 0.5, 12).rotateX(Math.PI / 2), R.coral, { z: 0.5 }));
  return merge(p);
}
// a hand pointing up from the centre: length L, width w
export const handGeometry = (L, w, role) => merge([part(new BoxGeometry(w, L, 0.28), role, { y: L / 2 - 0.4, z: 0.3 }), part(new BoxGeometry(w * 2.2, 0.9, 0.28), role, { y: -0.7, z: 0.3 })]);

export const dropGeometry = () => part(new IcosahedronGeometry(0.11, 1), R.cream, { sy: 1.5 });

// THE PUP'S INK TWIN: a twin of each of its materials, swapped in and out. Its own colours kept, three bands of
// light with ink hatching in the shade, a palette rim, the diagonal shadow band across it like everything else.
export function inkPup(root, U) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let t = twins.get(m);
    if (!t) {
      const base = (m.color ?? new Color(1, 1, 1)).clone().convertLinearToSRGB();
      t = new ShaderMaterial({
        uniforms: { ...U, uBase: { value: base }, uOpacity: { value: m.opacity ?? 1 } },
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        side: m.side ?? 0,
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          varying vec3 vCol;
          void main() {
            vCol = vec3(1.0);
            #ifdef USE_COLOR
              vCol = pow(color.rgb, vec3(1.0 / 2.2));
            #endif
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = -mv.xyz;
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase;
          uniform float uOpacity;
          varying vec3 vN;
          varying vec3 vV;
          varying vec3 vCol;
          ${COMMON}
          void main() {
            vec3 n = normalize(vN);
            vec3 v = normalize(vV);
            vec3 b = uBase * vCol;
            float d = dot(n, normalize(vec3(-0.45, 0.75, 0.5))) * 0.5 + 0.5;
            vec3 c = d < 0.4 ? mix(uPal[5], b, 0.55) : (d < 0.72 ? b : b * 1.1 + 0.06);
            if (d < 0.4) c = mix(c, uPal[5], hatch(0.4) * 0.8);
            float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            c = mix(c, uPal[2], step(0.5, rim) * 0.85);
            if (bandShade() > 0.5) c = mix(c, uPal[5], 0.5);
            gl_FragColor = vec4(outc(c), uOpacity);
          }`,
      });
      twins.set(m, t);
    }
    list.push([o, m, t]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, t] of list) o.material = v ? t : m;
    },
    dispose() {
      this.set(false);
      for (const t of twins.values()) t.dispose();
    },
  };
}

// THE CLOCK-TICK: a dry click and a lower tock, synthesised on first use (the play started from a tap, so the
// context may run). Silent if the site's sound is off or WebAudio is missing.
export function ticker() {
  let ctx = null;
  const click = (when, f, g) => {
    const o = ctx.createOscillator();
    const a = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(f, when);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, when + 0.05);
    a.gain.setValueAtTime(g, when);
    a.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    o.connect(a).connect(ctx.destination);
    o.start(when);
    o.stop(when + 0.09);
  };
  return {
    tick(low = false) {
      try {
        if (!getUi().sound) return;
        ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const t = ctx.currentTime;
        click(t, low ? 900 : 1700, 0.09);
      } catch {
        /* no audio: the picture carries it */
      }
    },
    dispose() {
      try {
        ctx?.close();
      } catch {
        /* closed already */
      }
      ctx = null;
    },
  };
}

export { DoubleSide };
