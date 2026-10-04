## Palette's Journal - Critical UX Learnings

## 2025-05-20 - Do not combine dynamic aria-labels with aria-pressed or aria-expanded
**Learning:** Controls using `aria-pressed` or `aria-expanded` already communicate their state to assistive technologies. Dynamically changing `aria-label` (e.g. from "Expand" to "Collapse") creates redundant or conflicting screen reader output like "Collapse sheet, expanded".
**Action:** Keep `aria-label` static and descriptive of the target element when using boolean state attributes like `aria-pressed` or `aria-expanded`.
