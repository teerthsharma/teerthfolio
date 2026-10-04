// The two lines of each place's first arrival, per the issue #7 "two-voice
// cutscenes" comment. Pure data. Only places with a domain (domain.js) play
// theirs, in comic bubbles (components/world/ui/DomainBubbles.jsx); the rest
// are the brief for their scenes. Every number in a line must appear in data/showcase.json
// (scripts/check-world.mjs asserts it); where the two drift, the JSON wins and
// the line is rewritten.
//   a, b  who speaks ("seal" | "sil" | "land") and what
//   move  the seal's physical bit between the lines
//   seal  its pose in the lines before and after the move
//   sil   the other mouth: an original silhouette or a promoted landform, by
//         `prop`, entering as `enter`; never a face or logo
//   bold  words the comic lettering sets heavy
//   land  what the place does when it speaks (comment only)
//   num   a number that slams at showcase.json scale during the move
//   sub   a subscript under line B (never a third line)
//   back  a landform drawn behind the seal; bolt: a lightning strike on the move
const sil = (prop, enter) => ({ prop, enter });
const S = (text) => ({ who: "seal", text });
const P = (text) => ({ who: "sil", text });
const L = (text) => ({ who: "land", text });
const card = (homage, why, a, b, move, pose1, pose2, guest = null, panel = "two-shot", extra = {}) => ({ homage, why, a, b, move, seal: { pose1, pose2 }, sil: guest, panel, ...extra });

const CARDS = {
  "p-aether-lang": card("JJK koan", "The loop's identity is its strength: it stops because the shape stopped.",
    P("Are you the strongest because you are Gojeal Satarou?"), P("Or are you Gojeal Fishtarou because you are the strongest?"), "sign", "sign", "sign", sil("band", "right"), "two-shot", { bold: ["strongest", "Gojeal Satarou", "Gojeal Fishtarou"] }),
  "p-resolvent": card("Aizen", "Attention and a Markov path share one operator.",
    P("Softmax. A Markov path. Two operators?"), P("Since when were you under the impression they were two?"), "shake", "still", "lookback", sil("coat", "behind")),
  "p-epsilon-hollow": card("Eva", "Memory, files and scheduler live on one sphere.",
    L("Get in the sphere."), S("No POSIX. No libc. The sphere is the kernel."), "yeet", "point", "point", sil("finger", "top"), "solo-slam"),
  "p-caustic": card("Madara", "A collapse off reality, with no ground truth.",
    P("Wake up to reality."), S("Twenty answers. One collapse. No ground truth."), "shake", "recoil", "still", sil("dots2", "left")),
  "p-monodromy": card("Steins;Gate", "Can the loop be undone: the upper sheet answers.",
    S("El Psy Kongroo."), L("The loop closed below. Not above."), "run", "phone", "still", sil("sheet", "center"), "split"),
  "p-topological-ml-toolkit": card("Matrix", "The shape is the feature.",
    L("There is no spoon."), S("There is a Betti curve."), "hop", "open", "open", sil("spoon", "center"), "solo-slam"),
  "p-faraday": card("DB fusion", "Two fields, then the coupling is found.",
    P("Fusion."), S("Ha. E and H. Found, not assumed."), "fuse", "flipperOut", "open", sil("seal2", "right")),
  "p-nerve": card("Lelouch", "The control was built to be able to kill the result.",
    P("The only ones who should kill are those prepared to be killed."), S("3 of 4 hypotheses withdrawn. Published anyway."), "lunge", "point", "hide", sil("mask", "left")),
  "p-separatrix": card("Hokuto", "Decided by the data, or nothing is returned.",
    P("You're already dead."), S("Certified or refused. Rounding does not decide."), "stand", "still", "still", sil("sevendots", "right")),
  "p-planimeter": card("Yoda", "Exact or refused.",
    P("Do. Or do not."), P("There is no try. 495 exact. 33 refused. 0 wrong."), "shake", "small", "small", sil("cane", "bottom"), "two-shot", { num: "495" }),
  "p-tangle": card("JoJo approaching", "A certificate exists only if the loops stay linked.",
    P("Oh? You're approaching me?"), S("I can't certify you without getting closer."), "run", "still", "step", sil("hip", "right"), "chase"),
  "pr-mujoco-3396": card("Attack on Titan: the Rumbling", "84,033,568 bytes to 65,568: the seal marches over a wall of copies until one cube is left.",
    L("If the seal eats all the fish…"), S("…will the seal ever be free?"), "titan", "open", "open", sil("faces", "center"), "split", { num: "1,281.6×", sub: "84,033,568 B → 65,568 B · 1,281.6×", bolt: true, back: "fishwall" }),
  "pr-mujoco-warp-1541": card("Frieza", "The pair matrix is not the last form; the forest is.",
    L("This isn't even my final form."), S("A forest. Not a pair matrix. 1.513× faster."), "hop", "squash", "tall", sil("floor", "center"), "solo-slam"),
  "pr-mujoco-3450": card("Saitama", "A storm of probes against a single stroke.",
    L("One punch."), S("15,361× fewer probes. The hull is already there."), "lunge", "fist", "fist", sil("rays", "center"), "solo-slam", { num: "15,361×" }),
  "pr-highway-3244": card("Cars", "The slice already ruled the pairs out.",
    L("I am speed."), S("65.5× fewer comparisons. The slice already knew."), "run", "squash", "still", sil("car", "left"), "chase", { num: "65.5×" }),
  "pr-xnnpack-10801": card("shonen reveal", "The leading gap was free.",
    L("It was inside you all along."), S("The leading gap. 6.42% lower peak."), "yeet", "still", "still", sil("gap", "center"), "solo-slam", { num: "6.42%" }),
  "pr-tensorflow-124410": card("Dio muda", "The fourth control edge was already implied.",
    L("Muda muda."), S("Four edges. Three remain."), "shake", "jab", "jab", sil("dam", "center"), "solo-slam"),
  "pr-nemo-relay-481": card("JJK honoured one", "One scaffold across 23 files.",
    L("Throughout heaven and earth—"), S("I alone am the honoured one. 23 files. One scaffold."), "hop", "hide", "hide", sil("cards", "center"), "solo-slam"),
  "pr-triton-kernels-22": card("Vegeta", "804 lines and 17 tests: the scouter reads the number and breaks.",
    P("It's over 804!"), S("804 lines. 17 tests. The scouter is broken."), "lunge", "point", "open", sil("lens", "topright"), "two-shot", { num: "804", back: "triangle" }),
  "pr-openxla-46539": card("Conan", "Same program, two answers before, one after.",
    P("There is always only one truth."), S("Same program. Two answers before. One after."), "lunge", "still", "open", sil("bowtie", "right")),
  "pr-topograph-432": card("Gandalf", "Cluster-wide reach is withdrawn.",
    L("You shall not pass."), S("145 lines gated."), "lunge", "recoil", "point", sil("moat", "center"), "solo-slam"),
  "pr-pyrefly-4180": card("Naruto cycle", "A 208-module chain, pinned at the end.",
    L("The cycle ends here."), S("208 SCCs. The panic is pinned."), "sit", "still", "squash", sil("chain", "left"), "chase"),
  home: card("Vinland Saga", "Neutral zone, no radiation: nothing here is an enemy.",
    L("Neutral zone. No radiation."), S("I have no orcas, for I have no enemies."), "sit", "still", "still", sil("fin", "circle"), "solo-slam"),
};

export function punchFor(id) {
  return CARDS[id] ?? null;
}
export const PUNCH_IDS = Object.keys(CARDS);
