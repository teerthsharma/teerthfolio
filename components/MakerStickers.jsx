"use client";

import { Cat, Circuitry, CookingPot, FilmSlate, Hammer, Sparkle } from "@phosphor-icons/react";

const stickerIcons = {
  shaders: Sparkle,
  electronics: Circuitry,
  "wood carving": Hammer,
  cinematography: FilmSlate,
  cats: Cat,
  cooking: CookingPot,
};

export default function MakerStickers({ items }) {
  const onPointerMove = (event) => {
    if (event.currentTarget.dataset.dragging !== "true") return;
    const startX = Number(event.currentTarget.dataset.startX || 0);
    const startY = Number(event.currentTarget.dataset.startY || 0);
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    event.currentTarget.style.setProperty("--drag-x", `${dx * 0.18}px`);
    event.currentTarget.style.setProperty("--drag-y", `${dy * 0.18}px`);
  };

  const onPointerDown = (event) => {
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.dataset.startX = String(event.clientX);
    event.currentTarget.dataset.startY = String(event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event) => {
    event.currentTarget.dataset.dragging = "false";
    event.currentTarget.style.setProperty("--drag-x", "0px");
    event.currentTarget.style.setProperty("--drag-y", "0px");
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="sticker-board" data-reveal>
      {items.map((item, index) => {
        const Icon = stickerIcons[item] || Sparkle;
        return (
          <button
            type="button"
            className="maker-sticker"
            key={`${item}-${index}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-sfx="drag"
            data-sfx-hover="hover"
            data-sfx-dbl="flip"
            data-float
            style={{ "--sticker-index": index }}
          >
            <Icon size={22} weight="fill" />
            <span>{item}</span>
          </button>
        );
      })}
    </div>
  );
}
