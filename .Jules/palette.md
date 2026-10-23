# Palette's UX & Accessibility Journal

## 2026-10-23 - ARIA Toggle Buttons and Static Accessible Names
**Learning:** Combining `aria-pressed={boolean}` with a dynamic `aria-label` describing the click action (e.g., "Mute audio") creates a confusing screen reader experience ("Mute audio, toggle button, pressed").
**Action:** Keep `aria-label` static (e.g. `aria-label="Audio"`) when using `aria-pressed`, and use `title` for dynamic hover action tooltips.
