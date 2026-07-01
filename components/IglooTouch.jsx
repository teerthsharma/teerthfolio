"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export default function IglooTouch({ onTouchIgloo }) {
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const touchedIgloo = hits.some((hit) => {
        let node = hit.object;
        while (node) {
          const className = node.userData?.className;
          if (className === "ice-block" || className === "igloo-dome") return true;
          node = node.parent;
        }
        return false;
      });
      if (touchedIgloo) onTouchIgloo?.();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    return () => canvas.removeEventListener("pointerdown", onPointerDown);
  }, [camera, gl, onTouchIgloo, pointer, raycaster, scene]);

  return null;
}
