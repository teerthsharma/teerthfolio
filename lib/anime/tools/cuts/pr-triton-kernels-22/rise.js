// tkIceRise: the 55-block triangle of tkIceBlocks with the row-by-row rise out of the water and a ripple ring under every block that sinks (the dock table has neither).
import { defineCut } from "../kit.glsl.js";

const KD = ["cutKit", "tkKit"];

export const tkIceRise = {
  ...defineCut(
    "tkIceRise",
    "pr-triton-kernels-22",
    "ice cube triangle whose rows climb out of the water apex first, then split along one diagonal and sink with a ripple ring each",
    `uniform float uTkRowF;
  vec4 tkIceRiseRGBA(vec2 p, float t) {
    vec2 m = tkM(p);
    vec4 o = vec4(0.0);
    float pitch = 0.030;
    if (uTkSink > 0.001) {
      for (int qi = 0; qi < 10; qi++) {
        float q = float(qi);
        float yc = 0.205 + q * 0.012;
        for (int ci = 0; ci < 10; ci++) {
          float cc = float(ci);
          if (cc > q) continue;
          if (cc == q || cc == 0.0 || (q >= 4.0 && cc == floor(q * 0.5))) continue;
          vec2 l = vec2(m.x - (cc - q * 0.5) * pitch, m.y - (yc - 0.016));
          float r = 0.013 + 0.050 * uTkSink;
          float ring = cLine(abs(length(l * vec2(1.0, 2.6)) - r), 1.6) * (1.0 - uTkSink) * step(0.04, uTkSink);
          o.rgb = mix(o.rgb, vec3(0.416, 0.812, 0.875), ring);
          o.a = max(o.a, ring);
        }
      }
    }
    for (int qi = 9; qi >= 0; qi--) {
      float q = float(qi);
      float ru = clamp((uTkRowF - floor(1.2 * q)) / 6.0, 0.0, 1.0);
      if (ru <= 0.0) continue;
      float yc = 0.205 + q * 0.012;
      float cc = floor(m.x / pitch + q * 0.5 + 0.5);
      if (cc < 0.0 || cc > q) continue;
      float sched = (cc == q || cc == 0.0 || (q >= 4.0 && cc == floor(q * 0.5))) ? 1.0 : 0.0;
      vec2 l = vec2(m.x - (cc - q * 0.5) * pitch, m.y - yc);
      float un = 1.0 - sched;
      float sg = dot(vec2(m.x, yc - 0.26), vec2(-0.7071, 0.7071)) < 0.0 ? -1.0 : 1.0;
      l -= vec2(0.7071, 0.7071) * (0.35 * 0.027 * uTkSplit * sg * un);
      l.y += uTkSink * 0.021 * un;
      l.y += (1.0 - smoothstep(0.0, 1.0, ru)) * 0.04;
      float d = max(tkBox(l - vec2(0.0, -0.002), vec2(0.0135, 0.0135), 0.0), (yc - 0.016) - m.y);
      float al = 1.0 - smoothstep(0.7, 1.0, uTkSink * un);
      vec3 ice = mix(vec3(0.416, 0.541, 0.596), vec3(0.859, 0.894, 0.941), cAA(l.y, 0.0));
      vec3 edge = mix(TK_INK, vec3(0.878, 0.063, 0.165), sched * uTkSched);
      vec3 col = mix(ice, edge, cLine(d, 3.0));
      col = mix(col, TK_INK, (1.0 - cAA(abs(l.x - l.y), 0.0018)) * sched * uTkSched * cFill(d));
      float f = max(cFill(d), cLine(d, 3.0)) * al;
      o.rgb = mix(o.rgb, col, f);
      o.a = max(o.a, f);
    }
    return o;
  }
  vec3 tkIceRise(vec2 p, float t) { vec4 s = tkIceRiseRGBA(p, t); return mix(tkMalevolentPlate(p, t), s.rgb, s.a); }`,
    "tkIceRise(tkPic(p), t)",
  ),
  deps: [...KD, "tkIceBlocks"],
  uniforms: () => ({ uTkRowF: { value: 99 } }),
  suits: ["pr-triton-kernels-22"],
  draws: "ten rows of small ice cubes in a triangle on the water, each row climbing out of it in turn apex first, scheduled ones edged in red, the rest splitting and sinking with a pale ripple ring each",
  use: "surface",
  params: "uTkRowF frames since frame 37 (row q starts at floor(1.2 q), 6 frames); uTkSched, uTkSplit, uTkSink as tkIceBlocks",
};

export default [tkIceRise];
