'use client';

import { useEffect, useMemo, useRef } from "react";
import { Howl, Howler } from "howler";

export default function SfxLayer() {
  const unlocked = useRef(false);
  const sounds = useMemo(
    () => ({
      hover: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.08,
        rate: 1.65,
      }),
      click: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.18,
        rate: 0.92,
      }),
      drag: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.11,
        rate: 0.72,
      }),
      flip: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.24,
        rate: 1.08,
      }),
    }),
    [],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const unlock = () => {
      unlocked.current = true;
      Howler.volume(reducedMotion ? 0.45 : 0.7);
    };

    const play = (name) => {
      if (!unlocked.current) return;
      const sound = sounds[name] || sounds.click;
      if (!sound.playing()) sound.play();
    };

    const closestSoundTarget = (event) =>
      event.target instanceof Element ? event.target.closest("[data-sfx]") : null;

    const onPointerEnter = (event) => {
      const target = closestSoundTarget(event);
      if (!target) return;
      play(target.dataset.sfxHover || "hover");
    };

    const onPointerDown = (event) => {
      unlock();
      const target = closestSoundTarget(event);
      if (!target) return;
      if (target.dataset.sfxDown) play(target.dataset.sfxDown);
    };

    const onPointerUp = (event) => {
      const target = closestSoundTarget(event);
      if (!target) return;
      if (target.dataset.dragging === "true") play(target.dataset.sfxDrag || "drag");
    };

    const onClick = (event) => {
      unlock();
      const target = closestSoundTarget(event);
      if (!target) return;
      play(target.dataset.sfxClick || target.dataset.sfx || "click");
    };

    const onDoubleClick = (event) => {
      unlock();
      const target = closestSoundTarget(event);
      if (!target) return;
      play(target.dataset.sfxDbl || "flip");
    };

    document.addEventListener("pointerenter", onPointerEnter, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("dblclick", onDoubleClick, true);

    return () => {
      document.removeEventListener("pointerenter", onPointerEnter, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("dblclick", onDoubleClick, true);
      Object.values(sounds).forEach((sound) => sound.unload());
    };
  }, [sounds]);

  return null;
}
