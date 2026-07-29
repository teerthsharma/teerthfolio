"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";

/**
 * AURORA_UNIFIER_PROFILE — persistent sky glue above the horizon: slow aurora
 * ribbons polar-angle tinted mint-to-violet exactly like the black-hole
 * horizon ring, plus faint junni guide threads that lean toward the active
 * station azimuth with station-accent glints at their nodes.
 * Scene mount passes no dock-progress signal, so uDockProgress is
 * approximated from the active station proximity envelope (far -> dock), and
 * uStationAzimuth is the traveler-relative bearing of the active station
 * (the shell follows the traveler like a skybox, so bearings stay honest).
 */
const AURORA_UNIFIER_PROFILE =
  "aurora-unifier sky glue / mint-to-violet horizon ring / junni guide threads toward active station azimuth";

// The world camera sits low and looks near-horizontally, so the sky the player
// actually sees is a strip just above the remote ridge line. A 24-high shell put
// every curtain off the top of the frame — measured, the visible band was only
// elevation 0..0.14 at spawn. The shell now spans world y 2..10 so the whole
// 0..1 elevation range lands inside frame and the curtains hang over the ridge.
const AURORA_SHELL_RADIUS = 30;
const AURORA_SHELL_HEIGHT = 8;
const AURORA_SHELL_CENTER_Y = 6;
// SHADER LAW 1: the aurora is weather on ONE END of the sky, not a dome-wide
// light show. Fixed world bearing (the shell only translates with the traveler,
// it never rotates) so the curtains stay a compass landmark you can turn away
// from. Half-width 0.79rad -> a ~90 degree sector; the rest of the sky is clean.
// -1.12rad is polarSkyAnchor's 0.45rad aurora bearing converted from that
// shader's atan(x, -z) convention into this one's atan(z, x) (offset -PI/2), so
// this near shell lands exactly on the sky anchor's sector instead of fighting
// it. The shared sky owns the always-on curtains; this shell is the closer,
// brighter accent that only exists while the traveler is exploring.
const AURORA_SECTOR_CENTER = -1.12;
const AURORA_SECTOR_HALF_WIDTH = 0.62;
const AURORA_REDUCED_MOTION_TIME_PIN = 12.0;
const AURORA_FALLBACK_ACCENT = "#5CC9C2";
const TWO_PI = Math.PI * 2;

