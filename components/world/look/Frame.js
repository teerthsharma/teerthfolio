// The island's framing disc and one cheap colour grade (phase3: Bruno's tilt-shift falloff and the
// Messenger/paodao LUT, done as arithmetic, not a texture: three ALU lines per pixel, no fetch).
// The disc is a soft ellipse round the pup: inside it the picture is untouched, outside it the value
// sinks and cools toward the fog blue, so the pup is always the brightest, warmest thing in the frame
// (a focal value structure). The grade splits warm highlights from cool shadows and lifts saturation
// a touch. Strength is 0 in every cutscene and the overview: pockets carry their own look.
import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector2, Vector3 } from "three";
import { live } from "../../../lib/world/store";

const fragment = /* glsl */ `
uniform vec2 uCentre;
uniform float uStrength;
uniform float uAspect;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // split-tone: shade leans blue, light leans warm
  vec3 graded = col * mix(vec3(0.93, 0.98, 1.08), vec3(1.03, 1.0, 0.96), smoothstep(0.2, 0.85, lum));
  graded = mix(vec3(lum), graded, 1.12);
  // the disc
  vec2 d = (uv - uCentre) * vec2(uAspect, 1.0);
  float out_ = smoothstep(0.3, 0.9, length(d * vec2(0.8, 1.0)));
  graded *= mix(vec3(1.0), vec3(0.55, 0.72, 1.0), out_ * 0.9);
  outputColor = vec4(mix(col, graded, uStrength), inputColor.a);
}
`;

export class FrameEffect extends Effect {
  constructor() {
    super("FrameEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["uCentre", new Uniform(new Vector2(0.5, 0.35))],
        ["uStrength", new Uniform(0)],
        ["uAspect", new Uniform(1.6)],
      ]),
    });
    this.p = new Vector3();
  }
}

// Called every frame from Look.jsx. `on` is true on the island's chase camera.
export function stepFrame(effect, camera, aspect, on, dt) {
  const u = effect.uniforms;
  const k = u.get("uStrength");
  k.value += ((on ? 1 : 0) - k.value) * (1 - Math.exp(-4 * dt));
  const { x, z } = live.seal;
  effect.p.set(x, 0.8, z).project(camera);
  const c = u.get("uCentre").value;
  c.x = Math.min(0.9, Math.max(0.1, effect.p.x * 0.5 + 0.5));
  c.y = Math.min(0.9, Math.max(0.1, effect.p.y * 0.5 + 0.5));
  u.get("uAspect").value = aspect;
}
