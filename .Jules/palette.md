# Palette's UX & Accessibility Journal

## 2025-02-17 - Contextual Dialog Close and Overlay Accessibility
**Learning:** Generic "Close" or static "Sheet size" labels on modal/sheet controls lack context for screen reader users when multiple sheets or dynamic panels exist. Furthermore, absolute-positioned CSS-hidden overlays like gesture coaches still get read by virtual cursors unless `aria-hidden` reflects visibility.
**Action:** Always provide dynamic/contextual `aria-label`s on sheet toggles and close buttons, and explicitly set `aria-hidden={!visible}` on hidden CSS overlay prompts.
