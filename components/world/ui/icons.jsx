// Small inline SVGs for the HUD. No icon library: eight icons is not worth a
// dependency, and inline SVG lets stroke colour follow currentColor for free.

export function IconSoundOn(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.3 8.7a5 5 0 0 1 0 6.6" />
      <path d="M18.8 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

export function IconSoundOff(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 9l5.5 6M21.5 9L16 15" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

// External-link arrow. Never the "↗" glyph: Instrument Sans may not carry it.
export function IconArrow(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export function IconChevron(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
