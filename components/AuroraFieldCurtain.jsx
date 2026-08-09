"use client";

/**
 * Site-wide auroral emission veil: the canvas half.
 *
 * Loaded only through components/AuroraFieldVeil.jsx, which dynamic-imports it
 * behind an error boundary. Nothing should import this file directly -- the
 * whole point of the split is that a failure in here (a shader that will not
 * compile, a WebGL context that will not allocate, a module that will not
 * parse) resolves to a rejected import rather than to a broken root layout.
 *
 * THIS IS THE HALF THAT DOES NOT HAVE A WORLD TO STAND IN.
 *
 * On the 3D route the curtain hangs on a real sky shell inside the world's own
 * scene, where the depth buffer lets the mountains occlude it -- see
 * components/AuroraSkyShell.jsx for why a CSS-composited overlay could never do
 * that. AuroraFieldVeil stands this canvas down whenever that shell is present,
 * so the two never run at once and the site never pays for two contexts.
 *
 * What is left for this file is every route with no world in it: the project
 * index, the archive, the admin page. Nothing there has geometry to be occluded
 * by, so a fullscreen quad composited with mix-blend-mode: screen is not a
 * compromise, it is the whole correct answer -- auroral emission adds light and
 * never removes it, and there is nothing for it to add light in front of.
 *
 * The field itself, the GLSL, and the derivation live in lib/aurora-field.js
 * and docs/research/aurora-field-math.md. The tick, the upload and the frozen
 * pose are shared with the in-scene shell and live in AuroraCurtainDriver.jsx.
 * This file is only the screen-space mount.
 *
 * What runs where, and why the split is not arbitrary:
 *
 *   CPU, at tickHz     one Strang split-step of the ENVELOPE on an nx*ny grid,
 *                      then a pack into (Re, Im, n, q). Measured cost per tick
 *                      is in section 9 of the maths document.
 *   GPU, every frame   one fullscreen pass, one texture tap. The carrier -- the
 *                      ray fringes, the fastest-moving thing on screen -- is
 *                      analytic and evaluated per pixel, so it is continuous
 *                      between ticks and is not limited by the grid.
 *
 * That is why a 15 Hz field does not look like a 15 Hz animation.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AURORA_FRAGMENT_SHADER, AURORA_TIERS, AURORA_VERTEX_SHADER } from "../lib/aurora-field";
import { resolveTier, useAuroraCurtain } from "./AuroraCurtainDriver";

function Curtain({ onTierProbe, reducedMotion, tier }) {
  const invalidate = useThree((state) => state.invalidate);
  const { advance, uniforms } = useAuroraCurtain({ reducedMotion, tier });
  const probeTimer = useRef(0);

  useFrame(({ gl }, delta) => {
    // The world's quality ladder can step down mid-session. Follow it, but not
    // every frame: this is a DOM read and the answer changes twice a session.
    probeTimer.current += delta;
    if (probeTimer.current > 4) {
      probeTimer.current = 0;
      onTierProbe(resolveTier());
    }

    const state = advance(delta);
    if (state === "held") return;
    if (state === "posing") invalidate();
    if (state === "settled") {
      // This canvas exists only to carry the curtain, so once the pose is
      // composed there is nothing left for its loop to do. The in-scene shell
      // must not take this branch -- that loop is the world's.
      gl.setAnimationLoop(null);
      invalidate();
    }
  });

  return (
    <mesh frustumCulled={false} name="AuroraFieldCurtain">
      <planeGeometry args={[2, 2, 1, 1]} />
      <shaderMaterial
        depthTest={false}
        depthWrite={false}
        fragmentShader={AURORA_FRAGMENT_SHADER}
        // The shader writes premultiplied rgb so the core term can be added
        // outside the alpha ceiling. With NormalBlending this asks three for
        // ONE / ONE_MINUS_SRC_ALPHA instead of SRC_ALPHA / ONE_MINUS_SRC_ALPHA,
        // which leaves the body of the curtain algebraically unchanged and
        // makes the core arrive at all. Without it every fragment is
        // multiplied by alpha twice and the veil renders at 0.4 of itself.
        premultipliedAlpha
        transparent
        uniforms={uniforms}
        vertexShader={AURORA_VERTEX_SHADER}
      />
    </mesh>
  );
}

/**
 * One-shot capability probe, released the way this repo's lifecycle contract
 * requires: lose the context explicitly and zero the backing store, so a
 * machine that cannot run the veil is not left holding a dead context for it.
 */
function canRenderVeil() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  const supported = Boolean(gl);
  if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  canvas.width = 0;
  canvas.height = 0;
  return supported;
}

export default function AuroraFieldCurtain() {
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState("medium");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!canRenderVeil()) return;
    setReducedMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true);
    setTier(resolveTier());
    setReady(true);
  }, []);

  if (!ready) return null;

  const profile = AURORA_TIERS[tier] ?? AURORA_TIERS.medium;

  return (
    <div aria-hidden="true" className="aurora-field-veil" data-aurora-tier={tier}>
      <Canvas
        dpr={profile.dpr}
        // R3F's container div hard-codes pointerEvents: "auto" in its inline
        // style, which beats pointer-events: none inherited from the wrapper.
        // Without this the veil is a transparent sheet over the entire document
        // that swallows every click on the site -- including ENTER THE WORLD.
        // Caught by verification/aurora-shots.mjs doing a real Playwright
        // click instead of an element.click() that bypasses hit-testing.
        style={{ pointerEvents: "none" }}
        // Always, in both cases: reduced motion needs frames to compose its
        // pose and then stops the loop itself from inside useFrame, which is
        // the only place that knows the pose is finished.
        frameloop="always"
        gl={{
          alpha: true,
          antialias: false,
          depth: false,
          powerPreference: "low-power",
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.domElement.dataset.auroraTier = tier;
          // No tone mapping and no sRGB conversion beyond the default: the
          // emission colours are CIE-derived linear sRGB and a second curve on
          // top of them would rotate the hue the spectral lines produced.
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <Curtain onTierProbe={setTier} reducedMotion={reducedMotion} tier={tier} />
      </Canvas>
    </div>
  );
}
