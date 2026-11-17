// The set of the dimension: sky, roof, beam, rain, splashes, grains, city, tower, realm.
import { buildBeam, buildGrains, buildMotes, buildRain, buildSplashes } from "./fx.js";
import { buildCity } from "./city.js";
import { buildRoof } from "./roof.js";
import { buildRealm, skyDome } from "./sky.js";
import { buildTower } from "./tower.js";

export function buildScenery() {
  return {
    dome: skyDome(),
    roof: buildRoof(),
    beam: buildBeam(),
    rain: buildRain(),
    splashes: buildSplashes(),
    grains: buildGrains(),
    city: buildCity(),
    tower: buildTower(),
    realm: buildRealm(),
    motes: buildMotes(),
  };
}

export function disposeScenery(m) {
  m.dome.g.dispose();
  m.dome.m.dispose();
  for (const k of ["roof", "beam", "rain", "splashes", "grains", "city", "tower", "realm", "motes"]) m[k].dispose();
}
