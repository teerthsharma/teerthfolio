"use client";

// The 2D scene of a first arrival (moments.js POP_2D): the view has pushed in
// and slammed flat (look/popFlatten.js), a 2D seal cutout stands where the 3D
// seal was, the other speaker (an original silhouette or a promoted landform)
// enters in the upper half, and the subtitle box (lower half) carries line A,
// then, after the seal's move, line B. ui.pop is the clock (the Controller
// writes it and clears it with the arrival, so any skip removes all of this in
// one frame). No logo, face or typeface is borrowed. Hidden with ?hud=off; with
// reduced motion only the box shows, with both lines, static, over the
// untouched 3D view.

import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { LOOK_BY_ID } from "../../../lib/world/looks";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { punchFor } from "../../../lib/world/punch";
import { live, useUi } from "../../../lib/world/store";
import { reducedMotion } from "../look/popFlatten";
import { GuestArt, SealArt } from "./punchArt";

const V = new Vector3();
let scenes = 0; // pops played this page load: the separatrix alternates its ending

export default function PunchCut() {
  const pop = useUi((s) => s.pop);
  const id = useUi((s) => s.cutscene);
  const card = pop >= 2 && pop <= 6 && id ? punchFor(id) : null;
  const hidden = typeof document !== "undefined" && document.documentElement.dataset.hud === "off";
  const reduced = reducedMotion();
  const show = Boolean(card) && !hidden;
  const flat = show && !reduced;
  const place = id ? PLACE_BY_ID[id] : null;
  const accent = place?.radiation ?? place?.color ?? "#2456dc";
  const sealRef = useRef(null);
  const ending = useRef(0);
  const last = useRef(-1);

  if (flat && live.arrival.start !== last.current) {
    last.current = live.arrival.start;
    ending.current = scenes++ % 2;
  }

  // The cel look on the canvas lives in CSS, keyed off the root.
  useEffect(() => {
    const root = document.documentElement;
    if (show) root.dataset.pop = flat ? "on" : "card";
    else delete root.dataset.pop;
    return () => {
      delete root.dataset.pop;
    };
  }, [show, flat]);

  // The cutout takes the seal's screen position (clamped clear of the box).
  useEffect(() => {
    if (!flat) return undefined;
    let raf = 0;
    const tick = () => {
      const cam = window.__world?.camera;
      const el = sealRef.current;
      if (cam && el) {
        V.set(live.seal.x, 0.8, live.seal.z).project(cam);
        el.style.left = `${Math.min(Math.max((V.x * 0.5 + 0.5) * 100, 22), 78)}vw`;
        el.style.top = `${Math.min((0.5 - V.y * 0.5) * 100, 40)}vh`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [flat]);

  const look = LOOK_BY_ID[id];
  const sil = card?.sil;
  const afterMove = pop >= 6;
  const sealPose = afterMove ? card?.seal.pose2 : card?.seal.pose1;
  const lineA = card && pop >= 4;
  const lineB = card && (reduced ? pop >= 4 : pop >= 6);
  return (
    <div className="punch" aria-live="polite" data-pop={show ? pop : 0}>
      {flat ? (
        <>
          {pop === 2 ? <div className="punch-flash" style={{ "--accent": accent }} /> : null}
          {afterMove ? <div className="punch-flash punch-flash-b" key="b" /> : null}
          <div className="punch-rays" aria-hidden="true" />
          {card.back ? (
            <div className="punch-back" aria-hidden="true">
              <GuestArt prop={card.back} accent={accent} />
            </div>
          ) : null}
          {sil && pop >= 3 ? (
            <div className="punch-guest" data-edge={sil.enter} data-phase={pop} style={{ "--accent": accent }} aria-hidden="true">
              <GuestArt prop={sil.prop} accent={accent} seal2={<SealArt look={null} accent="#9a6bff" pose="still" rim="#9a6bff" />} />
            </div>
          ) : null}
          <div className="punch-seal" ref={sealRef} data-move={card.move} data-phase={pop} aria-hidden="true">
            <SealArt look={look} accent={accent} pose={sealPose} />
            {id === "p-separatrix" && afterMove ? (
              ending.current ? <span className="punch-ring">CERTIFIED</span> : <span className="punch-hole" />
            ) : null}
          </div>
          {card.bolt && pop === 5 ? <div className="punch-bolt" aria-hidden="true" /> : null}
          {card.num && pop >= 5 ? <div className="punch-num" aria-hidden="true">{card.num}</div> : null}
        </>
      ) : null}
      {show && lineA ? (
        <div className="punch-box" data-pop={pop}>
          <p className="punch-line punch-a" data-who={card.a.who}>{card.a.text}</p>
          {lineB ? <p className="punch-line punch-b" data-who={card.b.who}>{card.b.text}</p> : null}
          {lineB && card.sub ? <p className="punch-sub">{card.sub}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
