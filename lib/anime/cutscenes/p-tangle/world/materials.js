// p-tangle WORLD: the painted-lit material every solid thing in the set uses (hills, spit, cedars, boulders, shrine, town, reeds).
// One vertex shader, one lighting function, a per-material ALBEDO. All of it reads the SHARED uniform object, so a stage change
// (kataware-doki -> comet night -> rose -> deep blue) re-grades the whole set at once.
//
// MATHS of paintLit(alb, n, wp, V):
//   ndl   = n . L,  L = normalize(0, .35, -1)  (a low key from the sun side, -z)
//   cel   = step(.05, ndl)                      two tones only, hard shadow edge, soft only in the haze
//   col   = alb * mix(uShade, mix(1, uKey*1.15, .6), cel)       shadows slide to magenta-violet (the film's hue rule), never grey
//   sil   = smoothstep(.1, -.25, ndl) * uSilK                    backlit faces fall to the silhouette colour (#3a2537 at kataware-doki)
//   col   = mix(col, uSil, sil*uSilWeight)
//   rim   = step(.66, 1 - |n.V|) * (.25 + .75 smoothstep(.2,.8, ndl)) : ONE hard edge of warm light on the sun side
//   haze  = 1 - exp(-dist / uHazeD): blue-violet with distance, up to 85 percent
import { ShaderMaterial, Vector3 } from "three";

export const VERT = /* glsl */ `
attribute vec4 aRnd; attribute vec3 aCol; attribute float aEmi;
uniform float uTime;
varying vec3 vWp; varying vec3 vWn; varying vec3 vCol; varying float vEmi; varying vec4 vRnd;
void main() {
  mat4 M = modelMatrix;
#ifdef USE_INSTANCING
  M = M * instanceMatrix;
#endif
  vec4 wp = M * vec4(position, 1.0);
#ifdef SWAY
  // reed blades lean with a slow wind: amplitude grows with height along the blade (position.y in 0..1)
  float ph = uTime * 1.7 + wp.x * 0.8 + vRnd.x * 6.2831;
  wp.xz += vec2(sin(ph), cos(uTime * 1.3 + wp.z * 0.7)) * 0.07 * position.y * position.y;
#endif
  vWp = wp.xyz; vWn = normalize(mat3(M) * normal); vCol = aCol; vEmi = aEmi; vRnd = aRnd;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// a vertex shader can't read vRnd before it is set: SWAY uses aRnd directly
export const VERT_FIXED = VERT.replace("wp.x * 0.8 + vRnd.x", "wp.x * 0.8 + aRnd.x");

export const LIT = /* glsl */ `
uniform vec3 uSunDir, uShade, uKey, uRim, uSil, uHaze, uTownCol; uniform float uSilK, uHazeD, uLant, uTown;
varying vec3 vWp; varying vec3 vWn; varying vec3 vCol; varying float vEmi; varying vec4 vRnd;
vec3 paintLit(vec3 alb, vec3 n, vec3 wp, vec3 V, float rimK, float silW) {
  float ndl = dot(n, uSunDir);
  float cel = step(0.05, ndl);
  vec3 lit = mix(vec3(1.0), uKey * 1.15, 0.6);
  vec3 col = alb * mix(uShade * 1.6, lit, cel);
  float sil = smoothstep(0.1, -0.25, ndl) * uSilK * silW;
  col = mix(col, uSil, sil);
  float rim = step(0.66, 1.0 - abs(dot(n, V))) * (0.25 + 0.75 * smoothstep(0.2, 0.8, ndl)) * rimK;
  col += uRim * rim * 0.55;
  float hz = 1.0 - exp(-length(cameraPosition - wp) / uHazeD);
  col = mix(col, uHaze, hz * 0.85);
  return col;
}`;

// make a solid material. albedo: GLSL body returning vec3 for `vec3 albedo(vec3 wp, vec3 n)`; extra: more GLSL before it.
// o: { facet, sway, side, rim, silW, emissive: GLSL expr (vec3) added after lighting }
export function solidMaterial(U, noiseGlsl, albedo, o = {}) {
  const defines = {}; if (o.sway) defines.SWAY = 1; if (o.facet) defines.FACET = 1;
  return new ShaderMaterial({
    uniforms: U, defines, side: o.side, vertexShader: VERT_FIXED,
    fragmentShader: `${noiseGlsl}\n${LIT}\n${o.extra ?? ""}\n${albedo}
      void main() {
        vec3 n = normalize(vWn);
#ifdef FACET
        n = normalize(cross(dFdx(vWp), dFdy(vWp)));
        if (dot(n, cameraPosition - vWp) < 0.0) n = -n;
#endif
        if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(cameraPosition - vWp);
        vec3 col = paintLit(albedo(vWp, n), n, vWp, V, ${(o.rim ?? 1).toFixed(2)}, ${(o.silW ?? 1).toFixed(2)});
        ${o.emissive ? `col += ${o.emissive};` : ""}
        gl_FragColor = vec4(col, 0.5);
      }`,
  });
}

// merge non-indexed geometries with per-part colour + emission, into one draw call (shrine, houses)
import { BufferGeometry, Float32BufferAttribute } from "three";
export function mergeParts(parts) {
  const pos = [], nor = [], col = [], emi = [];
  for (const { geo, color, emi: e = 0 } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(color.r, color.g, color.b); emi.push(e); }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  out.setAttribute("aCol", new Float32BufferAttribute(col, 3));
  out.setAttribute("aEmi", new Float32BufferAttribute(emi, 1));
  return out;
}
export { Vector3 };
