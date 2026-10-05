// THE BANNER: the first thing on screen, before any landscape. The island's
// own area banner (app/globals.css .hud-banner: the name at clamp(40px, 7vw,
// 88px), weight 800, uppercase, 16vh from the top) on a plate given this
// dimension's charcoal edge: torn, smudged paper with a graphite border. It
// slams in at 0 s with one footfall boom (a hit-stop, a shake, a dust puff off
// its lower edge); on the stage bloom it shrinks up under the top cinema bar
// and stays there until the collapse. DOM, so it lives in the HUD's layer:
// the move adds it, moves it and takes it away (a skip takes it at once).

const TITLE = "The Walls were Titans";

// a torn edge: a polygon round the box with ragged steps (percent)
function torn(seed, inset) {
  const r = (i) => (((Math.sin(i * 127.1 + seed * 311.7) * 43758.5453) % 1) + 1) % 1;
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) pts.push([(i / n) * 100, inset + r(i) * 3.2]);
  for (let i = 0; i <= 8; i++) pts.push([100 - inset - r(i + 40) * 1.6, (i / 8) * 100]);
  for (let i = n; i >= 0; i--) pts.push([(i / n) * 100, 100 - inset - r(i + 80) * 4]);
  for (let i = 8; i >= 0; i--) pts.push([inset + r(i + 120) * 1.6, (i / 8) * 100]);
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
}

export function makeBanner({ logo, repos }) {
  const host = document.querySelector(".hud") ?? document.body;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.className = "mujo-banner";
  Object.assign(el.style, {
    position: "absolute",
    left: "50%",
    top: "16vh",
    width: "min(820px, calc(100vw - 32px))",
    transform: "translateX(-50%)",
    transformOrigin: "50% 0",
    pointerEvents: "none",
    zIndex: "4",
    textAlign: "center",
    color: "#1d1b18",
  });
  // the graphite border (a torn plate a little larger) and the paper over it
  const edge = document.createElement("div");
  const paper = document.createElement("div");
  Object.assign(edge.style, { position: "absolute", inset: "-14px -22px", background: "#26221e", clipPath: torn(3, 0), filter: "blur(0.6px)" });
  Object.assign(paper.style, {
    position: "absolute",
    inset: "-8px -16px",
    clipPath: torn(5, 0.6),
    background:
      "radial-gradient(ellipse at 18% 80%, rgba(40,34,30,.28), transparent 45%), radial-gradient(ellipse at 88% 20%, rgba(40,34,30,.22), transparent 40%), repeating-linear-gradient(118deg, rgba(30,26,22,.07) 0 1px, transparent 1px 5px), radial-gradient(circle at 50% 50%, #d6cdbf, #c3b8a8 70%, #a99d8b)",
  });
  const body = document.createElement("div");
  Object.assign(body.style, { position: "relative", padding: "22px 20px 18px" });
  const name = document.createElement("h2");
  name.textContent = TITLE;
  Object.assign(name.style, {
    margin: "0",
    fontSize: "clamp(40px, 7vw, 88px)",
    lineHeight: "0.95",
    fontWeight: "800",
    letterSpacing: "-0.02em",
    textTransform: "uppercase",
    color: "#1d1b18",
    textShadow: "1px 1px 0 rgba(29,27,24,.35), -1px 0 2px rgba(29,27,24,.3), 0 0 10px rgba(29,27,24,.18)",
  });
  const row = document.createElement("p");
  Object.assign(row.style, { margin: "14px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap", fontFamily: "var(--mono, monospace)", fontSize: "clamp(13px, 1.6vw, 17px)", fontWeight: "700" });
  if (logo) {
    const img = document.createElement("img");
    img.src = logo;
    img.alt = "";
    img.width = img.height = 28;
    Object.assign(img.style, { width: "28px", height: "28px", objectFit: "contain", filter: "grayscale(1) contrast(1.4)" });
    row.append(img);
  }
  const repo = document.createElement("span");
  repo.textContent = repos;
  row.append(repo);
  // the dust off its lower edge
  const dust = document.createElement("div");
  Object.assign(dust.style, { position: "absolute", left: "0", right: "0", bottom: "-18px", height: "40px" });
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const p = document.createElement("i");
    Object.assign(p.style, { position: "absolute", left: `${6 + i * 11}%`, bottom: "0", width: "54px", height: "34px", borderRadius: "50%", background: "radial-gradient(circle, rgba(60,52,46,.55), rgba(60,52,46,0) 70%)", opacity: "0" });
    dust.append(p);
    puffs.push(p);
  }
  // the return, said on the plate as the drawing burns: sized to read after the dock's 0.36 scale
  const home = document.createElement("p");
  home.textContent = "The Wall is open. The drawing burns away, and the seal comes home.";
  Object.assign(home.style, { margin: "0", maxHeight: "0", overflow: "hidden", opacity: "0", fontFamily: "var(--font-bubble, 'Shantell Sans', cursive)", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 48px)", lineHeight: "1.1", color: "#2a1d14" });
  body.append(name, row, home);
  el.append(edge, paper, body, dust);
  host.append(el);

  let state = "";
  const anim = [];
  const run = (a) => anim.push(a);
  return {
    // "slam": in at once with the boom; "dock": up under the top bar; "still": standing, no motion
    set(next) {
      if (next === state) return;
      state = next;
      if (next === "slam") {
        // the slam: big, then a hit-stop held on the impact, then the shake
        run(el.animate([{ transform: "translateX(-50%) scale(1.7)", opacity: 0 }, { transform: "translateX(-50%) scale(0.96)", opacity: 1, offset: 0.25 }, { transform: "translateX(-50%) scale(0.96)", offset: 0.55 }, { transform: "translate(calc(-50% + 7px), 3px) scale(1)", offset: 0.68 }, { transform: "translate(calc(-50% - 6px), -2px) scale(1)", offset: 0.8 }, { transform: "translateX(-50%) scale(1)" }], { duration: 520, easing: "steps(6, end)", fill: "forwards" }));
        puffs.forEach((p, i) => run(p.animate([{ opacity: 0, transform: "translate(0, 0) scale(0.4)" }, { opacity: 0.9, transform: `translate(${(i - 4) * 4}px, 2px) scale(1)`, offset: 0.2 }, { opacity: 0, transform: `translate(${(i - 4) * 14}px, 10px) scale(2.2)` }], { duration: 900, delay: 140, easing: "ease-out", fill: "forwards" })));
      } else if (next === "dock") {
        // docks under the bar, then gets out of the picture (the plate returns with the home line)
        run(el.animate([{ transform: "translateX(-50%) scale(1)", top: "16vh", opacity: 1 }, { transform: "translateX(-50%) scale(0.36)", top: "9.6vh", opacity: 1, offset: 0.4 }, { transform: "translateX(-50%) scale(0.36)", top: "9.6vh", opacity: 0 }], { duration: 1050, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }));
      } else if (next === "still") {
        Object.assign(el.style, { transform: "translateX(-50%) scale(0.5)", top: "9.6vh" });
      } else if (next === "home") {
        home.style.maxHeight = "4em";
        home.style.marginTop = "14px";
        run(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" }));
        run(home.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "ease-out", fill: "forwards" }));
      } else if (next === "out") {
        run(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }));
      }
    },
    dispose() {
      for (const a of anim) a.cancel();
      el.remove();
    },
  };
}
