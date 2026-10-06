// BUILD for p-caustic (DIRECTION). Assembles the three layers; timeline, cues and camera come from scene.js via the framework.
// Direction-level light: engine.sun is the Limbo moon (up-left of the war); the light shafts hold while Limbo holds
// and drop once the war shatters (cue "shatter" starts at 6.6), so the daylight island carries no moon shafts.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

export default function build(ctx) {
  const out = composeLayers(ctx, { world, cast, fx });
  const { THREE, engine } = ctx;
  const sun = new THREE.Vector3(-30, 14, -118).normalize().multiplyScalar(100);
  const prev = engine?.sun ?? null;
  const base = out.update.bind(out);
  out.update = (t, dt, cue) => {
    try { if (engine) engine.sun = cue.done("shatter") ? prev : sun; } catch { /* hint only */ }
    base(t, dt, cue);
  };
  const baseDispose = out.dispose.bind(out);
  out.dispose = () => { try { if (engine) engine.sun = prev; } catch { /* ignore */ } baseDispose(); };
  return out;
}