const AURORA_VERTEX_SHADER = /* glsl */ `
varying vec3 vLocal;

void main() {
  vLocal = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const AURORA_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float uWorldTime;
uniform float uDockProgress;
uniform float uStationAzimuth;
uniform float uQualityTier;
uniform float uReducedMotion;
uniform vec3 uStationAccent;

varying vec3 vLocal;

// shared polar noise fingerprint (suite contract, verbatim)
float pn_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pn_noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pn_hash(i), pn_hash(i + vec2(1.0, 0.0)), f.x),
             mix(pn_hash(i + vec2(0.0, 1.0)), pn_hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float pn_fbm(vec2 p){
  int octaveCap = uQualityTier < 0.5 ? 2 : 4;
  float a = 0.5; float v = 0.0;
  for (int i = 0; i < 4; i++){
    if (i >= octaveCap) break;
    v += a * pn_noise(p); p *= 2.03; a *= 0.5;
  }
  return v;
}

void main() {
  float elevation = clamp(vLocal.y / ${AURORA_SHELL_HEIGHT.toFixed(1)} + 0.5, 0.0, 1.0);
  float azimuth = atan(vLocal.z, vLocal.x + 0.0001);

  // aurora identity anchors shared with the black-hole horizon ring
  vec3 auroraMint = vec3(0.4353, 0.9059, 0.7843);
  vec3 auroraViolet = vec3(0.5529, 0.4118, 0.8392);
  vec3 deepCore = vec3(0.0471, 0.0667, 0.1333);
  float horizonPhase = azimuth + uWorldTime * 0.12;
  vec3 horizonTint = mix(auroraMint, auroraViolet, 0.5 + 0.5 * sin(horizonPhase));

  float edgeFade = smoothstep(0.04, 0.12, elevation) * (1.0 - smoothstep(0.8, 0.97, elevation));

  // One-end sector window. Flat-topped (4th power) so the middle of the sector
  // is a solid curtain wall and both flanks fade out well before wrapping.
  float sectorDelta = azimuth - (${AURORA_SECTOR_CENTER.toFixed(2)});
  sectorDelta = atan(sin(sectorDelta), cos(sectorDelta));
  float sectorPhase = sectorDelta / ${AURORA_SECTOR_HALF_WIDTH.toFixed(2)};
  float sector = exp(-pow(abs(sectorPhase), 4.0) * 1.6);

  // Vertical curtains, not horizontal bands: the visible sky is a thin strip
  // above the ridge, so the aurora has to hang DOWN into it — dense near the
  // curtain foot, thinning toward the zenith, striated across azimuth. Each
  // layer drifts at its own slow rate, which is the whole motion budget out here.
  float ribbonCount = uQualityTier < 0.5 ? 1.0 : (uQualityTier < 1.5 ? 2.0 : 3.0);
  float alpha = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    if (float(i) >= ribbonCount) break;
    float fi = float(i);
    float layerAzimuth = azimuth * (7.0 + fi * 4.5) + uWorldTime * (0.05 + fi * 0.022) + fi * 4.7;
    float fold = pn_fbm(vec2(layerAzimuth, elevation * 0.85 + uWorldTime * 0.018 + fi * 2.3));
    fold = smoothstep(0.40, 0.80, fold);
    float footFade = smoothstep(0.03, 0.24 + fi * 0.06, elevation);
    float riseFade = 1.0 - smoothstep(0.30 + fi * 0.18, 0.98, elevation);
    float weight = (0.92 - fi * 0.2) * (uQualityTier < 0.5 ? 0.72 : 1.0);
    float ribbonAlpha = fold * footFade * riseFade * weight * sector;
    vec3 ribbonTint = mix(auroraMint, auroraViolet, 0.5 + 0.5 * sin(horizonPhase + fi * 2.1));
    col += mix(ribbonTint, deepCore, 0.1) * ribbonAlpha;
    alpha += ribbonAlpha;
  }

  // junni guide threads: the sky leans toward the active station azimuth
  if (uQualityTier > 0.5) {
    float deltaAz = azimuth - uStationAzimuth;
    deltaAz = atan(sin(deltaAz), cos(deltaAz));
    float guideWindow = exp(-deltaAz * deltaAz * 1.35);
    vec2 threadSpace = vec2(deltaAz * 2.0, elevation * 3.2 + 3.0);
    vec2 cell = floor(threadSpace);
    vec2 local = fract(threadSpace) - 0.5;
    vec2 node = vec2(pn_hash(cell) - 0.5, pn_hash(cell + 7.7) - 0.5) * 0.58;
    vec2 q = local - node;
    float leanSign = deltaAz >= 0.0 ? -1.0 : 1.0;
    vec2 lean = normalize(vec2(leanSign * (0.28 + min(abs(deltaAz), 1.6) * 0.62), 0.55));
    float across = abs(dot(q, vec2(-lean.y, lean.x)));
    float along = dot(q, lean);
    float threadSegment = smoothstep(0.5, 0.08, abs(along));
    float thread = exp(-across * across * 220.0) * threadSegment;
    float glintPulse = mix(0.55 + 0.45 * sin(uWorldTime * 1.7 + pn_hash(cell) * 6.2831), 0.8, uReducedMotion);
    float glint = exp(-dot(q, q) * 80.0) * glintPulse;
    float threadStrength = uQualityTier > 1.5 ? 1.0 : 0.62;
    // Threads are navigation, not decoration: kept faint so the sky outside the
    // aurora sector still reads as clean open air.
    float threadAlpha = thread * 0.26 * guideWindow * threadStrength;
    float glintAlpha = glint * 0.34 * guideWindow * threadStrength;
    col += mix(horizonTint, uStationAccent, 0.4) * threadAlpha;
    col += uStationAccent * glintAlpha;
    alpha += threadAlpha + glintAlpha;
  }

  col /= max(alpha, 0.001);

  // dim while the assembly veil sweep window is live (suite clause)
  float veilWindow = smoothstep(0.05, 0.15, uDockProgress) * (1.0 - smoothstep(0.5, 0.6, uDockProgress));
  alpha *= mix(1.0, 0.4, veilWindow);

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.66) * edgeFade);
}
`;

