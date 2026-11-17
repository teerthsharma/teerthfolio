// The void's glass floor: a kit mirror under the live ripple disc (995cc0c glassFloor).
import { AdditiveBlending, CircleGeometry, Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { makeMirror } from "../../../kit/fx/mirror.js";
import { BACK, HIT } from "../clock.js";

const RIPPLE_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }`;
const RIPPLE_FRAG = /* glsl */ `
  uniform float uTime, uFade, uLock;
  uniform vec3 uCenter;
  varying vec3 vWorld;
  float sq(float x) { return x * x; }
  void main() {
    float dc = length(vWorld.xz - uCenter.xz);
    // thin concentric ripples round the pup, like a still glass struck once
    float rip = exp(-sq((fract(dc * 0.55 - uTime * 0.05) - 0.5) * 9.0)) * exp(-dc * 0.09) * 0.07;
    vec3 col = pow(vec3(0.7, 0.55, 1.0), vec3(2.2)) * rip * (1.0 + uLock) * uFade;
    gl_FragColor = vec4(col * (1.0 - smoothstep(34.0, 80.0, dc)), 1.0);
  }`;

export function buildFloor(ctx) {
  const group = new Group();
  const mirror = makeMirror(ctx.engine, {
    y: 0.002, at: [0, 0], size: 180, base: "#050310", gain: 0.55, tint: "#b38cff", tintAmt: 0.35, ripple: 0,
    fade: 1, fadeDist: [34, 80], res: 0.5, fps: 12,
  });
  group.add(mirror.group);
  const mat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uLock: { value: 0 }, uCenter: { value: new Vector3() } },
    vertexShader: RIPPLE_VERT,
    fragmentShader: RIPPLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const disc = new Mesh(new CircleGeometry(90, 72).rotateX(-Math.PI / 2), mat);
  disc.position.y = 0.004;
  disc.renderOrder = -1;
  disc.frustumCulled = false;
  group.add(disc);
  const c = new Vector3();
  return {
    group,
    mirror,
    update(t, flow, lock, fade) {
      group.visible = t >= HIT.impact && t < BACK;
      if (!group.visible) return;
      mirror.update(t);
      group.getWorldPosition(c);
      mat.uniforms.uTime.value = flow;
      mat.uniforms.uLock.value = lock;
      mat.uniforms.uFade.value = fade;
      mat.uniforms.uCenter.value.copy(c);
    },
    dispose() {
      mirror.dispose();
      disc.geometry.dispose();
      mat.dispose();
    },
  };
}
