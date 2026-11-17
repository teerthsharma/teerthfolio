// PLATE for p-asmodeus: one screen-space painting in band uv (throne hall, Gate, Sasazuka street with fear motes, road shards, aura).
// The tools come from the cuts pack; every uniform they declare is set by world/index.js per drawing.
export const NAMES = ["asmThroneHall", "asmGateTunnel", "asmNightStreet", "asmFearMotes", "asmShardField", "asmAuraShell"];

export const BODY = `
uniform float uT;
uniform float uMode;
vec3 paint(vec2 p) {
  float asp = uRes.x / uRes.y;
  float bar = max(0.0, (1.0 - asp / 2.39) * 0.5);
  vec2 b = clamp(vec2(p.x / asp, (p.y - bar) / (1.0 - 2.0 * bar)), 0.0, 1.0);
  vec3 c;
  if (uMode < 1.5) {
    c = asmThroneHall(b, uT);
    if (uMode > 0.5) {
      vec3 g = asmGateTunnel(b, uT);
      c = mix(c, g, step(0.004, distance(g, vec3(0.165, 0.024, 0.047))));
    }
  } else {
    c = asmFearMotes(b, uT);
    c = mix(c, asmShardField(b, uT), 1.0 - cAA(b.y, 0.20));
    if (uAsmQ > 0.0) {
      vec3 a = asmAuraShell(b, uT);
      c = mix(c, a, step(0.03, distance(a, vec3(0.071, 0.047, 0.078) * 1.2)));
    }
  }
  return cCap(c);
}`;
