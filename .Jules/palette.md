# Palette's UX & Accessibility Journal

## 2026-11-03 - Minimap SVG Tooltips with Hidden Landmark
**Learning:** In canvas/3D overlays, visual minimaps often hide the SVG subtree from assistive tech (`aria-hidden="true"`) to avoid cluttering screen reader exploration with dozens of tiny dots when an accessible text list already exists. SVG `<title>` child elements on `<circle>` nodes still provide native browser hover tooltips for sighted pointer users without interfering with the screen-reader-hidden state.
**Action:** When decorating interactive SVG map elements within an `aria-hidden` container, use native child `<title>` tags to identify destinations on hover, and link the collapse/expand toggle to the panel via `aria-controls`.
