// araki: defineModule shape for the David Production JoJo family kit; uniforms are three vectors; rgb() gives sRGB-literal vec3 like the GLSL constants.
import { Vector2, Vector3, Vector4 } from "three";

export const SUITS = "p-separatrix, pr-tensorflow-124410";
export const v2 = (x, y) => new Vector2(x, y);
export const v3 = (x, y, z) => new Vector3(x, y, z);
export const v4 = (x, y, z, w) => new Vector4(x, y, z, w);
export const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return v3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };

const U = (o) => () => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

export function defineModule({ name, doc, glsl, demoExpr, draws, use, params, uniforms = {}, deps = ["arakiKit"] }) {
  if (!name || !doc || !glsl || !demoExpr || !draws || !use || !params) throw new Error(`araki module incomplete: ${name ?? "?"}`);
  return { name, family: "araki", doc, deps, glsl, demo: `vec3 demo(vec2 p, float t){ return arkCap(${demoExpr}); }`, uniforms: U(uniforms), draws, use, suits: SUITS, params };
}
