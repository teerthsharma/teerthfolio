"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_DELAY_MS = 220;

export default function ExpandableImage({
  src,
  alt = "",
  className = "",
  imageClassName = "",
  style,
  loading = "lazy",
  children,
  popoutLabel,
}) {
  const triggerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [popout, setPopout] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closePopout = useCallback(() => {
    setPopout((current) => (current ? { ...current, expanded: false } : current));
    window.setTimeout(() => setPopout(null), CLOSE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!popout) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closePopout();
    };

    document.body.classList.add("image-popout-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("image-popout-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closePopout, popout]);

  const openPopout = () => {
    if (!src || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    setPopout({
      expanded: false,
      rect: {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      },
    });

    requestAnimationFrame(() => {
      setPopout((current) => (current ? { ...current, expanded: true } : current));
    });
  };

  const panelStyle = popout
    ? {
        "--start-left": `${popout.rect.left}px`,
        "--start-top": `${popout.rect.top}px`,
        "--start-width": `${popout.rect.width}px`,
        "--start-height": `${popout.rect.height}px`,
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`expandable-image ${className}`.trim()}
        onClick={openPopout}
        aria-label={popoutLabel || `Expand image: ${alt}`}
        data-sfx="click"
        data-sfx-hover="hover"
        disabled={!src}
      >
        {children || <img className={imageClassName} src={src} alt={alt} loading={loading} style={style} />}
      </button>

      {mounted && popout
        ? createPortal(
            <div className="image-popout-layer" onClick={closePopout} role="presentation">
              <button
                type="button"
                className={`image-popout-panel${popout.expanded ? " is-expanded" : ""}`}
                style={panelStyle}
                onClick={closePopout}
                aria-label={`Close expanded image: ${alt}`}
                data-sfx="click"
              >
                <img src={src} alt={alt} />
                {alt ? <span>{alt}</span> : null}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
