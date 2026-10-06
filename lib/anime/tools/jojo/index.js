// JoJo Araki shader pack. COUNT must stay 150.
// Parent import (do not patch catalog.js):
//   import { JOJO, JOJO_SHADER_COUNT, jojoGlsl } from "./tools/jojo/index.js";
import { KIT } from "./kit.glsl.js";
import { CAIRO } from "./cairo.js";
import { DIO } from "./dio.js";
import { JOTARO } from "./jotaro.js";
import { THEWORLD } from "./theworld.js";
import { MUDA } from "./muda.js";
import { TIMESTOP } from "./timestop.js";
import { COLOSSEUM } from "./colosseum.js";
import { GIORNO } from "./giorno.js";
import { GER } from "./ger.js";
import { DIAVOLO } from "./diavolo.js";
import { GOLD } from "./gold.js";
import { LETTERING } from "./lettering.js";
import { BLOOD } from "./blood.js";

export const JOJO = [
  ...CAIRO,
  ...DIO,
  ...JOTARO,
  ...THEWORLD,
  ...MUDA,
  ...TIMESTOP,
  ...COLOSSEUM,
  ...GIORNO,
  ...GER,
  ...DIAVOLO,
  ...GOLD,
  ...LETTERING,
  ...BLOOD,
];

export const JOJO_SHADER_COUNT = JOJO.length;
export const JOJO_BY_NAME = Object.fromEntries(JOJO.map((m) => [m.name, m]));
export const JOJO_FAMILIES = {
  cairo: CAIRO.length,
  dio: DIO.length,
  jotaro: JOTARO.length,
  theworld: THEWORLD.length,
  muda: MUDA.length,
  timestop: TIMESTOP.length,
  colosseum: COLOSSEUM.length,
  giorno: GIORNO.length,
  ger: GER.length,
  diavolo: DIAVOLO.length,
  gold: GOLD.length,
  lettering: LETTERING.length,
  blood: BLOOD.length,
};

export function jojoGlsl(name) {
  const m = JOJO_BY_NAME[name];
  if (!m) throw new Error(`jojo shader not found: ${name}`);
  return `${KIT}\n${m.glsl}\n${m.demo}`;
}

export { KIT };
export { defineModule } from "./kit.glsl.js";
