"use client";

import { useEffect } from "react";

// WASD and the arrows belong to the seal while the world owns the viewport, so
// those keys stay guarded. Page keys are page navigation at every scroll offset.
const FORWARD_KEYS = new Set(["d", "w", "arrowright", "arrowdown"]);
const BACK_KEYS = new Set(["a", "s", "arrowleft", "arrowup"]);
const PAGE_FORWARD_KEYS = new Set(["pagedown", " "]);
const PAGE_BACK_KEYS = new Set(["pageup"]);

function isEditableTarget(target) {
  return target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']");
}

function isWorldVisible() {
  const world = document.getElementById("world");
  if (!world) return false;
  const rect = world.getBoundingClientRect();
  return rect.left < window.innerWidth * 0.55 && rect.right > window.innerWidth * 0.45;
}

function horizontalDelta(event) {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return event.deltaX;
  return event.deltaY;
}

function canScrollVertically(target, deltaY) {
  if (!(target instanceof HTMLElement)) return false;
  const scroller = target.closest(".project-list, .repo-tape");
  if (!(scroller instanceof HTMLElement)) return false;
  if (scroller.scrollHeight <= scroller.clientHeight + 1) return false;
  if (deltaY > 0) return scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
  if (deltaY < 0) return scroller.scrollTop > 1;
  return false;
}

export default function HorizontalAxisController() {
  useEffect(() => {
    // The wheel is never a world control - the seal is piloted with WASD and by
    // clicking beacons - so the axis consumes every wheel event. The previous
    // `#world` bail-out meant the world, which fills the viewport at rest, ate
    // the one gesture a visitor actually makes and the site read as frozen.
    // Easing lives in CSS `scroll-behavior`, not here: a JS lerp toward its own
    // target fights every other scroll source (anchor jumps from the nav chips,
    // scrollbar drags, focus scrolls) and loses.
    const onWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey) return;
      if (canScrollVertically(event.target, event.deltaY)) return;

      const delta = horizontalDelta(event);
      if (!delta) return;
      event.preventDefault();
      window.scrollBy({ left: delta, top: 0, behavior: "auto" });
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;

      let direction = PAGE_FORWARD_KEYS.has(event.key.toLowerCase()) ? 1
        : PAGE_BACK_KEYS.has(event.key.toLowerCase()) ? -1 : 0;
      if (!direction && !isWorldVisible()) {
        const key = event.key.toLowerCase();
        direction = FORWARD_KEYS.has(key) ? 1 : BACK_KEYS.has(key) ? -1 : 0;
      }
      if (!direction) return;

      event.preventDefault();
      window.scrollBy({
        left: direction * window.innerWidth * 0.86,
        top: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
