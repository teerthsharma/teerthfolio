// THE STORM, AND THE SKY THE PUNCH OPENS. One shard icosphere (so the page can
// tear it), its colour by the direction the lens sees. The clouds are flat
// bands of four-colour ink, shaded in black dots, each band edge an ink
// contour, the burning city a magenta glow on the horizon. Round a centre
// above the avenue the whole storm turns; the punch opens a hole there and
// winds the clouds into a vortex round it (uOpen, uSwirl); through the hole
// is clear sky: cyan at the rim, pale gold at the heart, comic sun rays and a
// printed sun. Lightning blanches the bands now and then.

import { IcosahedronGeometry, ShaderMaterial, DoubleSide, Vector3 } from "three";
import { SHARD_FRAG, SHARD_VERT, shardify } from "../p-caustic/parts";
import { PRINT, SH, u } from "./print";

export function sky() {
  const g = shardify(new IcosahedronGeometry(1, 4), 0.035);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uPull: u(1), uOpen: u(0), uSwirl: u(0), uFlash: u(0), uInside: u(0), uVortex: u(new Vector3(0.0, 0.42, -1)), uMaxR: u(0.28), uBlast: u(0) },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      varying vec3 vN;
      void main() {
        vec3 w = shard(position);
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uBreak, uOpen, uSwirl, uFlash, uInside, uMaxR, uBlast;
      uniform vec3 uVortex;
      uniform vec4 uHaze;
      varying vec3 vOrig;
      varying vec3 vN;
      varying float vRand;
      ${PRINT}
      ${SHARD_FRAG}
      void main() {
        vec3 v = normalize(vOrig - cameraPosition);
        vec3 vd = normalize(uVortex);
        vec3 sd = normalize(cross(vd, vec3(0.0, 1.0, 0.0)));
        vec3 ud = cross(sd, vd);
        float ang = acos(clamp(dot(v, vd), -1.0, 1.0));
        float th = atan(dot(v, ud), dot(v, sd));
        // the storm turns round its centre, faster the nearer, once the punch winds it
        float tw = th + uSwirl * (1.7 / (ang + 0.22));
        // the wind pressure of the Smash: the whole storm layer is driven radially away from the impact and thinned
        vec2 q = vec2(cos(tw), sin(tw)) * max(ang - 1.3 * uBlast, 0.0);
        float d = fbm(q * 2.4 + vec2(uTime * 0.015, 0.0)) * 0.7 + 0.3 * fbm(q * 5.5 - uTime * 0.02);
        d -= 0.22 * clamp(uBlast, 0.0, 1.0) * smoothstep(0.0, 0.8, ang);
        float s = clamp((d - 0.30) / 0.42, 0.0, 0.999) * 4.0;
        float band = floor(s);
        float f = fract(s);
        vec4 t = band < 1.0 ? vec4(0.85, 0.5, 0.0, 0.3) : (band < 2.0 ? vec4(0.75, 0.38, 0.0, 0.16) : (band < 3.0 ? vec4(0.6, 0.28, 0.04, 0.06) : vec4(0.4, 0.2, 0.08, 0.0)));
        t.w += (1.0 - f) * 0.16;
        t.w += smoothstep(0.2, 1.0, v.y) * 0.1;
        float ink = (1.0 - smoothstep(0.0, fwidth(s) * 1.8, min(f, 1.0 - f))) * step(1.0, band + (f > 0.5 ? 1.0 : 0.0)) * 0.9;
        // the burning city's glow under the clouds
        float hz = smoothstep(0.3, 0.0, v.y);
        t = mix(t, mix(uHaze, vec4(0.0, 0.5, 0.8, 0.0), 1.0 - hz), hz * (0.45 + 0.4 * (1.0 - s * 0.25)) * (0.6 + 0.4 * band / 3.0));
        // lightning blanches the clouds
        t = mix(t, vec4(0.1, 0.0, 0.15, 0.0), uFlash * 0.7 * (0.35 + 0.65 * s / 4.0));
        // the punch: a hole, clouds lit gold at its wall, clear sky inside
        if (uOpen > 0.001) {
          float R = uOpen * uMaxR;
          float edge = R * (0.9 + 0.2 * fbm(vec2(th * 1.3 + 3.0, uTime * 0.15)));
          float wall = 1.0 - smoothstep(0.0, 0.24, ang - edge);
          t = mix(t, vec4(0.06, 0.14, 0.32, 0.0), wall * 0.92); // the clouds at the wall lit warm by the sun behind them
          if (ang < edge) {
            float s2 = ang / max(edge, 0.001);
            float ray = step(0.5, fract(th * 2.0 / 6.2832 * 6.0 + uTime * 0.03));
            // clear sky: cyan at the rim paling to paper, a gold glow only round the sun (cyan and yellow never overlap into green)
            t = vec4(0.78 * smoothstep(0.3, 1.0, s2), 0.04, 0.55 * (1.0 - smoothstep(0.0, 0.32, s2)) + 0.12 * ray * (1.0 - smoothstep(0.3, 0.6, s2)), 0.0);
            float sun = 1.0 - smoothstep(0.075, 0.085, ang);
            t = mix(t, vec4(0.0, 0.03, 0.1, 0.0), sun);
            ink = max(ink, 1.0 - smoothstep(0.002, 0.006, abs(ang - 0.085)));
          }
          ink = max(ink, (1.0 - smoothstep(0.004, 0.013, abs(ang - edge))) * 0.95);
        }
        float cv;
        vec3 col = inkPrint(t, cv);
        col = mix(col, INK_K, ink);
        float alpha = 1.0;
        if (gl_FrontFacing && uInside < 0.5) {
          float fr = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
          col = mix(col, INK_M, fr * 0.5);
          alpha = mix(0.3, 1.0, fr);
        }
        if (uBreak > 0.0) {
          col = mix(col, PAPER, crackLine(0.08));
          alpha *= 0.9 * (1.0 - smoothstep(1.0, 1.5, uBreak + 0.3 * vRand));
        }
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}
