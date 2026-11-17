// LOOK _rigtest: gojo with props in both hands (sword right, scroll left), for the rig's prop test.
import gojo from "./gojo.js";
import { variant } from "./_merge.js";

export default variant(gojo, { props: [{ kind: "sword", hand: "R", rot: [0, 0, 0] }, { kind: "scroll", hand: "L" }] });
export const staff = variant(gojo, { props: [{ kind: "staff", hand: "R" }, { kind: "orb", hand: "L" }, ] });
export const fanCup = variant(gojo, { props: [{ kind: "fan", hand: "R" }, { kind: "cup", hand: "L" }] });
