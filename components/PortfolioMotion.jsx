"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function PortfolioMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-reveal], [data-float]", {
        clearProps: "transform,opacity",
        opacity: 1,
      });
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 28,
          opacity: 0,
          filter: "blur(10px)",
          duration: 0.78,
          ease: "expo.out",
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        });
      });

      gsap.utils.toArray("[data-float]").forEach((element, index) => {
        gsap.to(element, {
          y: index % 2 ? 8 : -10,
          duration: 2.4 + index * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      return () => ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    });

    return () => mm.revert();
  });

  return null;
}
