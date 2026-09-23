// How well does each building read against the snow it stands on?
//
// The observatory has had a great deal of attention. The other seven have had
// none, and the world-wide finding that produced the mascot fixes applies to all
// of them: the terrain paints its own brightness in a custom ShaderMaterial and
// takes no part in the light rig, so anything that IS lit reads dark against it.
// This measures that per station instead of arguing about it.
//
// Samples the centre band of the frame where the docked camera puts the
// building, and the foreground snow below it. Reads the survey's captures rather
// than driving itself, so a run costs nothing once the survey exists.
//
// Refuses a survey that did not arrive. One run of this probe read a survey in
// which the traveller reached none of the eight stations and still printed a
// complete, plausible table — reactor 94.4, mast 134.7 — because the captures
// existed and nothing checked what was in them. The survey already records an
// `arrived` flag per station; this reads it, so a failed run cannot be mistaken
// for a finding.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const DIR = process.argv[2] || "verification/stations3";
const survey = await readFile(join(DIR, "survey.json"), "utf8")
  .then(JSON.parse)
  .catch(() => null);
if (!survey) {
  console.error(`no survey.json in ${DIR}: run probe:station-survey against this directory first`);
  process.exit(1);
}
const missed = survey.filter((row) => !row.arrived);
if (missed.length > 1) {
  console.error(
    `refusing to report: the survey reached ${survey.length - missed.length} of ${survey.length} stations ` +
      `(missed ${missed.map((r) => r.id).join(", ")}). Re-run probe:station-survey.`,
  );
  process.exit(1);
}
const notArrived = new Set(missed.map((row) => row.id));
const BUILDING = { x0: 330, x1: 1090, y0: 220, y1: 620 };
const SNOW = { x0: 200, x1: 1000, y0: 700, y1: 860 };

const files = (await readdir(DIR)).filter((name) => name.endsWith(".png")).sort();
const rows = [];
for (const name of files) {
  const { data, info } = await sharp(join(DIR, name))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = (box) => {
    let sum = 0;
    let count = 0;
    for (let y = box.y0; y < box.y1; y += 2) {
      for (let x = box.x0; x < box.x1; x += 2) {
        const i = (y * info.width + x) * info.channels;
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        count += 1;
      }
    }
    return sum / count;
  };
  // The building never fills its box, so its own luminance is the darker half of
  // what is in there: the mean would be dragged toward the snow behind it.
  const samples = [];
  for (let y = BUILDING.y0; y < BUILDING.y1; y += 2) {
    for (let x = BUILDING.x0; x < BUILDING.x1; x += 2) {
      const i = (y * info.width + x) * info.channels;
      samples.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    }
  }
  samples.sort((a, b) => a - b);
  const building = samples[Math.floor(samples.length * 0.25)];
  const snow = mean(SNOW);
  rows.push({
    suspect: [...notArrived].some((id) => name.includes(id)),
    station: name.replace(/\.png$/, ""),
    building: Math.round(building * 10) / 10,
    snow: Math.round(snow * 10) / 10,
    contrast: Math.round((snow - building) * 10) / 10,
  });
}

rows.sort((a, b) => b.contrast - a.contrast);
console.log("building luminance is the 25th percentile of the frame's centre band");
console.log("(the building never fills the box, so a mean would read the snow behind it)\n");
for (const row of rows) {
  console.log(
    `${row.station.padEnd(30)} building ${String(row.building).padStart(6)}  ` +
      `snow ${String(row.snow).padStart(6)}  darker by ${String(row.contrast).padStart(6)}` +
      (row.suspect ? "   <- never arrived, pose is not the dock" : ""),
  );
}
