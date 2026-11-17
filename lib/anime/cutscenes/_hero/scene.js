// SCENE DATA for _hero, the lab test of the articulated hero (kit/hero.js). Not a dock. Pure data.
// `&look=<id>` loads kit/hero/looks/<id>.js (default gojo), `&variant=<name>` one of its named exports.
// Three shots over 12 s: 0-4 a bust (head about 55% of the frame) cycling the eleven expressions, 4-8 a medium
// cycling arm poses then the hand shapes, 8-12 the whole body at the size a real cutscene shows it (about 16%).
// Hold one thing for the whole run with `&pose=cross&expr=rage&hands=fist` (any of them), for a still at any t.
// `&move=<name>` plays one entrance move at t = 1 s in one held full-body shot; `&second=<look id>` adds a second hero.
// Every switch (&dur &at &mo &yaw &ch &catch &formDur &cam) is listed in .oneshot/hero/API.md section 1.
const EXPR = ["neutral", "calm", "smug", "grin", "rage", "terror", "awe", "sad", "shout", "bored", "determined"];
const MEDIUM = ["sign", "fist", "pray", "cross", "guard", "cast", "salute", "point"];
const HANDS = ["open", "fist", "point", "two", "flat"];
const WIDE = ["crouch", "spin", "raise", "sit", "point-up", "hands-in-pockets", "reach", "awe", "blown"];
const FACE_OF = { sign: "calm", fist: "rage", pray: "calm", cross: "smug", guard: "rage", cast: "shout", salute: "determined", point: "grin", crouch: "rage", spin: "grin", raise: "shout", sit: "bored", blown: "terror", "hands-in-pockets": "bored", "point-up": "smug", reach: "awe", awe: "awe" };

const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const idOf = (v) => (/^[\w-]+$/.test(v ?? "") ? v : null);
const lookId = idOf(q.get("look")) ?? globalThis.__heroLookId ?? "gojo";
// set by whoever loads this scene: looks-all.js (any look) or a /lab/hero/<id> page (that look alone)
const loadLook = globalThis.__heroLoadLook ?? (() => Promise.reject(new Error("no look loader")));
const mod = await loadLook(lookId).catch(() => import("../../kit/hero/looks/gojo.js"));
const look = (q.get("variant") && mod[q.get("variant")]) || mod.default;
// `&form=<name>&formAt=<s>`: build every named export as a variant and switch to it at that time (the mid-scene form change)
const { default: _d, ...named } = mod;
const form = q.get("form") && named[q.get("form")] ? { name: q.get("form"), at: Number(q.get("formAt") ?? 6), dur: Number(q.get("formDur") ?? 0) } : null;
const hairQ = (q.get("hairo") ?? "").split(";").filter(Boolean).map((kv) => kv.split(":"));
const look2 = hairQ.length && look.hair ? { ...look, hair: { ...look.hair, ...Object.fromEntries(hairQ.map(([k, v]) => [k, Number.isNaN(Number(v)) ? v : Number(v)])) } } : look;
const hero = form ? { ...look2, variants: named } : look2;
// a second hero: slides in beside the first, guards, then falls
const secondId = idOf(q.get("second"));
export const second = secondId && {
  look: (await loadLook(secondId).catch(() => import("../../kit/hero/looks/gojo.js"))).default,
  at: [1.25, 0, -0.3], yaw: -0.5, scale: 0.9,
  track: [{ t: 1, move: "slide", from: [4.2, 0, 0.6], to: { pose: "guard", expr: "rage" } }, { t: 4.2, pose: "stagger", dur: 0.2, hold: 0.5 }, { t: 4.2, expr: "terror", dur: 0.1, hold: 0.6 },
    { t: 5, pose: "fallen", dur: 0.25, hold: 99 }, { t: 5, expr: "shut", dur: 0.1, hold: 99 }],
};

