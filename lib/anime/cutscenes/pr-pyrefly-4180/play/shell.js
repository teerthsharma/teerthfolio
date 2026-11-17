// ported from components/world/cutscene/moves/pr-pyrefly-4180.jsx: skyShell (lines 76 to 102) and the stage shell (lines 398 to 407)
import { Mesh, Vector3 } from "three";
import { SHELL, smooth } from "../clock.js";
import { skyShell } from "../live/sky.js";
import { tone } from "../tone.js";

export const CENTRE = new Vector3(0, 0.9, 0);

export function buildShell() {
  const { g, m } = skyShell();
  tone(m);
  const mesh = new Mesh(g, m);
  mesh.position.copy(CENTRE);
  mesh.renderOrder = -3;
  mesh.frustumCulled = false;
  mesh.visible = false;
  const update = (tr, camPos, centre) => {
    const r = SHELL.radius * smooth(SHELL.bloom[0], SHELL.bloom[1], tr) * (1 - smooth(SHELL.collapse[0], SHELL.collapse[1], tr));
    const inside = r > camPos.distanceTo(centre) + 0.3;
    mesh.scale.setScalar(inside ? SHELL.inside : Math.max(r, 0.02));
    m.uniforms.uInside.value = inside ? 1 : 0;
    m.uniforms.uCore.value.copy(centre);
    mesh.visible = r > 0.02 && tr <= SHELL.collapse[1];
    return inside;
  };
  return { mesh, update, dispose: () => (g.dispose(), m.dispose()) };
}
