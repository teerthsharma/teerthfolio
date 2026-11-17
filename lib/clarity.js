// Microsoft Clarity gate and event helper; copied as-is to the sibling sites.

const isOn = (v) => v === "1" || v === "yes" || v === true;

export const clarityId = (raw) => (typeof raw === "string" && /^[a-z0-9]{6,16}$/.test(raw) ? raw : null);

// Needs an ID, and no Do Not Track or Global Privacy Control signal.
export function shouldLoadClarity(id, nav = {}, win = {}) {
  return !!clarityId(id) && !(isOn(nav.doNotTrack) || isOn(win.doNotTrack) || isOn(nav.msDoNotTrack) || nav.globalPrivacyControl === true);
}

export const clarityLoader = (id) =>
  `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(id)});`;

// Tag a named action (e.g. "dock-arrival"); a no-op until Clarity has loaded.
export function clarityEvent(name) {
  if (typeof name === "string" && typeof window !== "undefined") window.clarity?.("event", name);
}
