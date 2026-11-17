// The fullscreen pass shared by every render/ module: one triangle, one camera, no depth.
import { BufferAttribute, BufferGeometry, Mesh, OrthographicCamera, Scene, ShaderMaterial } from "three";

export const QUAD_V = "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }";

export class Quad {
  constructor(renderer) {
    this.r = renderer;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new Mesh(geo);
    this.mesh.frustumCulled = false;
    this.scene = new Scene().add(this.mesh);
    this.cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  material(fragmentShader, uniforms, o = {}) {
    return new ShaderMaterial({ vertexShader: QUAD_V, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...o });
  }
  // target: a WebGLRenderTarget, or null for the canvas
  draw(material, target = null) {
    this.mesh.material = material;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }
}
