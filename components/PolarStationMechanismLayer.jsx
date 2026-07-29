import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MECHANISM_LAYER_BUDGET,
  buildMechanismSourceContext,
  isMechanismEvidenceReady,
  resolveMechanismLayerSelection,
} from "../lib/polar-station-mechanism-layer";
import { NE_MECHANISM_BUDGET } from "../lib/polar-station-mechanisms";
import { SW_MECHANISM_BUDGET } from "../lib/polar-station-mechanisms-sw";
import PolarStationMechanismsNE from "./PolarStationMechanismsNE";
import PolarStationMechanismsSW from "./PolarStationMechanismsSW";

export const POLAR_STATION_MECHANISM_LAYER_PROFILE =
  "nearest physical family only; deterministic base-silhouette handoff; proof-gated evidence; zero textures";

const FADE_IN_RATE = 14;
const FADE_OUT_RATE = 22;
const HANDOFF_ALPHA_EPSILON = 0.012;
const FAMILY_BUDGETS = Object.freeze({
  northeast: NE_MECHANISM_BUDGET,
  southwest: SW_MECHANISM_BUDGET,
});

function resolveFamilyBudget(family, quality, safeMode = false) {
  if (safeMode || !family) return MECHANISM_LAYER_BUDGET.safe;
  const familyBudget = FAMILY_BUDGETS[family];
  return familyBudget?.[quality] || familyBudget?.medium || MECHANISM_LAYER_BUDGET.safe;
}

function copySelection(target, source) {
  target.distance = source.distance;
  target.family = source.family;
  target.farRadius = source.farRadius;
  target.stationId = source.stationId;
  target.visibility = source.visibility;
  target.withinFarRadius = source.withinFarRadius;
  return target;
}

function clearOutputRefs(mechanismStateRef, ritualStateRef) {
  if (mechanismStateRef) mechanismStateRef.current = null;
  if (ritualStateRef) ritualStateRef.current = null;
}

function writeCanvasMechanismDiagnostics(
  canvas,
  family,
  stationId,
  budget,
  opacity = 0,
) {
  if (!canvas) return;
  const active = family ? 1 : 0;
  const values = {
    mechanismActiveFamilies: String(active),
    mechanismDrawBudget: String(active ? budget.drawCalls : 0),
    mechanismFamily: family || "none",
    mechanismOpacity: String(Number(opacity.toFixed(3))),
    mechanismProgramBudget: String(active ? budget.programs : 0),
    mechanismStation: stationId || "none",
    mechanismTextureBudget: String(active ? budget.textures : 0),
  };
  for (const [key, value] of Object.entries(values)) {
    if (canvas.dataset[key] !== value) canvas.dataset[key] = value;
  }
}

