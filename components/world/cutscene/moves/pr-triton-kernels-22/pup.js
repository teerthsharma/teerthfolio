// THE DEMON PUP IN INK. The real 3D pup takes the dimension's treatment for the scene: each of its
// materials gets an ink twin (its own colours read as a tone, laid in dots, hatching and cross-hatching,
// a black inked rim, its crimson kept as the one red) and is swapped back the instant the picture is
// rubbed out. On top: ANOS VOLDIGOAD's eyes, the Magic Eyes of Destruction (shape and colour only):
// a deep crimson-black iris, a glowing red ring, a runic magic circle with a hexagram and ticks,
// laid as a thin cap over each of the pup's own big eyes (same size, same blink). The Sukuna marks
// under and above the eyes and the black flipper tips are the pup's own (pose.demon).

import { Color, Group, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { EYE_R, SKULL } from "../../../seal/variants/D-parts";
import { INK_LIB } from "./ink";

const srgb = (c) => new Color().copy(c).convertLinearToSRGB();

function pupMaterial(U, { color, vertexColors, transparent, opacity }) {
  return new ShaderMaterial({
    uniforms: { ...U, uBase: { value: srgb(color) }, uOpacity: { value: opacity } },
    vertexColors,
    transparent,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform float uOpacity;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      ${INK_LIB}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        vec3 c = uBase * vCol;
        float lum = dot(c, vec3(0.299, 0.587, 0.114));
        float red = clamp((c.r - max(c.g, c.b)) * 3.2, 0.0, 1.0);
        float key = max(dot(n, normalize(vec3(-0.5, 0.62, 0.6))), 0.0);
        float low = max(-n.y, 0.0);
        float tone = clamp(lum * (0.5 + 0.62 * key) + 0.05, 0.0, 1.0);
        vec2 fc = gl_FragCoord.xy / uDpr;
        vec2 ic = inkCov(tone, fc, 0.5 + 0.8 * n.x);
        vec3 paper = PAPER * (0.97 + 0.06 * vn(fc * 0.5));
        vec3 col = mix(paper, mix(INK, RED, 0.0), ic.x);
        col = mix(col, INK, ic.y);
        // the crimson parts stay red, hatched in black
        vec3 redC = mix(RED * 1.05, INK, max(ic.x * 0.8, ic.y));
        col = mix(col, redC, red);
        // red light from below, in thin red hatch lines on the paper
        float rl = lineM(dot(fc, vec2(0.7, 0.7)) / 4.0, 0.34, 0.08) * smoothstep(0.1, 0.55, low) * uSkyK * 0.8;
        col = mix(col, RED, rl * (1.0 - red));
        // the inked rim
        float rim = 1.0 - max(dot(n, v), 0.0);
        col = mix(col, INK, smoothstep(0.66, 0.8, rim));
        col += (h21(floor(gl_FragCoord.xy) + fract(uT * 7.13) * 113.0) - 0.5) * 0.04;
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), uOpacity);
      }`,
  });
}

// the pup's ink twin: swap in and out
export function inkPup(root, U) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = pupMaterial(U, { color: m.color ?? new Color(1, 1, 1), vertexColors: Boolean(m.vertexColors), transparent: m.transparent, opacity: m.opacity ?? 1 });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}

// THE MAGIC EYES OF DESTRUCTION: a cap over each of the pup's lenses
export function anosEyes(head) {
  const eyes = head.children.find((o) => o.type === "Group" && o.children.length === 2 && o.children[0].isMesh);
  if (!eyes) return null;
  const lens = eyes.children[0].geometry.attributes.position;
  const geo = new SphereGeometry(EYE_R * 1.02, 28, 10, 0, Math.PI * 2, 0, 1.5).rotateX(Math.PI / 2);
  const mat = new ShaderMaterial({
    uniforms: { uR: { value: EYE_R }, uTime: { value: 0 } },
    vertexShader: "varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uR, uTime;
      varying vec3 vP;
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.012, d); }
      void main() {
        vec2 q = vP.xy / uR;
        float r = length(q);
        if (r > 1.0) discard;
        float ang = atan(q.y, q.x);
        // a deep crimson-black iris, redder toward the ring
        vec3 c = mix(vec3(0.018, 0.0, 0.012), vec3(0.34, 0.0, 0.06), smoothstep(0.12, 0.72, r));
        // the glowing red ring and its glow
        float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
        c += vec3(1.0, 0.1, 0.14) * exp(-pow((r - 0.66) / 0.075, 2.0)) * 1.5 * pulse;
        c += vec3(0.5, 0.0, 0.06) * exp(-pow((r - 0.66) / 0.24, 2.0)) * 0.45;
        // the magic circle: an inner ring, a hexagram, runic ticks round the outside
        float rot = uTime * 0.35;
        vec3 red = vec3(1.0, 0.18, 0.2);
        float m = ln(abs(r - 0.43), 0.035) * 0.9;
        float star = 0.0;
        for (int k = 0; k < 3; k++) {
          float a = 1.5708 + float(k) * 2.0944 + rot;
          vec2 nn = vec2(cos(a), sin(a));
          float up = ln(abs(dot(q, nn) - 0.215), 0.04);
          float dn = ln(abs(dot(q, -nn) - 0.215), 0.04);
          star = max(star, max(up, dn));
        }
        m = max(m, star * (1.0 - smoothstep(0.43, 0.47, r)) * 0.9);
        float tick = ln(abs(fract((ang + rot) * 12.0 / 3.14159) - 0.5), 0.5) * step(0.74, r) * step(r, 0.9);
        float tl = step(0.45, fract(sin(floor((ang + rot) * 12.0 / 3.14159) * 91.7) * 437.0));
        m = max(m, tick * tl * 0.9);
        c = mix(c, red, m * (1.0 - smoothstep(0.88, 0.95, r)));
        // the pupil, a small dark slit, and the highlights that keep it cute
        c = mix(c, vec3(0.0), 1.0 - smoothstep(0.1, 0.15, length(q * vec2(1.7, 0.85))));
        c = mix(c, vec3(0.02, 0.0, 0.01), smoothstep(0.92, 0.99, r));
        c = mix(c, vec3(1.0), 1.0 - smoothstep(0.2, 0.26, length(q - vec2(-0.36, 0.38))));
        c = mix(c, vec3(1.0), 1.0 - smoothstep(0.08, 0.13, length(q - vec2(0.4, -0.38))));
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  const g = new Group();
  const n = new Vector3();
  const c = new Vector3();
  const v = new Vector3();
  for (const side of [1, -1]) {
    c.set(0, 0, 0);
    let k = 0;
    for (let i = 0; i < lens.count; i++) if (Math.sign(lens.getX(i)) === side) (c.x += lens.getX(i), c.y += lens.getY(i), c.z += lens.getZ(i), k++);
    c.multiplyScalar(1 / k);
    v.copy(c).add(eyes.position);
    n.set(v.x / SKULL[0] ** 2, v.y / SKULL[1] ** 2, v.z / SKULL[2] ** 2).normalize();
    let depth = 0;
    for (let i = 0; i < lens.count; i++) if (Math.sign(lens.getX(i)) === side) depth = Math.max(depth, v.set(lens.getX(i), lens.getY(i), lens.getZ(i)).sub(c).dot(n));
    const m = new Mesh(geo, mat);
    m.scale.set(1, 1, (depth * 1.12 + 0.002) / (EYE_R * 1.02));
    m.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
    m.position.copy(c);
    g.add(m);
  }
  g.visible = false;
  eyes.add(g);
  return { g, mat, dispose: () => (g.removeFromParent(), geo.dispose(), mat.dispose()) };
}
