// kiri-e-cut: Pierrot cut-paper silhouette. Paper #f4e8c8, fox #c3122e.
// Maths: d = signed distance to the cut (< 0 inside).
//   band = clamp(2.2 * fwidth(d), 0.02, 0.5)
//   cut  = smoothstep(-band, -0.4 * band, d)     die-cut rim, AA
//   discard d > 0
export const meta = { params: { paper: { default: "#f4e8c8" }, fox: { default: "#c3122e" } } };

export const GLSL = /* glsl */ `
  float kiriCut(float d) {
    float band = clamp(2.2 * fwidth(d), 0.02, 0.5);
    return smoothstep(-band, -0.4 * band, d);
  }
  float kiriFox(vec2 p) {
    // chubby fox head + nine tapering tails in card metres, origin at the chest
    float head = length(p - vec2(0.0, 0.35)) - 0.42;
    float earL = length(p - vec2(-0.28, 0.72)) - 0.16;
    float earR = length(p - vec2( 0.28, 0.72)) - 0.16;
    float body = length((p - vec2(0.0, -0.15)) * vec2(0.85, 1.35)) - 0.55;
    float d = min(min(head, body), min(earL, earR));
    for (int i = 0; i < 9; i++) {
      float a = -1.15 + float(i) * 0.29;
      vec2 dir = vec2(sin(a), -cos(a));
      vec2 q = p - vec2(0.0, -0.55);
      float u = dot(q, dir), v = dot(q, vec2(-dir.y, dir.x));
      float tail = max(abs(v) - mix(0.14, 0.03, clamp(u / 1.35, 0.0, 1.0)), max(-u, u - 1.35));
      d = min(d, tail);
    }
    return d;
  }`;