export default function PolarStationMechanismLayer({
  traversalPoseRef,
  activeArtifactId = null,
  exclusiveStationId = null,
  quality = "medium",
  reducedMotion = false,
  safeMode = false,
  visible = true,
  liveSummary = null,
  projects = [],
  mechanismStateRef = null,
  ritualStateRef = null,
  onEvidenceReady = null,
}) {
  const [mountedFamily, setMountedFamily] = useState(null);
  const canvas = useThree((state) => state.gl.domElement);
  const mountedFamilyRef = useRef(null);
  const familyRootRef = useRef(null);
  const materialOpacityRef = useRef([]);
  const selectionRef = useRef({
    distance: Number.POSITIVE_INFINITY,
    family: null,
    farRadius: 0,
    stationId: null,
    visibility: 0,
    withinFarRadius: false,
  });
  const selectionScratchRef = useRef({});
  const handoffRef = useRef({ alpha: 0 });

  const sourceContext = useMemo(
    () => buildMechanismSourceContext(liveSummary, projects),
    [liveSummary, projects],
  );
  const assemblyInspectionRef = useRef(sourceContext.assemblyInspection);
  const topologyEvidenceRef = useRef(sourceContext.topologyEvidence);
  const upstreamMetadataRef = useRef(sourceContext.upstreamMetadata);
  assemblyInspectionRef.current = sourceContext.assemblyInspection;
  topologyEvidenceRef.current = sourceContext.topologyEvidence;
  upstreamMetadataRef.current = sourceContext.upstreamMetadata;

  const layerBudget = safeMode
    ? MECHANISM_LAYER_BUDGET.safe
    : MECHANISM_LAYER_BUDGET[quality] || MECHANISM_LAYER_BUDGET.medium;

  const handleEvidenceReady = useCallback(
    (stationId, state) => {
      if (!isMechanismEvidenceReady(stationId, state, selectionRef.current)) return;
      onEvidenceReady?.(stationId, state);
    },
    [onEvidenceReady],
  );

  useLayoutEffect(() => {
    const root = familyRootRef.current;
    const opacityEntries = [];
    const seen = new Set();
    root?.traverse((object) => {
      if (!object.material) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (!material || seen.has(material)) continue;
        seen.add(material);
        const baseOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
        opacityEntries.push({ baseOpacity, material });
        material.opacity = 0;
      }
    });
    materialOpacityRef.current = opacityEntries;
    if (root) root.scale.setScalar(0.985);
    return () => {
      for (const { baseOpacity, material } of opacityEntries) {
        material.opacity = baseOpacity;
      }
      materialOpacityRef.current = [];
    };
  }, [mountedFamily, quality]);

  useLayoutEffect(() => {
    if (visible && !safeMode) return;
    mountedFamilyRef.current = null;
    handoffRef.current.alpha = 0;
    setMountedFamily(null);
    clearOutputRefs(mechanismStateRef, ritualStateRef);
    writeCanvasMechanismDiagnostics(canvas, null, null, MECHANISM_LAYER_BUDGET.safe);
  }, [canvas, mechanismStateRef, ritualStateRef, safeMode, visible]);

  useFrame((_, delta) => {
    if (!visible || safeMode) {
      writeCanvasMechanismDiagnostics(
        canvas,
        null,
        null,
        MECHANISM_LAYER_BUDGET.safe,
        0,
      );
      return;
    }

    const desired = resolveMechanismLayerSelection(
      traversalPoseRef?.current,
      activeArtifactId,
      {
        exclusiveStationId,
        previousSelection: selectionRef.current,
        safeMode,
        target: selectionScratchRef.current,
        visible,
      },
    );
    copySelection(selectionRef.current, desired);

    const desiredFamily = desired.family;
    const currentFamily = mountedFamilyRef.current;
    const handoff = handoffRef.current;

    if (!currentFamily && desiredFamily) {
      mountedFamilyRef.current = desiredFamily;
      handoff.alpha = 0;
      setMountedFamily(desiredFamily);
      clearOutputRefs(mechanismStateRef, ritualStateRef);
      writeCanvasMechanismDiagnostics(
        canvas,
        desiredFamily,
        desired.stationId,
        resolveFamilyBudget(desiredFamily, quality, safeMode),
        0,
      );
      return;
    }

    const sameFamily = currentFamily === desiredFamily;
    const targetAlpha = sameFamily ? desired.visibility : 0;
    const rate = targetAlpha < handoff.alpha ? FADE_OUT_RATE : FADE_IN_RATE;
    const blend = 1 - Math.exp(-Math.min(Math.max(delta, 0), 0.1) * rate);
    handoff.alpha += (targetAlpha - handoff.alpha) * blend;
    if (Math.abs(targetAlpha - handoff.alpha) < 0.001) handoff.alpha = targetAlpha;

    const root = familyRootRef.current;
    if (root) {
      root.visible = handoff.alpha > 0.002;
      root.scale.setScalar(0.985 + handoff.alpha * 0.015);
    }
    for (const { baseOpacity, material } of materialOpacityRef.current) {
      material.opacity = baseOpacity * handoff.alpha;
    }

    if (
      currentFamily &&
      !sameFamily &&
      // A null desired family keeps the faded-out family mounted (zero draws,
      // zero alpha): its compiled programs survive open roaming, so re-entering
      // the same family never relinks shaders. Only the opposite family taking
      // ownership swaps the mount.
      desiredFamily &&
      handoff.alpha <= HANDOFF_ALPHA_EPSILON
    ) {
      mountedFamilyRef.current = desiredFamily;
      handoff.alpha = 0;
      setMountedFamily(desiredFamily);
      clearOutputRefs(mechanismStateRef, ritualStateRef);
    }
    writeCanvasMechanismDiagnostics(
      canvas,
      mountedFamilyRef.current,
      desired.stationId,
      resolveFamilyBudget(mountedFamilyRef.current, quality, safeMode),
      handoff.alpha,
    );
  });

  if (safeMode || !visible) return null;

  const sharedProps = {
    familyVisibilityRef: handoffRef,
    mechanismStateRef,
    onEvidenceReady: handleEvidenceReady,
    quality,
    reducedMotion,
    ritualStateRef,
    safeMode,
    traversalPoseRef,
    visible: true,
  };

  return (
    <group
      dispose={null}
      name={POLAR_STATION_MECHANISM_LAYER_PROFILE}
      ref={familyRootRef}
      userData={{
        activeFamilies: layerBudget.activeFamilies,
        drawCalls: layerBudget.drawCalls,
        programs: layerBudget.programs,
        textures: layerBudget.textures,
      }}
    >
      {mountedFamily === "northeast" ? (
        <PolarStationMechanismsNE
          {...sharedProps}
          exclusiveStationId={exclusiveStationId}
        />
      ) : mountedFamily === "southwest" ? (
        <PolarStationMechanismsSW
          {...sharedProps}
          exclusiveStationId={exclusiveStationId}
          assemblyInspectionRef={assemblyInspectionRef}
          topologyEvidenceRef={topologyEvidenceRef}
          upstreamMetadataRef={upstreamMetadataRef}
        />
      ) : null}
    </group>
  );
}
