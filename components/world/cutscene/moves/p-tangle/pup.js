// THE PUP IN KATAWARA-DOKI: its own colours under the twilight (cool skylight in the shade, an amber rim on
// the side the sun is on, a soft top sheen), a painted twin for each of its materials, swapped in for the
// scene; and the red cord's wrap on its near flipper, which stays on the pup once the scene is over.

import { Color, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { wrapParts } from "./cord";
import { g3 } from "./gl";

const srgb = (c) => new Color().copy(c).convertLinearToSRGB();

function twin(m, U) {
  return new ShaderMaterial({
    uniforms: { ...U, uBase: { value: srgb(m.color ?? new Color(1, 1, 1)) } },
    vertexColors: Boolean(m.vertexColors),
    transparent: m.transparent,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uSun;
      uniform float uTw, uKeep;
      varying vec3 vN; varying vec3 vW; varying vec3 vCol;
      void main() {
        vec3 n = normalize(vN);
        vec3 V = normalize(vW - cameraPosition);
        vec3 L = normalize(uSun + vec3(0.0, 0.18, 0.0));
        float ndl = dot(n, L);
        vec3 base = uBase * vCol;
        float tw = 1.0 - uTw;
        vec3 sky = mix(${g3("#6a78d8")}, ${g3("#8a6ad0")}, 0.35) * (0.62 + 0.38 * n.y);
        sky = mix(sky, ${g3("#3a4488")}, uTw * 0.7);
        vec3 lit = base * (sky * 0.95 + smoothstep(-0.2, 0.8, ndl) * ${g3("#ffa070")} * 0.8 * tw);
        // the lake's pink bounce from below, and the sun's rim along the edge
        lit += base * ${g3("#ff7a9a")} * 0.22 * max(-n.y, 0.0) * tw;
        float rim = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 2.4) * smoothstep(-0.2, 0.7, ndl + 0.15);
        lit += ${g3("#ffc08a")} * rim * 0.9 * tw;
        float top = pow(max(dot(reflect(V, n), normalize(vec3(0.0, 1.0, 0.3))), 0.0), 18.0);
        lit += ${g3("#fff0e0")} * top * 0.22;
        vec3 day = base * (0.62 + 0.4 * clamp(ndl * 0.5 + 0.5, 0.0, 1.0));
        vec3 col = mix(lit, day, uKeep);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// pup: pupParts(scene) from p-caustic/parts.js. Returns the painted twins and the flipper the cord is tied to.
export function pupTwilight(parts, U) {
  const root = parts.root;
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.isMeshBasicMaterial || o.userData.tangleWrap) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = twin(m, U);
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

// THE WRAP: made once, then left on the near flipper. `show(k)` pops it in; after the scene it stays at 1.
export function flipperWrap(parts) {
  const flip = parts.rear?.children?.[2]?.children?.[0]; // the near flipper's pivot (D.jsx: rear > mirrored group > flipR)
  if (!flip) return null;
  let wrap = flip.userData.tangleWrap;
  if (!wrap) {
    const { g, m } = wrapParts();
    wrap = new Object3D();
    const mesh = new Mesh(g, m);
    mesh.castShadow = false;
    mesh.userData.tangleWrap = true;
    wrap.add(mesh);
    const knot = new Object3D();
    knot.position.set(0.5, 0.1, 0);
    wrap.add(knot);
    wrap.userData.knot = knot;
    wrap.userData.tangleWrap = true;
    wrap.scale.setScalar(0.0001);
    flip.add(wrap);
    flip.userData.tangleWrap = wrap;
  }
  return wrap;
}

const V = new Vector3();
// the cord's tie-point in the rig's frame (rig: the group the scene's meshes live in)
export function tiePoint(wrap, rig, out) {
  wrap.userData.knot.getWorldPosition(V);
  return out.copy(rig.worldToLocal(V));
}
