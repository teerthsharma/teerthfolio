"use client";

import { useEffect } from "react";

const FORWARD_KEYS = new Set(["d", "w", "arrowright", "arrowdown", "pagedown"]);
const BACK_KEYS = new Set(["a", "s", "arrowleft", "arrowup", "pageup"]);

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
    const onWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("#world")) return;
      if (canScrollVertically(target, event.deltaY)) return;

      const delta = horizontalDelta(event);
      if (!delta) return;
      event.preventDefault();
      window.scrollBy({ left: delta, top: 0, behavior: "auto" });
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if (isWorldVisible()) return;

      const key = event.key.toLowerCase();
      const direction = FORWARD_KEYS.has(key) ? 1 : BACK_KEYS.has(key) ? -1 : 0;
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
