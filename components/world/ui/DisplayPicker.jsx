"use client";

// The Display control: native radios (arrow keys, labels, focus for free)
// styled as the HUD's rounded chips. Auto is today's detection plus the
// adaptive monitor; the others pin a rung (lib/world/quality.js DISPLAY).

import { useId } from "react";
import { DISPLAY, TIERS, rememberDisplay } from "../../../lib/world/quality";
import { setUi, useUi } from "../../../lib/world/store";

export default function DisplayPicker() {
  const name = useId();
  const display = useUi((s) => s.display);
  const tier = useUi((s) => s.tier);
  const gpu = useUi((s) => s.gpu);
  const now = tier === null ? "" : TIERS[tier].name;
  const note = display === "auto" ? `Auto · ${now} (${gpu})` : display === null ? `Set by the address (?look=) · ${now}` : `Fixed at ${now}`;
  return (
    <fieldset className="display-pick">
      <legend>Display</legend>
      <div className="display-pick-chips">
        {DISPLAY.map((d) => (
          <label key={d.id}>
            <input
              type="radio"
              name={name}
              value={d.id}
              checked={display === d.id}
              onChange={() => {
                rememberDisplay(d.id);
                setUi({ display: d.id });
              }}
            />
            <span>{d.label}</span>
          </label>
        ))}
      </div>
      <p className="display-pick-note" aria-live="polite">{note}</p>
    </fieldset>
  );
}
