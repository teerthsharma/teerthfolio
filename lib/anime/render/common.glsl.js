// GLSL shared by the render/ passes. Prefix is rx. Depth textures hold window depth in .r (0 near, 1 far).
export const RX = /* glsl */ `
  const vec3 RX_LUMA = vec3(0.2126, 0.7152, 0.0722);
  float rxLuma(vec3 c) { return dot(c, RX_LUMA); }
  float rxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float rxNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(rxHash(i), rxHash(i + vec2(1, 0)), f.x), mix(rxHash(i + vec2(0, 1)), rxHash(i + vec2(1, 1)), f.x), f.y); }
  // linear eye distance (metres, positive) from window depth
  float rxLin(float d, float near, float far) { float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
  // view-space position (camera looks down -z) from uv and window depth
  vec3 rxViewPos(vec2 uv, float d, mat4 invProj) { vec4 p = invProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
  // view-space normal from the depth buffer alone; at an edge each axis takes the neighbour on the same surface
  vec3 rxNormal(sampler2D tD, vec2 uv, vec2 px, mat4 invProj) {
    vec3 c = rxViewPos(uv, texture2D(tD, uv).r, invProj);
    vec2 ox = vec2(px.x, 0.0), oy = vec2(0.0, px.y);
    vec3 l = rxViewPos(uv - ox, texture2D(tD, uv - ox).r, invProj), r = rxViewPos(uv + ox, texture2D(tD, uv + ox).r, invProj);
    vec3 b = rxViewPos(uv - oy, texture2D(tD, uv - oy).r, invProj), t = rxViewPos(uv + oy, texture2D(tD, uv + oy).r, invProj);
    vec3 dx = abs(l.z - c.z) < abs(r.z - c.z) ? c - l : r - c;
    vec3 dy = abs(b.z - c.z) < abs(t.z - c.z) ? c - b : t - c;
    return normalize(cross(dx, dy));
  }
  // colour trace: the line takes the fill it sits on, darker and more saturated, mixed toward the style ink
  vec3 rxInk(vec3 fill, vec3 ink, float inkMix) { float l = rxLuma(fill); return mix(max(vec3(0.0), mix(vec3(l), fill, 1.35)) * 0.3, ink, inkMix); }
`;
