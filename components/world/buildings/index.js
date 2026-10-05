// Places with a bespoke building instead of a plinth-and-sculpture monument.
// Every other place in lib/world/places.js is drawn by
// components/world/monuments/Monument.jsx.
import Hideout from "./Hideout";
import Home from "./Home";

export const BUILDINGS = {
  home: Home, // the igloo: contact, resume, and how to reach Teerth
  "p-epsilon-hollow": Hideout, // the Akatsuki hideout on the south-east rim (issue 10 W3): a carved mouth, not a lab building
};
