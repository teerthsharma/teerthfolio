"use client";

/**
 * Fail-soft mount for the aurora field.
 *
 * This is the only thing app/layout.jsx imports, and layout.jsx is the ROOT
 * layout, so anything that can throw from here takes down every route on the
 * site rather than degrading one component. That is not a hypothetical: a
 * stray backtick inside the GLSL template literal in lib/aurora-field.js
 * terminated the string early, the JS parser fell out of the shader and into
 * GLSL, and the whole portfolio served a blank document until it was fixed.
 *
 * A background shader is decoration. Decoration must never be able to take the
 * portfolio with it. So the canvas is loaded across two barriers:
 *
 *   dynamic(..., { ssr: false })  a parse or evaluation failure in the field
 *                                 module, or in three, or in R3F, becomes a
 *                                 rejected chunk load instead of a build error
 *                                 in the root layout. Also keeps the whole
 *                                 thing out of the server bundle and off the
 *                                 critical path.
 *   error boundary                a shader that will not compile, a WebGL
 *                                 context that will not allocate, or a throw
 *                                 inside useFrame renders null and the site
 *                                 carries on without a background.
 *
 * The boundary is deliberately silent past one console warning. A visitor who
 * cannot have an aurora should get a portfolio, not a message about a shader.
 */

import dynamic from "next/dynamic";
import { Component, useEffect, useState } from "react";

const AuroraFieldCurtain = dynamic(() => import("./AuroraFieldCurtain"), {
  loading: () => null,
  ssr: false,
});

class VeilBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // One line, once. The world's own diagnostics channel is for the world.
    console.warn("aurora field veil disabled:", error?.message ?? error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * True once the 3D world's canvas exists in the document.
 *
 * The world hangs its own aurora on a depth-tested sky shell inside its scene,
 * where the terrain can occlude it. A second copy composited over the top by
 * CSS would draw the same curtain again, over the mountains, which is the exact
 * defect the shell was built to remove -- and it would cost a second WebGL
 * context to do it. So on any route with a world, this canvas stands down.
 *
 * Polled rather than subscribed: the world canvas appears once, early, and a
 * MutationObserver over the whole document for a single one-way transition is
 * more machinery than the question deserves.
 *
 * Undecided until the first look, and nothing is mounted while undecided. A
 * canvas raised and torn down again would be a WebGL context created and lost
 * during world boot, which is the worst moment on the timeline to spend one.
 * A quarter second of no aurora on a route that has no world is a cost nobody
 * can see. The poll continues after the first answer so that a world canvas
 * that arrives late on a slow machine still takes the sky back.
 */
function useWorldOwnsTheSky() {
  const [owned, setOwned] = useState(null);

  useEffect(() => {
    const look = () => setOwned(Boolean(document.querySelector("canvas.igloo-scene-canvas")));
    const timer = window.setInterval(look, 250);
    return () => window.clearInterval(timer);
  }, []);

  return owned;
}

export default function AuroraFieldVeil() {
  const worldOwnsTheSky = useWorldOwnsTheSky();

  // Ablation lever, matching the world's qa flags: ?no-aurora=1 removes the
  // veil entirely so its cost can be measured by difference rather than by
  // subtraction. probe-cpu-frame and probe-stall both take PROBE_QUERY.
  // Read here rather than inside the canvas so the flag also skips the chunk.
  if (typeof window !== "undefined" && window.location.search.includes("no-aurora")) return null;
  if (worldOwnsTheSky !== false) return null;

  return (
    <VeilBoundary>
      <AuroraFieldCurtain />
    </VeilBoundary>
  );
}
