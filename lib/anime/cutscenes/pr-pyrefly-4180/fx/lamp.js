// LAMP AND TRANSMISSION (bible FX 1). Additive back-lamp halo behind the fox, die-off over 24 frames.
// Maths: I(t) = rise(1.21..2.29) * (1 + 0.04 sin(2.03 t)) * (1 - smooth((t - tDie)/1.0)); glow alpha = A * I.
// Halo is a camera-facing sprite (depth tested: the opaque seal always occludes it, so it never milks the seal).
// Transmission shafts: 5 long additive gradient quads fanning from the lamp, flickering.
import { glowTex, spriteMat, addMat, ph, sm, startOf, disposeTree } from "./util.js";

export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group();
  const gl = glowTex(THREE, 1.8);
  const lampP = S.F.clone().addScaledVector(S.toSeal, -9).add(new THREE.Vector3(0, 7, 0));
  const halo = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xffb04a, opacity: 0 })); halo.scale.setScalar(46); halo.position.copy(lampP);
  const core = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xfff6dc, opacity: 0 })); core.scale.setScalar(15); core.position.copy(lampP);
  g.add(halo, core);
  const gc = document.createElement("canvas"); gc.width = 8; gc.height = 128; const x = gc.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,200,120,0.55)"); gr.addColorStop(1, "rgba(255,200,120,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 8, 128); const st = new THREE.CanvasTexture(gc);
  const shafts = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6 + i * 0.7, 40), addMat(THREE, { map: st, opacity: 0, side: THREE.DoubleSide }));
    m.position.copy(lampP).addScaledVector(S.toSeal, 14).add(new THREE.Vector3((i - 2) * 6, -9, 0));
    m.rotation.z = (i - 2) * 0.12; m.userData.i = i; g.add(m); shafts.push(m);
  }
  return {
    group: g,
    update(t, dt, cue) {
      const die = startOf(cue, "lamp_die", ctx.scene.duration - 4.2);
      const I = sm(ph(t, 1.21, 2.29)) * (1 - sm(ph(t, die, die + 1))) * (1 + 0.04 * Math.sin(t * 2.03));
      halo.material.opacity = 0.42 * I; core.material.opacity = 0.3 * I;
      for (const m of shafts) m.material.opacity = 0.16 * I * (0.8 + 0.2 * Math.sin(t * 7 + m.userData.i * 2.1));
    },
    dispose() { gl.dispose(); st.dispose(); disposeTree(g); },
  };
}
