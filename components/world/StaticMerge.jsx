"use client";

// Drives lib/world/merge.js: waits for the world to stand still after the
// curtain lifts, bakes the static meshes into a few chunks, then each frame
// decides whether the chunks or the originals are on show (see merge.js).
// OPT-IN (?merge): measured at the follow camera it saves no draws (the
// frustum already culls the originals to ~30 plain meshes; ~110 of the ~148 visible draws are
// instanced), so it ships off. It helps only views that see the whole island.

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { buildChunks, candidates, moved } from "../../lib/world/merge";
import { getUi, live } from "../../lib/world/store";

const AFTER_READY_S = 4; // the world's late mounts and first compiles settle
const WINDOW_S = 1.5; // the two snapshots this far apart decide what is static
const ours = (o) => o.name === "cutscene" || o.name === "seal" || o.name === "static-merge";

export default function StaticMerge() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const st = useRef({ phase: "wait", t: 0, first: null, built: null, on: null, tops: null, off: typeof window === "undefined" || !/[?&]merge\b/.test(window.location.search) });

  useFrame((_, dt) => {
    const s = st.current;
    if (s.off) return;
    const stage = Boolean(getUi().cutscene || live.arrival.id || live.stageOn);
    if (s.phase === "wait") {
      if (!getUi().ready || stage) return void (s.t = 0);
      s.t += dt;
      if (s.t > AFTER_READY_S) {
        s.first = candidates(scene, ours);
        s.t = 0;
        s.phase = "window";
      }
    } else if (s.phase === "window") {
      if (stage) {
        s.phase = "wait";
        s.t = 0;
        return;
      }
      s.t += dt;
      if (s.t < WINDOW_S) return;
      s.phase = "build";
      const built = buildChunks(s.first, candidates(scene, ours));
      s.first = null;
      s.built = built;
      // compile the chunk programs off-screen (layer 31 is never drawn) before they are shown
      built.group.layers.set(31);
      built.group.traverse((o) => o.layers.set(31));
      scene.add(built.group);
      s.tops = new Map(scene.children.filter((c) => !ours(c) && c.children.length).map((c) => [c, c.visible]));
      const done = () => {
        built.group.layers.set(0);
        built.group.traverse((o) => o.layers.set(0));
        s.phase = "run";
        window.__world = { ...(window.__world || {}), merge: { chunks: built.chunks.length, sources: built.sources, dead: 0 } };
      };
      (gl.compileAsync ? gl.compileAsync(built.group, camera, scene) : Promise.resolve()).then(done, done);
    } else if (s.phase === "run") {
      const { chunks, group } = s.built;
      let world = !stage;
      if (world) for (const [c, v] of s.tops) if (v && !c.visible) { world = false; break; }
      let dead = 0;
      for (const c of chunks) {
        if (!c.dead && world && c.sources.some(moved)) c.dead = true; // something moved: this chunk is originals for good
        if (c.dead) dead++;
      }
      group.visible = world;
      if (s.on !== world || dead !== (window.__world?.merge?.dead ?? 0)) {
        s.on = world;
        for (const c of chunks) {
          const showChunk = world && !c.dead;
          c.mesh.visible = showChunk;
          for (const src of c.sources) src.mesh.visible = !showChunk;
        }
        if (window.__world?.merge) window.__world.merge.dead = dead;
      }
    }
  }, -5);
  return null;
}
