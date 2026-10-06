// ITACHI MANGEKYO: the still that names Tsukuyomi. Abstract iris, three tomoe, Amaterasu as paint.
// Not Tensura. Not a statue. Not a dock hall. Composes noise / cel / ink.
//
// MATHS (p on the eye plane in iris units; r = |p|; th = atan):
//   sclera   celSteps(fbm(p*2.2), 4) over #0f0517 -> #8c5229
//   iris     r in [0.22, 0.70]; fibres fbm(cos/sin(th-0.25 t)*6, r*4); cel3 to gold / orange / violet
//   tomoe    3 heads on r=0.46, tails 0.95 rad; fill ink #14031f (never #000)
//   amaterasu paint strokes: strokes(p*7, th, 0.9, 0.04) * step(0.55, ridged) -> #1a0c0c with ember rim
//   pupil    r < 0.20 ink; photon |r-0.225| isoInk #fff2d1
//   cap      luma ≤ 0.92; almond mask |x|/1.7 + |y|/0.72
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { HEX } from "./palette.js";

const hx = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `vec3(${((n >> 16) & 255) / 255}, ${((n >> 8) & 255) / 255}, ${(n & 255) / 255})`;
};

export function buildMangekyo(ctx, { hole0, at, eyeS }) {
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const mat = new ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uSwell: { value: 0 }, uPin: { value: 0 } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${tools}
      uniform float uT, uSwell, uPin; varying vec2 vP;
      float tomoe(vec2 p, float a0) {
        float R = 0.46;
        vec2 hc = R * vec2(cos(a0), sin(a0));
        float head = length(p - hc) - 0.07;
        float da = mod(a0 - atan(p.y, p.x), 6.2831853);
        float tail = da < 0.95 ? abs(length(p) - R) - 0.07 * (1.0 - da / 0.95) : 1.0;
        return min(head, tail);
      }
      void main() {
        vec2 p = vP;
        float r = length(p), th = atan(p.y, p.x);
        float ax = p.x / 1.70, lid = 0.72 * max(1.0 - ax * ax, 0.0);
        if (abs(ax) > 1.0 || abs(p.y) > lid + 0.04) discard;
        vec3 ink = ${hx("#14031f")};
        vec3 sclIn = ${hx(HEX.sclIn)};
        vec3 sclOut = ${hx(HEX.sclOut)};
        vec3 gold = ${hx(HEX.irisIn)};
        vec3 mid = ${hx(HEX.irisMid)};
        vec3 rim = ${hx(HEX.violetRim)};
        vec3 crim = ${hx(HEX.crimson)};
        vec3 ember = ${hx(HEX.ember)};
        vec3 wisp = ${hx(HEX.wispCore)};
        vec3 photon = ${hx(HEX.photon)};
        float sw = celSteps(fbm(p * 2.2 + uT * 0.15), 4.0);
        vec3 col = mix(sclIn, sclOut, smoothstep(1.15, 0.70, r)) * (0.35 + 0.75 * sw);
        float ir = clamp((r - 0.22) / 0.48, 0.0, 1.0);
        vec2 cf = vec2(cos(th - 0.25 * uT), sin(th - 0.25 * uT));
        float fib = fbm(cf * 6.0 + vec2(ir * 4.0, 0.0));
        vec3 iris = cel3(fib, 0.35, 0.7, mix(gold, mid, ir), mid, rim);
        iris = mix(iris, crim, uPin * 0.55);
        float irisM = smoothstep(0.72, 0.68, r) * smoothstep(0.20, 0.24, r);
        col = mix(col, iris * (1.0 + 0.55 * uSwell), irisM);
        float tm = 0.0;
        for (int k = 0; k < 3; k++) {
          float dd = tomoe(p, float(k) * 2.0943951 + 0.2);
          tm = max(tm, 1.0 - smoothstep(-fwidth(dd), fwidth(dd), dd));
        }
        col = mix(col, ink, tm * irisM);
        float fire = strokes(p * 7.0, th, 0.9, 0.045) * smoothstep(0.52, 0.78, ridged(p * 3.4 + uT * 0.2));
        col = mix(col, wisp, fire * 0.88 * irisM);
        col = mix(col, ember, isoInk(fire, 0.55, 1.6) * irisM);
        col = mix(col, ink, smoothstep(0.21, 0.19, r));
        col = mix(col, photon, isoInk(r, 0.225, 1.7) * (1.2 + 0.6 * uSwell));
        col = mix(col, ${hx(HEX.lid)}, step(abs(abs(p.y) - lid), 0.025 * (1.0 - 0.7 * abs(ax))));
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        gl_FragColor = vec4(col, 0.96);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  const dist = 90;
  mesh.position.copy(at).add(hole0.clone().multiplyScalar(dist));
  const s = (eyeS || 1.4) * 22;
  mesh.scale.setScalar(s);
  mesh.frustumCulled = false;
  mesh.renderOrder = -8;
  mesh.userData.layer = 1;
  mesh.onBeforeRender = (_r, _s, cam) => { mesh.quaternion.copy(cam.quaternion); };
  return {
    mesh,
    update(ts, swell, pin, holeNow) {
      mat.uniforms.uT.value = ts;
      mat.uniforms.uSwell.value = swell;
      mat.uniforms.uPin.value = pin;
      if (holeNow) mesh.position.copy(at).addScaledVector(holeNow, dist);
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
