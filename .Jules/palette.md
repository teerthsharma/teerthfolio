# Palette's UX & Accessibility Journal

## 2025-05-18 - Native SVG `<title>` Tooltips for Map Elements
**Learning:** On interactive SVG overlays (like 2D/3D minimaps), individual elements (dots, pins, areas) often lack hover context. Adding native SVG `<title>` child elements inside SVG shapes (`<circle>`, `<path>`) provides zero-overhead, built-in browser tooltips on hover without creating DOM elements or interfering with canvas overlay performance.
**Action:** Use SVG `<title>` elements when making visual map pins/dots readable on mouse/pointer hover.