const num = (k, d) => (q.get(k) === null ? d : Number(q.get(k)));
const pairs = (s) => Object.fromEntries((s ?? "").split(";").filter(Boolean).map((kv) => { const [k, v = ""] = kv.split(":"); return [k, v.includes("/") ? v.split("/").map(Number) : Number(v)]; }));
// `&shot=hero` (head and shoulders) or `&shot=hero3` (three-quarter figure): dark stage, camera below eye level; the look's own `cool` {expr, pose, rim} is held
const shot = ["hero", "hero3"].includes(q.get("shot")) ? q.get("shot") : null;
export const heroShot = shot && { rim: q.get("rim") ? `#${q.get("rim")}` : mod.default.cool?.rim ?? null, key: q.get("key") ?? null };
const cool = mod.default.cool ?? {};
const track = [];
const hold = (key, name) => track.push({ t: 0, [key]: name, dur: 0.01, hold: 100, out: 0.01 });
const move = q.get("move");
if (shot && !q.get("expr") && !q.get("pose")) {
  hold("expr", cool.expr ?? "smirk");
  if (cool.pose && shot === "hero3") hold("pose", cool.pose);
} else if (move) {
  track.push({ t: num("at", 1), move, dur: num("dur", undefined), ...pairs(q.get("mo")), to: { pose: q.get("pose") ?? undefined, expr: q.get("expr") ?? undefined, yaw: num("yaw", undefined) } });
} else if (q.get("pose") || q.get("expr") || q.get("hands")) {
  if (q.get("pose")) hold("pose", q.get("pose"));
  if (q.get("expr")) hold("expr", q.get("expr"));
  if (q.get("hands")) hold("pose", `hand-${q.get("hands")}`);
} else {
  EXPR.forEach((e, i) => track.push({ t: 0.08 + 0.355 * i, expr: e, dur: 0.1, hold: 0.15, out: 0.1 }));
  MEDIUM.forEach((p, i) => track.push({ t: 4.05 + 0.3 * i, pose: p, dur: 0.1, hold: 0.1, out: 0.1 }, { t: 4.05 + 0.3 * i, expr: FACE_OF[p], dur: 0.1, hold: 0.1, out: 0.1 }));
  track.push({ t: 6.5, pose: "hold-out", dur: 0.15, hold: 1.4, out: 0.1 });
  HANDS.forEach((h, i) => track.push({ t: 6.6 + 0.28 * i, pose: `hand-${h}`, dur: 0.05, hold: 0.2, out: 0.03 }));
  WIDE.forEach((p, i) => track.push({ t: 8.05 + 0.44 * i, pose: p, dur: 0.12, hold: 0.2, out: 0.12 }, { t: 8.05 + 0.44 * i, expr: FACE_OF[p], dur: 0.1, hold: 0.2, out: 0.1 }));
}
if (form) track.push({ t: form.at, form: form.name, dur: form.dur });
const ch = pairs(q.get("ch")), ct = q.get("catch")?.split(";");
if (ct) ch.catch = { col: `#${ct[0]}`, glow: Number(ct[1] ?? 1), n: Number(ct[2] ?? 2) };
if (shot) ch.rim = 1;
const sg = q.get("sign")?.split("/").map(Number); // &sign=sx/sz/elbow/sy/wrx/wry/wrz[/hand index]: both arms, for tuning a two-hand pose
if (sg) Object.assign(ch, { armR: { sx: sg[0], sz: sg[1], elbow: sg[2], sy: sg[3] }, armL: { sx: sg[0], sz: sg[1], elbow: sg[2], sy: sg[3] }, wristR: { rx: sg[4], ry: sg[5], rz: sg[6] }, wristL: { rx: sg[4], ry: sg[5], rz: sg[6] }, handR: ["flat", "two", "open", "fist"][sg[7] ?? 0], handL: ["flat", "two", "open", "fist"][sg[7] ?? 0] });
if (Object.keys(ch).length) track.push({ t: 0, set: ch, dur: 0.01, hold: 100 });

// &cam=az;r;elev;fov;lx;ly;lz frames one shot for the whole clip (lab stills)
const camQ = q.get("cam")?.split(/[,;]/).map(Number);
const one = (az, r, elev, fov, look3) => [{ n: 1, t: [0, 12], law: "free", az, r, elev, fov, look: look3, minFrac: 0.01, long: !!move }];

export default {
  id: "_hero",
  title: "Hero test",
  anime: "lab",
  style: "modern-anime",
  look: {},
  fps: 12,
  duration: 12,
  seed: 1,
  palette: shot ? { skyTop: "#0b0810", skyLow: "#1a1018", ground: "#120d14", groundShade: "#07050a" } : { skyTop: "#7fa6d8", skyLow: "#f4dcc4", ground: "#9aa58a", groundShade: "#5d6a62" },
  seal: { at: [0, 0, 0], yaw: 0, scale: 1, hero, moves: [], track },
  shots: shot ? (shot === "hero" ? one(num("az", 0.42), num("r", 1.7), num("elev", 0.12), 30, [0, num("ly", 0.6), 0]) : one(num("az", 0.4), num("r", 2.4), num("elev", -0.05), 30, [0, num("ly", 0.5), 0])) : camQ ? one(camQ[0], camQ[1], camQ[2], camQ[3] ?? 30, [camQ[4] ?? 0, camQ[5] ?? 0.17, camQ[6] ?? 0]) : move ? one(0.5, 5.6, 0.5, 30, [0, 0.1, 0]) : [
    { n: 1, t: [0, 4], law: "free", az: 0.5, r: 1.5, elev: 0.3, fov: 30, look: [0, 0.3, 0] },
    { n: 2, t: [4, 8], law: "free", az: -0.4, r: 2.2, elev: 0.2, fov: 30, look: [0, 0.05, 0] },
    { n: 3, t: [8, 12], law: "free", az: 0.45, r: 7.4, elev: 0.2, fov: 36, look: [0, 0.1, 0], minFrac: 0.05 },
  ],
  beats: [],
  bubbles: [],
  lines: [],
  sfx: [],
  credit: null,
};
