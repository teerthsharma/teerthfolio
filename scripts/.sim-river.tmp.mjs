import { LAND_COLLIDERS } from "../lib/world/land.js";
import { MOTION, createSeal, stepSeal } from "../lib/world/motion.js";
import { ISLAND_RADIUS, PLACES } from "../lib/world/places.js";
import { RIVER, riverAt } from "../lib/world/river.js";
const all = [...PLACES.map(({ id, x, z, radius }) => ({ id, x, z, radius })), ...LAND_COLLIDERS.map((c,i)=>({...c,id:`land:${c.land}#${i}`}))];
const on = RIVER.points.filter(([x, z]) => Math.hypot(x, z) < ISLAND_RADIUS - 2);
console.log("first", on[0], "last", on.at(-1));
function segDist(px,pz,[ax,az],[bx,bz]){const sx=bx-ax,sz=bz-az;const t=Math.max(0,Math.min(1,((px-ax)*sx+(pz-az)*sz)/(sx*sx+sz*sz||1)));return Math.hypot(px-ax-sx*t,pz-az-sz*t);}
const blocking = all.filter(c => { for (let i=0;i<on.length-1;i++) if (segDist(c.x,c.z,on[i],on[i+1]) < c.radius + MOTION.sealRadius) return true; return false; });
console.log("blocking", blocking.map(c=>c.id).join(", "));
const skip = process.argv.includes("--skip");
const colliders = all.filter(c => !skip || !blocking.includes(c));
const world = { colliders, radius: ISLAND_RADIUS, props: [] };
const [x0,z0] = on[0], [mx,mz] = on.at(-1);
const s = createSeal(x0, z0);
let peak = 0, reached = null;
for (let t = 0; t < 30; t += 1/120) {
  stepSeal(s, {}, 1/120, world);
  peak = Math.max(peak, s.impact);
  if (reached === null && Math.hypot(s.x-mx, s.z-mz) < 6) reached = t;
  if (Math.round(t*120)%60===0 || s.impact>0.1) console.log(t.toFixed(1), s.x.toFixed(1), s.z.toFixed(1), "v", s.speed.toFixed(1), "w", s.water.toFixed(2), "imp", s.impact.toFixed(2));
}
console.log("reached", reached, "peak impact", peak.toFixed(2));
