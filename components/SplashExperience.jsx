"use client";

import { useMemo, useRef, useState } from "react";
import { Howl } from "howler";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const SPLASH_LABEL = "SEAL TOPOLOGY OBSERVATORY";

const bootRows = [
  ["SEAL/OS", "Antarctic topology kernel online"],
  ["AETHER VM", "topological ML runtime mapped"],
  ["FIELD TENSOR", "fixed-point chamber armed"],
  ["QPU BRIDGE", "homology verification linked"],
  ["UPSTREAM RADAR", "GitHub signal ready"],
];

const flipPanels = ["SEAL", "TOPOLOGY", "OBSERVATORY"];
const LETTER_CLICK_INTERVAL_MS = 34;
const clickSeries = Array.from(
  { length: flipPanels.join("").length },
  (_, index) => index * LETTER_CLICK_INTERVAL_MS,
);

gsap.registerPlugin(useGSAP);

export default function SplashExperience() {
  const root = useRef(null);
  const timers = useRef([]);
  const started = useRef(false);
  const [visible, setVisible] = useState(true);
  const sounds = useMemo(
    () => ({
      flip: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.3,
        pool: 16,
      }),
      click: new Howl({
        src: ["/assets/flip-sound.mp3", "/assets/flip-sound.ogg"],
        volume: 0.18,
        rate: 1.7,
        pool: 20,
      }),
      saw: new Howl({
        src: ["/assets/chainsaw.mp3"],
        volume: 0.035,
      }),
    }),
    [],
  );

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.set(".flip-panel", {
        rotateX: reduce ? 0 : -92,
        opacity: reduce ? 1 : 0,
        transformOrigin: "50% 50%",
      });
      gsap.set(".boot-progress span", { scaleX: reduce ? 1 : 0, transformOrigin: "0 50%" });

      if (reduce) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".splash-shell", {
        y: 24,
        opacity: 0,
        duration: 0.5,
      })
        .from(
          ".boot-row",
          {
            x: -18,
            opacity: 0,
            duration: 0.28,
            stagger: 0.08,
          },
          "-=0.2",
        )
        .to(
          ".boot-progress span",
          {
            scaleX: 1,
            duration: 1.05,
            ease: "steps(12)",
          },
          "-=0.36",
        )
        .from(
          ".boot-cursor",
          {
            opacity: 0,
            repeat: -1,
            yoyo: true,
            duration: 0.42,
            ease: "steps(1)",
          },
          0,
        )
        .to(
          ".splash-scan",
          {
            xPercent: 130,
            duration: 1.4,
            repeat: -1,
            ease: "none",
          },
          0,
        );
    },
    { scope: root },
  );

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const stopSplashSounds = () => {
    sounds.flip.stop();
    sounds.click.stop();
    sounds.saw.stop();
  };

  const playClickSeries = () => {
    clearTimers();
    sounds.click.stop();
    clickSeries.forEach((delay, index) => {
      const timer = window.setTimeout(() => {
        if (!started.current) return;
        sounds.click.rate(1.34 + (index % 4) * 0.08);
        const id = sounds.click.play();
        sounds.click.volume(0.14 + (index % 3) * 0.015, id);
      }, delay);
      timers.current.push(timer);
    });
  };

  const finish = () => {
    clearTimers();
    stopSplashSounds();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setVisible(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 80);
  };

  const begin = () => {
    if (started.current) return;
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallbackTimer = window.setTimeout(finish, reduce ? 0 : 1900);
    timers.current.push(fallbackTimer);

    try {
      sounds.flip.stop();
      const flipId = sounds.flip.play();
      sounds.flip.rate(1.08, flipId);
      const sawId = sounds.saw.play();
      sounds.saw.fade(0.035, 0, 1200, sawId);
    } catch {
      stopSplashSounds();
    }

    if (reduce) {
      finish();
      return;
    }

    gsap
      .timeline({
        defaults: { ease: "expo.out" },
        onComplete: finish,
      })
      .to(".boot-row", {
        opacity: 0.38,
        x: 12,
        duration: 0.24,
        stagger: 0.025,
      })
      .to(
        ".splash-status",
        {
          y: -10,
          opacity: 0.82,
          duration: 0.28,
        },
        "<",
      )
      .to(
        ".flip-panel",
        {
          rotateX: 0,
          opacity: 1,
          duration: 0.42,
          stagger: {
            each: 0.026,
            from: "start",
          },
          onStart: playClickSeries,
          ease: "back.out(1.8)",
        },
        "-=0.08",
      )
      .fromTo(
        ".flip-letter",
        { yPercent: 76 },
        {
          yPercent: 0,
          duration: 0.36,
          stagger: 0.018,
          ease: "power4.out",
        },
        "<",
      )
      .to(".splash-flash", { opacity: 1, duration: 0.08 }, "+=0.08")
      .to(".splash-flash", { opacity: 0, duration: 0.18 })
      .to(".splash-footer p", {
        textShadow: "0 0 18px rgba(216, 255, 53, 0.7)",
        duration: 0.38,
      })
      .to(root.current, {
        "--splash-y": "-112%",
        duration: 0.78,
        ease: "power4.inOut",
      })
      .to(
        root.current,
        {
          opacity: 0,
          duration: 0.16,
        },
        "-=0.12",
      );
  };

  if (!visible) return null;

  return (
    <section
      ref={root}
      className="splash"
      aria-label={SPLASH_LABEL}
      style={{ "--splash-y": "0%" }}
    >
      <div className="splash-shell">
        <div className="splash-scan" />
        <div className="splash-flash" />

        <div className="splash-status" aria-label="Seal topology boot status">
          <div>
            <span>TS OBSERVATORY BIOS</span>
            <strong>BOOTING</strong>
          </div>
          <div className="boot-progress" aria-hidden="true">
            <span />
          </div>
          <div className="boot-log">
            {bootRows.map(([label, value]) => (
              <p className="boot-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
        </div>

        <div className="splash-tiles" aria-label={SPLASH_LABEL}>
          {flipPanels.map((word) => (
            <div className="splash-word-row" key={word}>
              {word.split("").map((letter, index) => (
                <span className="flip-panel" key={`${word}-${letter}-${index}`}>
                  <span className="flip-letter">{letter}</span>
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="splash-footer">
          <p>
            Press begin to cross the ice shelf <span className="boot-cursor">_</span>
          </p>
          <button type="button" className="splash-begin neo-button" onClick={begin}>
            Begin
          </button>
        </div>
      </div>
    </section>
  );
}
