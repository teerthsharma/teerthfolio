// the comic hall and Ainz, built once (the shared prewarm builds them while the seal walks up), plus the pup's gear
import { Group } from "three";
import { pupParts } from "../p-caustic/parts";
import { buildGear, findParts, pupClay } from "./ainz";
import { buildHall } from "./hall";
import { buildAinz } from "./villain";

let CACHE = null;
export function getAssets() {
  if (CACHE) return CACHE;
  const root = new Group();
  const hall = buildHall();
  const ainz = buildAinz();
  root.add(hall.root, ainz.root);
  CACHE = { root, hall, ainz };
  return CACHE;
}
export function getGear() {
  const A = getAssets();
  if (A.gear) return A.gear;
  const sc = typeof window !== "undefined" ? window.__world?.scene : null;
  const found = sc ? pupParts(sc) : null;
  const p = found ? findParts(found.root) : null;
  if (!p?.root || !p.rear || !p.head) return null;
  A.gear = { p, gear: buildGear(p), twin: pupClay(p.root) };
  return A.gear;
}
export function disposeAssets() {
  const A = CACHE;
  if (!A) return;
  CACHE = null;
  if (A.gear) {
    A.gear.twin.dispose();
    A.gear.gear.dispose();
    A.gear.gear.staff.removeFromParent();
  }
  A.ainz.dispose();
  A.hall.dispose();
  A.root.removeFromParent();
}
