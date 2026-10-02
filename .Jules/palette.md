## 2025-05-20 - Sheet Dialog Keyboard Accessibility
**Learning:** Sliding sheet / dialog components in interactive 3D portfolios need explicit keydown event handlers so that keyboard users focused on inner interactive controls can close the dialog with the `Escape` key without event collision.
**Action:** Always attach an `onKeyDown` handler handling `Escape` to `role="dialog"` container components.
