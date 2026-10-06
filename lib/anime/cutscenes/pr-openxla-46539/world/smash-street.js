// SMASH STREET (MHA Kamino, Bones + Golden Age / Ben-Day). Naming still for pr-openxla-46539.
// A live painted plane over the avenue: orange tiles, Ben-Day dots in shadow, ink joints, crater wash.
//
// MATHS
//   tile 1.2 m; v = L * (0.84 + 0.32 h21(tile))
//   cel3 at 0.26 / 0.60: #4a1a1a / #a04a2a / #d86a3a
//   Ben-Day: cell 7 px rotated 15°, rDot = mix(0.46, 0.08, luma), AA = fwidth
//   ink #12070a joints where tile-edge < 0.04 m. luma ≤ 0.92. Never #000.
import { C } from "./palette.js";
import { V } from "./lib.js";
import { CRATER, POOLS } from "./layout.js";

export const meta = {
  name: "smash-street",
  params: {
    ink: { default: "#12070a" },
    cellPx: { default: 7 },
    lumaCap: { default: 0.92 },
  },
};

const VERT = /* glsl */ `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function create(ctx) {
  const pools = POOLS.map(([x, z, r, k]) => `L += ${k.toFixed(2)} * exp(-dot(m - vec2(${x.toFixed(1)}, ${z.toFixed(1)}), m - vec2(${x.toFixed(1)}, ${z.toFixed(1)})) / ${(r * r).toFixed(1)});`).join("\n    ");
  const FRAG = /* glsl */ `varying vec3 vL;
    ${ctx.tools.glslFor(["noise", "cel"])}
    const vec3 INK = ${V("#12070a")};
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    vec3 cap(vec3 c){ return c * min(1.0, 0.92 / max(dot(c, LUMA), 1e-3)); }
    void main(){
      vec2 m = vL.xz;
      float L = 0.16;
      ${pools}
      vec2 cr = m - vec2(${CRATER.x.toFixed(1)}, ${CRATER.z.toFixed(1)});
      L += 1.4 * exp(-dot(cr, cr) / 36.0);
      float v = L * (0.84 + 0.32 * h21(floor(m / 1.2)));
      vec3 col = cel3(v, 0.26, 0.60, ${V(C.payShade)}, ${V(C.payMid)}, ${V(C.payLit)});
      vec2 gq = abs(fract(m / 1.2) - 0.5);
      float e = (0.5 - max(gq.x, gq.y)) * 1.2;
      col = mix(col, INK, (1.0 - smoothstep(0.02, 0.05, e)) * 0.85);
      float ca = 0.9659, sa = 0.2588;
      vec2 f = gl_FragCoord.xy;
      vec2 rot = vec2(ca * f.x - sa * f.y, sa * f.x + ca * f.y) / 7.0;
      vec2 cell = fract(rot) - 0.5;
      float lum = dot(col, LUMA);
      float rd = mix(0.46, 0.08, lum);
      float dotOn = 1.0 - smoothstep(rd, rd + fwidth(length(cell)) + 1e-4, length(cell));
      col = mix(col, mix(INK, ${V("#ff8a20")}, step(0.45, lum)), dotOn * (1.0 - lum) * 0.55);
      float dc = length(cr);
      col = mix(col, ${V("#1a0a08")}, (1.0 - smoothstep(3.0, 8.2, dc)) * 0.7);
      gl_FragColor = vec4(cap(col), 0.5);
    }`;
  const mat = new ctx.THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const mesh = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(22, 80).rotateX(-Math.PI / 2), mat);
  mesh.position.set(0, 0.03, 0);
  mesh.name = "smash-street";
  mesh.frustumCulled = false;
  return { group: mesh, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}

export function buildSmashStreet(ctx) { return create(ctx); }
