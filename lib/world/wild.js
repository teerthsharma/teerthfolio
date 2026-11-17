// Wild ring colliders. WILD_COLLIDERS gathers the circles of the Antarctic landforms; the physics reads PHYSICS_COLLIDERS.
// The fountain wall (land "fountain-wall") is solid only while the peak is a cliff: rise.js lowers PEAK.top below 3.
import { LAND_COLLIDERS } from "./land.js";
import { PEAK } from "./peak.js";
import { COLLIDERS as SHELF } from "./shelf.js";
import { COLLIDERS as CREVASSE } from "./crevasse.js";
import { COLLIDERS as BLUEICE } from "./blueice.js";
import { COLLIDERS as NUNATAK } from "./nunatak.js";
import { COLLIDERS as SASTRUGI } from "./sastrugi.js";
import { COLLIDERS as HUT } from "./hut.js";
import { COLLIDERS as ROOKERY } from "./rookery.js";
import { COLLIDERS as DELTA } from "./delta.js";
import { COLLIDERS as MELTLAKE } from "./meltlake.js";
import { COLLIDERS as BERGS } from "./bergs.js";
import { COLLIDERS as CENOTES } from "./cenotes.js";
import { COLLIDERS as HOODOOS } from "./hoodoos.js";

const BRIDGE_REST = [{ x: -76, z: -57, radius: 1.2, land: "crevasse" }];

export const WILD_COLLIDERS = [...SHELF, ...CREVASSE, ...BLUEICE, ...NUNATAK, ...SASTRUGI, ...HUT, ...ROOKERY, ...DELTA, ...MELTLAKE, ...BERGS, ...BRIDGE_REST, ...CENOTES, ...HOODOOS];

export const PHYSICS_COLLIDERS = [...LAND_COLLIDERS.filter((c) => PEAK.top >= 3 || c.land !== "fountain-wall"), ...WILD_COLLIDERS];
