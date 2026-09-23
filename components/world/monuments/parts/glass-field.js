// Pure layout for the glass building (faraday / p-faraday): the transformer
// tank and deck it stands on, and the two bushings' positions. No React, no
// three.js -- just the numbers Glass.jsx turns into geometry.
//
// SHOW-NEVER-TELL: this used to also lay out the E/H field-line motif from
// data/showcase.json's figure.desc (fig.js's "glass" figure) as a diagram
// traced on the deck. Glass.jsx no longer draws it -- the building shows the
// coupling as its own glow (an amber core rising out of the glass and
// climbing both bushings), not a plotted field. Only the building's
// architecture lives here now.

export const MINT = "#0b93ab"; // the deck's edge frame
export const GLASS_TINT = "#dff3f6"; // the deck itself: clear, not radiation-amber

export const WIRE_X = 1.1; // each bushing's x offset from centre, on the deck

// The transformer tank: a recognisable, opaque mass under the deck, well
// short of the deck's own footprint so snow shows all round it.
export const BASE_W = 1.8, BASE_D = 1.0, BASE_H = 1.0;
export const FIN_W = 0.1, FIN_H = 0.9, FIN_T = 0.12, FIN_COUNT = 6; // radiator fins, per long side

// The glass deck: raised clear of the tank on four legs, so the snow shows
// underneath and round it -- the opposite of the old flush opaque tile.
export const DECK_W = 4.4, DECK_D = 2.8, DECK_T = 0.12;
export const DECK_Y = 1.1; // the deck's top surface, local y
export const LEG_SIZE = 0.14, LEG_INSET = 0.5;
export const LEG_Y = DECK_Y - DECK_T / 2; // leg height, ground to the deck's underside

export const BUSHING_H = 2.8; // insulator stack height above the deck
export const CAP_Y = DECK_Y + BUSHING_H;

// The two coupled circuits leaving the yard: a sagging conductor from each
// bushing cap out to a pole, both well inside place.radius (3 m).
export const POLE_X = 2.6, POLE_R = 0.2, POLE_Y = CAP_Y - 0.3;
export const CONDUCTOR_R = 0.08;

// A small hazard plate on the tank's corner, tilted for charm.
export const TREFOIL_R = 0.32;
