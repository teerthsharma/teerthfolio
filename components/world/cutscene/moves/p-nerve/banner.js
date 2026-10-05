// THE TITLE BANNER (the big header): the instant the scene starts a BIG cream banner unfurls downward like cloth across the top
// of the screen (one overshoot, about 0.35 s), holds about 1.8 s, then rolls up into the cinema bar, where CutsceneTitle keeps
// the small title. About 80% of the width on a desktop, full width inside the 16 px gutters on a phone, at least an eighth of
// the screen tall, upper third only, an apple-red stripe along its lower edge. Reduced motion shows it static. Plain DOM,
// removed by dispose() (a skip unmounts the move, so the banner goes with it).
//
// Also here: hand lettering for the sound effects (DONG, CRUNCH), in the comic face, palette-true (amber misregistration).

import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from "three";

const CSS = `
.nerve-banner{position:fixed;left:50%;top:clamp(8px,2vh,22px);transform:translateX(-50%);width:80vw;min-height:15vh;max-height:31vh;box-sizing:border-box;z-index:60;pointer-events:none;
  background:#f6edd9;color:#1a1310;border-radius:6px;box-shadow:0 14px 34px rgba(0,0,0,.5),0 0 0 3px #1a1310;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:1.6vh 2.4vw 2.4vh;text-align:center;font-family:var(--font-comic),"Shantell Sans","Segoe Print",system-ui,sans-serif;overflow:hidden}
.nerve-banner::after{content:"";position:absolute;left:0;right:0;bottom:0;height:max(6px,1.1vh);background:#c4131d}
.nerve-banner b{display:block;font-weight:800;font-size:clamp(25px,5.4vw,86px);line-height:1.04;letter-spacing:-.01em}
.nerve-banner i{display:block;font-style:normal;font-weight:600;font-size:clamp(15px,2.2vw,32px);letter-spacing:.1em;margin-top:.5vh;color:#5a4a40}
.nerve-banner[data-live]{animation:nerve-banner 1.2s cubic-bezier(.25,.7,.3,1) both}
@keyframes nerve-banner{
  0%{clip-path:inset(0 0 100% 0);transform:translate(-50%,-6%)}
  25%{clip-path:inset(0 0 -7% 0);transform:translate(-50%,3%)}
  32%{clip-path:inset(0 0 0 0);transform:translate(-50%,0)}
  80%{clip-path:inset(0 0 0 0);transform:translate(-50%,0)}
  100%{clip-path:inset(0 0 100% 0);transform:translate(-50%,-14%)}
}
@media (max-width:600px){.nerve-banner{width:calc(100vw - 32px)}}
`;

export function banner(still) {
  if (typeof document === "undefined") return { dispose() {} };
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement("div");
  el.className = "nerve-banner";
  el.setAttribute("aria-hidden", "true");
  const b = document.createElement("b");
  b.textContent = "Death Note: The Bells Are Loud";
  const i = document.createElement("i");
  i.textContent = "nerve";
  el.append(b, i);
  if (!still) el.dataset.live = "";
  document.body.appendChild(el);
  return {
    dispose() {
      el.remove();
      style.remove();
    },
  };
}

// hand lettering on a canvas plane that draws over the scene (depthTest off), where the move puts it
export function lettering(text, fill = "#8a1219") {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    g.rotate(-0.08);
    let px = 220;
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.9 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.fillStyle = "#d99a45";
    g.globalAlpha = 0.9;
    g.fillText(text, -px * 0.045, px * 0.03);
    g.globalAlpha = 1;
    g.lineWidth = px * 0.14;
    g.strokeStyle = "#f6edd9";
    g.strokeText(text, 0, 0);
    g.fillStyle = fill;
    g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  const m = new Mesh(new PlaneGeometry(1, 320 / 1024), new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, toneMapped: false, fog: false }));
  m.renderOrder = 30;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
