// THE TOON PUP (ledger row 3): one material class that lights itself.
// toonPatch(): keeps three's lights and shadow map, then re-bands the result:
//   lr = light that arrived / albedo luma, floored by a view-space key so the
//   pup holds a lit/mid/shade form even in a pocket with no light on it;
//   3 bands, shade is hue-shifted (cool violet, never albedo*0.2), plus a
//   constant-width rim. Nothing here reads a pocket's palette or post.
// inkHull(): inverted hull, constant PIXEL width (offset in clip space).
// lockMaterial(): pockets swap `mesh.material` for their own twin (halftone,
// charcoal, cyanotype...). The pup is excluded: the swap is ignored, so it
// stays itself in every medium. One line, instead of 20 dock edits.
import { Color, ShaderMaterial, BackSide, Vector2 } from "three";

const PATCH = /* glsl */ `
  {
    vec3 alb = diffuseColor.rgb;
    float la = dot(alb, vec3(0.2126, 0.7152, 0.0722)) + 1e-3;
    float lr = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)) / la;
    vec3 N = normalize(normal);
    vec3 V = normalize(vViewPosition);
    float key = dot(N, normalize(vec3(-0.45, 0.65, 0.62))) * 0.5 + 0.5;
    lr = max(lr, key * 0.95);
    float e = fwidth(lr) + 1e-4;
    float b1 = smoothstep(uToon.x - e, uToon.x + e, lr);
    float b2 = smoothstep(uToon.y - e, uToon.y + e, lr);
    vec3 shade = alb * vec3(0.52, 0.58, 0.9) + vec3(0.02, 0.015, 0.07);
    vec3 mid = alb * vec3(0.84, 0.88, 1.0);
    vec3 lit = alb * vec3(1.1, 1.07, 1.02);
    vec3 col = mix(mix(shade, mid, b1), lit, b2);
    float nv = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    float rw = fwidth(nv) + 1e-4;
    float rim = smoothstep(1.0 - uToon.z - rw, 1.0 - uToon.z + rw, nv) * smoothstep(-0.05, 0.1, dot(N, normalize(vec3(-0.5, 0.5, -0.7))));
    col = mix(col, vec3(0.82, 0.92, 1.0), rim * 0.9);
    outgoingLight = col;
  }
  #include <opaque_fragment>`;

export function toonPatch(m, o = {}) {
  const u = { uToon: { value: [o.lo ?? 0.34, o.hi ?? 0.7, o.rim ?? 0.2, 0] } };
  m.onBeforeCompile = (s) => {
    s.uniforms.uToon = u.uToon;
    s.fragmentShader = "uniform vec4 uToon;\n" + s.fragmentShader.replace("#include <opaque_fragment>", PATCH);
  };
  m.customProgramCacheKey = () => "toon-pup";
  m.userData.toon = true;
  return m;
}

export function inkHull(ink = "#141b4a") {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { uRes: { value: new Vector2(1280, 800) }, uPx: { value: 2 }, uInk: { value: new Color(ink) } },
    vertexShader: `uniform vec2 uRes; uniform float uPx;
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0)).xy;
        p.xy += normalize(d + 1e-6) * uPx * 2.0 / uRes * p.w;
        gl_Position = p;
      }`,
    fragmentShader: "uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.0); }",
  });
}

// ignore every later `mesh.material = twin` (the getter keeps returning m)
export function lockMaterial(mesh, m) {
  Object.defineProperty(mesh, "material", { get: () => m, set: () => {}, configurable: true });
}
