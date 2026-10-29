# Palette's UX & Accessibility Journal

## 2025-05-18 - Toggle Button ARIA Semantics & WebGL Session Safety
**Learning:** Combining dynamic action labels (e.g. `aria-label="Mute audio"`) with `aria-pressed` on toggle buttons causes contradictory screen reader announcements like "Mute audio, pressed". Toggles using `aria-pressed` require a static feature label (e.g. `aria-label="Sound"`). Additionally, external links in web apps running interactive 3D WebGL sessions should use `target="_blank" rel="noreferrer"` and explicit "(opens in a new tab)" screen reader labels to prevent accidental loss of interactive canvas state.
**Action:** Always pair `aria-pressed` with a static feature name, and ensure header links pointing to external sites open safely in a new tab with explicit ARIA warnings.
