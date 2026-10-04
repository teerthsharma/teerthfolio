// Client-only: palette.js is also imported by the server-rendered OG image,
// so the R3F hook that hands glossy materials the scene environment lives here.
import { useFrame } from "@react-three/fiber";
import { LIGHT } from "./palette";

export function useReflect(k, ...materials) {
  useFrame(({ scene }) => {
    const env = scene.environment;
    if (!env) return;
    for (const m of materials) {
      if (m.envMap === env) continue;
      m.envMap = env;
      m.envMapIntensity = LIGHT.env * k;
      m.needsUpdate = true;
    }
  });
}
