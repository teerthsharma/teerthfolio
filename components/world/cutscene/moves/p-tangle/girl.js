// THE VOICE ACROSS THE LAKE: a schoolgirl standing on the rocky islet against the sun, faceless at this
// distance, the long hair up in a red braided cord whose tails stream in the wind, one hand raised to it.
// Shape and colour only. Vertex colour with alpha as a flag (0 plain, 1 glowing, 2 swaying cord).

import { BoxGeometry, BufferAttribute, ConeGeometry, CylinderGeometry, ShaderMaterial, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISSOLVE, LIGHT, NOISE, OUT, SKY, g3 } from "./gl";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const GIRL_SCALE = 2.1;
export const GIRL_HAND = [0.27, 1.72, 0.1]; // where the cord's far end is held, in her frame (before scale)

export function girlGeometry() {
  const parts = [];
  const add = (g, color, a = 0) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    n.computeVertexNormals();
    const c = new Float32Array(n.attributes.position.count * 4);
    const [r, gg, b] = hex(color);
    for (let i = 0; i < c.length; i += 4) c.set([r, gg, b, a], i);
    n.setAttribute("color", new BufferAttribute(c, 4));
    parts.push(n);
  };
  const SKIN = "#f2c8a8";
  const NAVY = "#222654";
  const WHITE = "#f4efe6";
  const HAIR = "#2a1a3c";
  const RED = "#ee2a40";
  // legs and shoes
  for (const s of [-1, 1]) {
    add(new CylinderGeometry(0.05, 0.04, 0.55, 7).translate(s * 0.075, 0.42, 0), "#2a2e5c"); // socks
    add(new CylinderGeometry(0.058, 0.05, 0.22, 7).translate(s * 0.075, 0.7, 0), SKIN);
    add(new BoxGeometry(0.09, 0.06, 0.17).translate(s * 0.075, 0.03, 0.03), "#1a1620");
  }
  // the pleated skirt, the blouse, the sailor collar, the red bow
  add(new CylinderGeometry(0.17, 0.29, 0.44, 14, 1, true).translate(0, 0.9, 0), NAVY);
  add(new CylinderGeometry(0.15, 0.175, 0.5, 9).translate(0, 1.2, 0), WHITE);
  add(new BoxGeometry(0.34, 0.05, 0.3).translate(0, 1.43, 0.0), NAVY);
  add(new BoxGeometry(0.06, 0.1, 0.04).translate(-0.04, 1.36, 0.16).rotateZ(0.5), RED);
  add(new BoxGeometry(0.06, 0.1, 0.04).translate(0.04, 1.36, 0.16).rotateZ(-0.5), RED);
  // the left arm down, the right raised to the cord
  add(new CylinderGeometry(0.04, 0.036, 0.46, 6).rotateZ(0.12).translate(-0.19, 1.2, 0.01), WHITE);
  add(new CylinderGeometry(0.036, 0.03, 0.2, 6).rotateZ(0.1).translate(-0.215, 0.9, 0.02), SKIN);
  add(new CylinderGeometry(0.04, 0.036, 0.3, 6).rotateZ(-0.9).translate(0.28, 1.45, 0.04), WHITE);
  add(new CylinderGeometry(0.034, 0.03, 0.3, 6).rotateZ(0.12).translate(0.37, 1.62, 0.07), SKIN);
  add(new SphereGeometry(0.036, 6, 5).translate(0.3, 1.77, 0.09), SKIN);
  // neck, head
  add(new CylinderGeometry(0.04, 0.045, 0.12, 6).translate(0, 1.5, 0), SKIN);
  add(new SphereGeometry(0.118, 12, 9).scale(0.95, 1.1, 1).translate(0, 1.64, 0), SKIN);
  // hair: the dome with a fringe, the long fall down the back, caught in the cord's loop
  add(new SphereGeometry(0.128, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(1.0, 1.1, 1.06).translate(0, 1.66, -0.012), HAIR);
  add(new BoxGeometry(0.2, 0.045, 0.06).translate(0, 1.665, 0.105), HAIR);
  add(new SphereGeometry(0.12, 9, 7).scale(1.0, 1.45, 0.78).translate(0, 1.58, -0.085), HAIR);
  add(new ConeGeometry(0.1, 0.72, 8).rotateX(Math.PI).translate(0, 1.18, -0.125), HAIR, 0.25);
  // the red braided cord: a loop at the nape and two tails that stream in the wind
  add(new TorusGeometry(0.058, 0.019, 6, 12).translate(0, 1.48, -0.135), RED, 1);
  add(new CylinderGeometry(0.014, 0.012, 0.42, 5).rotateZ(0.35).translate(0.09, 1.28, -0.15), RED, 2);
  add(new CylinderGeometry(0.014, 0.012, 0.34, 5).rotateZ(-0.3).translate(-0.07, 1.3, -0.15), RED, 2);
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

export function girlMaterial(U) {
  const uni = { ...U, uVis: { value: 0 } };
  return new ShaderMaterial({
    uniforms: uni,
    vertexColors: true,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec4 vC;
      uniform float uTime;
      void main() {
        vC = vec4(1.0);
        #if defined(USE_COLOR_ALPHA)
          vC = color;
        #endif
        vec3 p = position;
        float k = 0.0;
        if (vC.a > 1.7) k = clamp((1.5 - p.y) / 0.35, 0.0, 1.0) * 0.16;
        else if (vC.a > 0.2 && vC.a < 0.3) k = clamp((1.5 - p.y) / 0.7, 0.0, 1.0) * 0.035;
        p.x += k * sin(uTime * 3.1 + p.y * 7.0) + k * 0.6 * sin(uTime * 5.3 + p.y * 3.0);
        p.z += k * 0.5 * sin(uTime * 2.2 + p.y * 5.0);
        vL = p;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec4 vC;
      uniform float uVis;
      ${NOISE}
      ${SKY}
      ${LIGHT}
      ${DISSOLVE}
      void main() {
        if (h21(floor(gl_FragCoord.xy * 0.5)) > uVis) discard;
        vec3 V = normalize(vW - cameraPosition);
        float dist = length(vW - cameraPosition);
        vec3 n = normalize(vN);
        vec3 col = lightLand(vC.rgb, n, V, dist, 2.4);
        // the sky's glow wraps round her: she is a silhouette, never a black hole
        col += ${g3("#6a58b8")} * 0.16 * (0.5 + 0.5 * n.y) * (1.0 - uTw);
        col = mix(col, vC.rgb * 1.25 + ${g3("#ff6a70")} * 0.2, step(0.8, vC.a) * 0.85);
        float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.8);
        col += e * ${g3("#ffd6a0")} * 1.5;
        ${OUT}
      }`,
  });
}