function shortestArc(from, to) {
  let arc = (to - from) % TWO_PI;
  if (arc > Math.PI) arc -= TWO_PI;
  if (arc < -Math.PI) arc += TWO_PI;
  return arc;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function qualityTierValue(quality) {
  return quality === "low" ? 0 : quality === "medium" ? 1 : 2;
}

function makeManifoldCurve(start, end, index) {
  const startPoint = new THREE.Vector3(start.center.x, 0.3, start.center.z);
  const endPoint = new THREE.Vector3(end.center.x, 0.3, end.center.z);
  const midpoint = startPoint.clone().lerp(endPoint, 0.5);
  midpoint.y += 0.56 + (index % 3) * 0.16;
  midpoint.z += Math.sin(index * 1.7) * 0.28;

  return new THREE.CatmullRomCurve3([startPoint, midpoint, endPoint]).getPoints(42);
}

function bettiWeight(artifact) {
  const digits = artifact.betti.match(/\d+/g)?.map(Number) || [1, 0, 0];
  return Math.max(1, digits.reduce((sum, value) => sum + value, 0));
}

export default function TopologyConstellation({
  activeArtifact,
  artifacts,
  axisX = 0,
  depthZ = 0,
  quality = "high",
  reducedMotion = false,
  showLabels = false,
}) {
  const root = useRef(null);
  const auroraMeshRef = useRef(null);
  const auroraAccentRef = useRef("");
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  const artifactById = useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts],
  );
  const links = useMemo(
    () =>
      STATION_WORLD_SCHEMA.edges.map((edge, index) => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        accent: artifactById.get(edge.to)?.accent || "#5CC9C2",
        points: makeManifoldCurve(
          STATION_WORLD_SCHEMA.stations[edge.from],
          STATION_WORLD_SCHEMA.stations[edge.to],
          index,
        ),
      })),
    [artifactById],
  );
  const visibleArtifacts = useMemo(() => {
    const ranked = artifacts
      .map((artifact) => {
        const station = STATION_WORLD_SCHEMA.stations[artifact.id];
        return {
          artifact,
          distance: Math.hypot(axisX - station.center.x, depthZ - station.center.z),
        };
      })
      .sort((left, right) => left.distance - right.distance);
    const nearest = ranked[0];
    const active = ranked.find((entry) => entry.artifact.id === activeId);
    if (active && nearest && active.artifact.id !== nearest.artifact.id && active.distance <= 14) {
      return [nearest, active];
    }
    return ranked.slice(0, 2);
  }, [activeId, artifacts, axisX, depthZ]);
  const visibleIds = useMemo(
    () => new Set(visibleArtifacts.map(({ artifact }) => artifact.id)),
    [visibleArtifacts],
  );

  const auroraMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        blending: THREE.NormalBlending,
        depthWrite: false,
        fragmentShader: AURORA_FRAGMENT_SHADER,
        side: THREE.BackSide,
        transparent: true,
        uniforms: {
          uDockProgress: { value: 0 },
          uQualityTier: { value: 2 },
          uReducedMotion: { value: 0 },
          uStationAccent: { value: new THREE.Color(AURORA_FALLBACK_ACCENT) },
          uStationAzimuth: { value: 0 },
          uWorldTime: { value: 0 },
        },
        vertexShader: AURORA_VERTEX_SHADER,
      }),
    [],
  );
  useEffect(() => () => auroraMaterial.dispose(), [auroraMaterial]);

  const auroraGeometry = useMemo(() => {
    const radialSegments = quality === "low" ? 48 : quality === "medium" ? 72 : 110;
    return new THREE.CylinderGeometry(
      AURORA_SHELL_RADIUS,
      AURORA_SHELL_RADIUS,
      AURORA_SHELL_HEIGHT,
      radialSegments,
      1,
      true,
    );
  }, [quality]);
  useEffect(() => () => auroraGeometry.dispose(), [auroraGeometry]);

  useFrame(({ clock }, delta) => {
    const uniforms = auroraMaterial.uniforms;
    const station = STATION_WORLD_SCHEMA.stations[activeId];
    if (uniforms && station) {
      // sky shell follows the traveler like a skybox so ribbons keep a
      // constant apparent altitude; azimuths become seal-relative bearings
      const shell = auroraMeshRef.current;
      if (shell) {
        const settled = shell.userData.followSettled;
        const shellFollow =
          reducedMotion || !settled ? 1 : 1 - Math.exp(-delta * 1.6);
        shell.userData.followSettled = true;
        shell.position.x += (axisX - shell.position.x) * shellFollow;
        shell.position.z += (depthZ - shell.position.z) * shellFollow;
      }
      const targetAzimuth = Math.atan2(
        station.center.z - depthZ,
        station.center.x - axisX,
      );
      const stationDistance = Math.hypot(
        axisX - station.center.x,
        depthZ - station.center.z,
      );
      const proximity = station.proximity;
      const targetDock = clamp01(
        (proximity.far - stationDistance) / Math.max(0.1, proximity.far - proximity.dock),
      );
      uniforms.uWorldTime.value = reducedMotion
        ? AURORA_REDUCED_MOTION_TIME_PIN
        : clock.elapsedTime;
      uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
      uniforms.uQualityTier.value = qualityTierValue(quality);
      if (reducedMotion) {
        uniforms.uStationAzimuth.value = targetAzimuth;
        uniforms.uDockProgress.value = targetDock;
      } else {
        const damping = 1 - Math.exp(-delta * 2.4);
        uniforms.uStationAzimuth.value +=
          shortestArc(uniforms.uStationAzimuth.value, targetAzimuth) * damping;
        uniforms.uDockProgress.value +=
          (targetDock - uniforms.uDockProgress.value) * damping;
      }
      const accent = activeArtifact?.accent || AURORA_FALLBACK_ACCENT;
      if (auroraAccentRef.current !== accent) {
        auroraAccentRef.current = accent;
        uniforms.uStationAccent.value.set(accent);
      }
    }
    if (!root.current) return;
    if (reducedMotion) {
      root.current.rotation.y = 0;
      root.current.position.z = 0;
      return;
    }
    const t = clock.elapsedTime;
    root.current.rotation.y = Math.sin(t * 0.1) * 0.012;
    root.current.position.z = Math.cos(t * 0.16) * 0.035;
  });

  return (
    <group
      ref={root}
      name="TopologyConstellation manifold-profile-field persistent homology Betti"
      userData={{ className: "manifold-profile-field" }}
    >
      <mesh
        frustumCulled={false}
        geometry={auroraGeometry}
        material={auroraMaterial}
        name={`aurora-unifier-sky ${AURORA_UNIFIER_PROFILE}`}
        position={[0, AURORA_SHELL_CENTER_Y, 0]}
        ref={auroraMeshRef}
        renderOrder={-8}
        userData={{ className: "aurora-unifier-sky" }}
      />

      {links.filter((link) => visibleIds.has(link.from) && visibleIds.has(link.to)).map((link) => (
        <Line
          color={link.accent}
          key={link.id}
          lineWidth={quality === "high" ? 1.25 : 0.75}
          opacity={quality === "low" ? 0.1 : 0.18}
          points={link.points}
          transparent
        />
      ))}

      {visibleArtifacts.map(({ artifact }, index) => {
        const active = artifact.id === activeId;
        const station = STATION_WORLD_SCHEMA.stations[artifact.id];
        const distance = Math.hypot(
          axisX - station.center.x,
          depthZ - station.center.z,
        );
        const opacity = active ? 0.68 : Math.max(0.08, 0.28 - distance * 0.026);
        const weight = bettiWeight(artifact);

        return (
          <group
            key={artifact.id}
            name={`topology-profile-node ${artifact.id}`}
            position={[station.center.x, artifact.position[1] + 0.18, station.center.z]}
            userData={{ className: "topology-profile-node", topology: artifact.topology }}
          >
            <mesh>
              <icosahedronGeometry args={[active ? 0.08 : 0.052, 1]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.92 : 0.46} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22 + weight * 0.018, 0.004, 6, 72]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={opacity} />
            </mesh>
            <mesh rotation={[Math.PI / 2.45, 0, index * 0.42]}>
              <torusGeometry args={[0.34 + (index % 3) * 0.035, 0.003, 6, 72]} />
              <meshBasicMaterial color="#A8F0E8" transparent opacity={active ? 0.22 : 0.08} />
            </mesh>
            {showLabels && active && quality !== "low" && (
              <Html
                center
                className="manifold-profile-field topology-profile-node"
                distanceFactor={2}
                position={[0, 0.34, 0]}
                transform
              >
                <span>persistent homology</span>
                <strong>{artifact.handle}</strong>
                <small>
                  {artifact.betti} / {artifact.topology}
                </small>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
