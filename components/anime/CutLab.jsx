"use client";
// The cutscene lab through the registry:   /lab/anime?cut=<dock>&t=<s>[&paused][&tier=0..4]. One dock that fails to compile breaks
// this page for every dock; the per-dock routes under /lab/cut/<dock> (scripts/lab-routes.mjs) do not share that fate.
import { useMemo } from "react";
import CutCore from "./CutCore.jsx";

export default function CutLab({ id }) {
  const load = useMemo(() => async () => {
    const reg = await import("../../lib/anime/cutscenes/index.js");
    return { ...(await reg.loadCut(id)), docks: reg.DOCKS };
  }, [id]);
  return <CutCore id={id} load={load} />;
}
