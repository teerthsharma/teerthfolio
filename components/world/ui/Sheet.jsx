"use client";

// The one sliding-card component both the project panel and the all-projects
// list are built from: a non-modal <dialog>-shaped section that is always
// mounted (see the data-state pattern in globals.css) so it can play an exit
// transition, becomes a bottom sheet with a drag handle on a phone, and moves
// focus to its title on open and back to whatever had focus on close.

import { useEffect, useRef, useState } from "react";
import { IconClose } from "./icons";

export function useFocusOnOpen(on, ref) {
  useEffect(() => {
    if (!on) return;
    const back = document.activeElement;
    ref.current?.focus({ preventScroll: true });
    return () => {
      if (back && back !== document.body && back.isConnected) back.focus({ preventScroll: true });
    };
  }, [on, ref]);
}

export default function Sheet({ on, side, titleId, titleRef, accent, failed, onClose, children }) {
  const [full, setFull] = useState(false);
  const sheetRef = useRef(null);
  const y0 = useRef(null);
  const dragged = useRef(false);

  useFocusOnOpen(on, titleRef);

  useEffect(() => {
    if (!on) setFull(false);
  }, [on]);

  function onPointerDown(e) {
    y0.current = e.clientY;
    dragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }
  function onPointerMove(e) {
    if (y0.current == null) return;
    const dy = e.clientY - y0.current;
    if (Math.abs(dy) >= 6) dragged.current = true;
    if (sheetRef.current) sheetRef.current.style.translate = `0 ${full ? Math.max(0, dy) : dy}px`;
  }
  function end(e, cancel) {
    if (y0.current == null) return;
    const dy = e.clientY - y0.current;
    y0.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
      sheetRef.current.style.translate = "";
    }
    if (cancel || !dragged.current) return;
    if (dy > 96) (full ? setFull(false) : onClose());
    else if (dy < -48) setFull(true);
  }
  function onHandleClick() {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setFull((f) => !f);
  }
  // Keyboard users can never Tab into content that is off screen at peek.
  // The handle and Close are excluded: a tap focuses them just before their
  // click fires, and expanding on that focus made the click undo it.
  function onFocusCapture(e) {
    if (!full && e.target !== titleRef.current && !e.target.closest(".sheet-handle, .sheet-close")) setFull(true);
  }

  return (
    <section
      ref={sheetRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={`sheet sheet-${side}`}
      data-state={on ? "open" : "closed"}
      data-full={full}
      data-failed={failed ? "true" : undefined}
      inert={!on}
      style={accent ? { "--accent": accent } : undefined}
      onFocusCapture={onFocusCapture}
    >
      {!failed && (
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={full}
          aria-label="Sheet size"
          onClick={onHandleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => end(e, false)}
          onPointerCancel={(e) => end(e, true)}
        >
          <span className="sheet-handle-bar" />
        </button>
      )}
      {!failed && (
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      )}
      <div className="sheet-body">{children}</div>
    </section>
  );
}
