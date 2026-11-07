# Palette's UX & Accessibility Journal

## 2025-05-18 - Keyboard Focus Containment in 3D Canvas Overlay Dialogs
**Learning:** In hybrid 3D canvas and HTML overlay applications, side/bottom sheet drawers rendered with `role="dialog"` without an explicit modal barrier can leak keyboard focus into background HUD buttons and the canvas, disorienting screen reader and keyboard users. Handling `Tab` wrapping and `Escape` directly at the drawer container boundary provides seamless keyboard navigation while preserving non-modal layout and backdrop aesthetics.
**Action:** Always ensure dialog sheet overlays capture Tab cycling between first and last focusable elements and handle the Escape key directly on the dialog wrapper.
