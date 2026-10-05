// THE PUP IN THE DRAWING: the real 3D pup (round head, no ears) shaded in the three blueprint blues, with a cream
// outline (an inverted hull) and cream eyes, so it reads as the hero drawn into the plan. Each of its materials
// gets a blueprint twin that swaps in for the drawing and out the instant the sheet burns away. Also: the
// flipper's tip (where the coin rests) found from the flipper mesh.

import { Color, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { CREAM, MID, NAVY, SHADE, hullOf, rgb, silMaterial } from "./blue";

const LIT = "#2f7dff"; // saturated cobalt fill
const PUP_LINE = "#fff3c4";

function twin(m, eye) {
  return new ShaderMaterial({
    uniforms: { uBase: { value: new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB() }, uShade: { value: rgb(SHADE) }, uMid: { value: rgb(MID) }, uLit: { value: rgb(LIT) }, uCream: { value: rgb(CREAM) }, uNavy: { value: rgb(NAVY) } },
    vertexColors: Boolean(m.vertexColors),
    defines: { EYE: eye ? 1 : 0 },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uShade, uMid, uLit, uCream, uNavy;
      varying vec3 vN;
      varying vec3 vCol;
      void main() {
        float lum = dot(uBase * vCol, vec3(0.299, 0.587, 0.114));
        #if EYE
          gl_FragColor = vec4(lum > 0.4 ? uCream : uNavy, 1.0);
        #else
          float d = dot(normalize(vN), normalize(vec3(-0.45, 0.7, 0.55)));
          float t = d * 0.5 + lum * 0.95;
          // front-lit by the amber key: the lights go warm cream-gold, the half-tones cobalt, the shade near-black
          gl_FragColor = vec4(t > 0.85 ? mix(uLit, vec3(1.0, 0.8, 0.45), 0.8) : t > 0.42 ? mix(uMid, uLit, 0.5) : uShade, 1.0);
        #endif
      }`,
  });
}

export function pupBlue(root) {
  const list = [];
  const twins = new Map();
  const hulls = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || o.userData.fHull) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = m.isMeshBasicMaterial ? new ShaderMaterial({ uniforms: { uC: { value: rgb(CREAM) } }, vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }" }) : twin(m, Boolean(m.clearcoat >= 1));
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  // the outline: the pup's big masses (body, head, flippers, tail) each get a cream hull
  const hullMat = silMaterial(true);
  hullMat.uniforms.uC.value = rgb(PUP_LINE);
  for (const [o, m] of list) {
    if (m.clearcoat >= 1 || m.isMeshBasicMaterial) continue;
    const n = o.geometry.attributes.position.count;
    if (n < 150 || !o.geometry.attributes.normal) continue;
    const h = new Mesh(hullOf(o.geometry, 0.022), hullMat);
    h.userData.fHull = true;
    h.visible = false;
    h.frustumCulled = false;
    o.add(h);
    hulls.push(h);
  }
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
      for (const h of hulls) h.visible = v;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
      for (const h of hulls) (h.removeFromParent(), h.geometry.dispose());
      hullMat.dispose();
    },
  };
}

// the right flipper's tip: the far end of the flipper mesh, as an object riding the flipper
export function flipperTip(rear) {
  let flip = null;
  for (const c of rear.children) if (c.isGroup && c.scale.x < 0 && c.children[0]?.isGroup) flip = c.children[0];
  const mesh = flip?.children.find((o) => o.isMesh);
  if (!mesh) return null;
  const p = mesh.geometry.attributes.position;
  const v = new Vector3();
  const best = new Vector3();
  let bd = -1;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.lengthSq();
    if (d > bd) (bd = d, best.copy(v));
  }
  const tip = new Object3D();
  tip.position.copy(best);
  flip.add(tip);
  return { tip, dispose: () => tip.removeFromParent() };
}
