// THE CAST: the ink guests as cel figures with faces (retires the old "no face, ever" law).
// Pure data; components/world/cutscene/cel.js builds from it. Each entry reads through three things at 32 px
// (hair shape, one saturated costume colour, one accessory) and, close up, through a few strokes of face: eyes,
// brows, a mouth, sometimes a mark. All original simple drawings; nothing here traces a model sheet.
//   skin / hair{style,color} / jacket / hem / pants / belt / shoe   the costume, sRGB hex
//   ink      the hull colour (a dark of the costume hue, never black)
//   robe     a long skirt in place of trousers (colour = jacket)
//   cape     { color, trim }  a back cape
//   armor    { color, trim }  a breastplate and pauldrons
//   acc      "headband" | "earrings" | "halo" | "staff" | "beard" | "ribbon" | "horns" | "scarf"
//   face     eyes { shape: sharp | round | narrow | hooded | socket, iris, sclera, extra }, brow { tilt, color, thick },
//            mouth { kind: smirk | grin | smile | flat | open | frown | teeth }, marks[], blush, nose
export const CAST = {
  // Jujutsu Kaisen: the King of Curses, a pink crop, red eyes, a wide grin, black marks; maroon kimono, cream sash
  sukuna: {
    build: "broad",
    skin: "#f4c8a4",
    hair: { style: "crop", color: "#ff7fa8" },
    jacket: "#b3122f",
    hem: "#f6ead2",
    pants: "#241024",
    belt: "#f6ead2",
    shoe: "#241024",
    ink: "#2a0612",
    face: { eyes: { shape: "sharp", iris: "#ef1230", extra: true }, brow: { tilt: 0.42, color: "#e0688a" }, mouth: { kind: "grin" }, marks: ["cheeks", "chin"] },
  },
  // Overlord: a bone skull, red sparks in the sockets, a violet-and-gold robe, a gold staff and a halo behind the head
  ainz: {
    build: "tall",
    skin: "#efe4c6",
    hair: { style: "none", color: "#efe4c6" },
    jacket: "#5a1fb0",
    hem: "#f4c32e",
    pants: "#17082f",
    belt: "#f4c32e",
    shoe: "#17082f",
    robe: true,
    cape: { color: "#2a0f55", trim: "#f4c32e" },
    ink: "#12062a",
    acc: ["halo", "staff"],
    face: { eyes: { shape: "socket", iris: "#ff2a2a" }, brow: null, mouth: { kind: "teeth" }, nose: "hole" },
  },
  // Naruto: a yellow spike with two long fringes, blue eyes, a forehead plate; white cloak with a flame hem
  minato: {
    build: "tall",
    skin: "#f6cfae",
    hair: { style: "minato", color: "#ffd530" },
    jacket: "#fbf6ec",
    hem: "#ff5a1c",
    pants: "#26356c",
    belt: "#3b7d44",
    shoe: "#26356c",
    cape: { color: "#fbf6ec", trim: "#ff5a1c" },
    ink: "#1d2347",
    acc: ["headband"],
    face: { eyes: { shape: "round", iris: "#2f8cff" }, brow: { tilt: 0.08, color: "#e0b01c" }, mouth: { kind: "smile" } },
  },
  // Fate: the King of Heroes, a golden swept crest, red eyes, gold armour over black, a smirk
  gilgamesh: {
    build: "tall",
    skin: "#f6d0aa",
    hair: { style: "crest", color: "#ffd83c" },
    jacket: "#b3121f",
    hem: "#f7bf2a",
    pants: "#7a0c18",
    belt: "#f7bf2a",
    shoe: "#f7bf2a",
    armor: { color: "#f8c22e", trim: "#fff0a0" },
    ink: "#2a1604",
    acc: ["earrings"],
    face: { eyes: { shape: "sharp", iris: "#ec1f2d" }, brow: { tilt: 0.3, color: "#e0b01c" }, mouth: { kind: "smirk" } },
  },
  // Classroom of the Elite: Chabashira, long violet hair, a grey-blue suit
  chabashira: {
    build: "tall",
    skin: "#f4cdb4",
    hair: { style: "long", color: "#7c4cd8" },
    jacket: "#4a6290",
    hem: "#e9edf6",
    pants: "#34466c",
    belt: "#e9edf6",
    shoe: "#1f2a44",
    ink: "#1a2038",
    face: { eyes: { shape: "hooded", iris: "#6a3fc8" }, brow: { tilt: 0.1, color: "#5a34a8" }, mouth: { kind: "flat" } },
  },
  // Your Name: a schoolgirl at kataware-doki, long brown hair, a red cord in it, a navy blazer
  mitsuha: {
    build: "tall",
    skin: "#f7d2b8",
    hair: { style: "long", color: "#5a3426" },
    jacket: "#2b3f86",
    hem: "#e94a52",
    pants: "#2b3f86",
    belt: "#e94a52",
    shoe: "#2b2a40",
    ink: "#17204a",
    acc: ["ribbon"],
    face: { eyes: { shape: "round", iris: "#7a4a2c" }, brow: { tilt: -0.05, color: "#4a2a1c" }, mouth: { kind: "smile" }, blush: true },
  },
  // Magi: Ja'far, silver hair swept back, teal-and-white robe, a panicked open mouth
  jafar: {
    build: "broad",
    skin: "#f1c9a6",
    hair: { style: "swept", color: "#e6ebfa" },
    jacket: "#12a3a8",
    hem: "#f4c32e",
    pants: "#f3f1ea",
    belt: "#f4c32e",
    shoe: "#a9792a",
    ink: "#08323a",
    face: { eyes: { shape: "round", iris: "#6a7cd8" }, brow: { tilt: -0.3, color: "#aab4d8" }, mouth: { kind: "open" } },
  },
  // Frieren: Aura, long pale hair, two curled horns, a crimson dress, cold eyes
  aura: {
    build: "tall",
    skin: "#f4d6d0",
    hair: { style: "long", color: "#ece4ff" },
    jacket: "#c4162f",
    hem: "#1a1226",
    pants: "#1a1226",
    belt: "#1a1226",
    shoe: "#1a1226",
    robe: true,
    ink: "#2a0a14",
    acc: ["horns"],
    face: { eyes: { shape: "sharp", iris: "#e8c32a" }, brow: { tilt: 0.3, color: "#b6a8dc" }, mouth: { kind: "smirk" } },
  },
  // Fate/Zero: Iskandar, a red mane and beard, bronze armour, a crimson cloak, a booming grin
  iskandar: {
    build: "broad",
    skin: "#e9b58c",
    hair: { style: "mane", color: "#c8341a" },
    jacket: "#c4122e",
    hem: "#e6b43a",
    pants: "#7a2410",
    belt: "#e6b43a",
    shoe: "#7a2410",
    armor: { color: "#cf8a2c", trim: "#f6d070" },
    cape: { color: "#c4122e", trim: "#e6b43a" },
    ink: "#2a0a06",
    acc: ["beard"],
    face: { eyes: { shape: "round", iris: "#2f62d8" }, brow: { tilt: 0.15, color: "#a02810" }, mouth: { kind: "grin" } },
  },
  // Attack on Titan: a scout, brown hair, teal eyes, a tan jacket and a green cloak
  scout: {
    build: "tall",
    skin: "#f1c8a2",
    hair: { style: "messy", color: "#6a4228" },
    jacket: "#c8a46a",
    hem: "#2f6b4f",
    pants: "#f0e8d6",
    belt: "#4a3420",
    shoe: "#4a3420",
    cape: { color: "#2f8a5f", trim: "#f0e8d6" },
    ink: "#1d2a1e",
    face: { eyes: { shape: "sharp", iris: "#16a39a" }, brow: { tilt: 0.38, color: "#4a2c18" }, mouth: { kind: "frown" } },
  },
};
