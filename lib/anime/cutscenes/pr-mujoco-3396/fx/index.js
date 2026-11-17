// FX layer for pr-mujoco-3396 (deployed build 460bafd): the comic print (page.js: impact flash, balloons, credit card, banner plate) and the hits (hits.js).
// The balloons, the card, the plate and the flash run on the real clock (LINE, FLASH, R); the picture's hits on the scene clock.
import { Group, Vector3 } from "three";
import { DOCK, FACE_MOUTH, FLASH, FLASH_LEN, LINE, R } from "../clock.js";
import { Comic } from "./page.js";
import { makeHits } from "./hits.js";

const CARD = {
  title: "google-deepmind/mujoco #3396 · mujoco_warp #1541 · mujoco #3450 · merged",
  sub: "#3396: 84,033,568 bytes to 65,568 at ntree 4,096. 1,281.6x less. · #1541: 156.738 us to 101.097 us. Scratch 7,929,856 bytes to 180,224. · #3450: 15,361x fewer probes at V=40,962.",
};
const LINE_A = "If the seal eats all the fish…";
const TEXT_B = "…will the seal ever be free?";
const TEXT_C = "Free. 84,033,568 bytes to 65,568 at ntree 4,096. 1,281.6x less. 1.513x faster. 15,361x fewer probes.";
const BOLD = ["fish", "free", "Free", "1,281.6x less", "1.513x faster", "15,361x fewer probes"];
const boldOf = (text) => BOLD.filter((w) => text.includes(w));
const V = new Vector3();

const toPx = (cam, W, H, x, y, z) => {
  if (!cam) return null;
  V.set(x, y, z).project(cam);
  return V.z > 1 ? null : [(V.x * 0.5 + 0.5) * W, (0.5 - V.y * 0.5) * H];
};

export default function build(ctx) {
  const group = new Group(), hits = makeHits(ctx);
  group.add(hits.group);
  const faceMouth = [FACE_MOUTH[0] + DOCK[0], FACE_MOUTH[1] + DOCK[1], FACE_MOUTH[2] + DOCK[2]];
  let comic = null;

  return {
    group,
    update(t, dt, cue) {
      hits.update(t, cue);
      const host = ctx.engine.renderer.domElement.parentElement;
      if (!host) return;
      comic ??= new Comic(host);
      const cam = ctx.player?.camera, W = host.clientWidth || 1280, H = host.clientHeight || 720, box = ctx.player?.box;
      const bw = box ? (box[2] - box[0]) * W : 0, bh = box ? (box[3] - box[1]) * H : 0;
      const sayAt = () => {
        const m = ctx.seal.named?.()?.mouth ?? ctx.seal.chest(new Vector3());
        return toPx(cam, W, H, m.x ?? m[0], m.y ?? m[1], m.z ?? m[2]) ?? [0.6 * W, 0.4 * H];
      };
      const faceAt = toPx(cam, W, H, ...faceMouth) ?? [0.6 * W, 0.4 * H];
      const hold = !!cue?.shot?.menace;
      const lines = [];
      if (t >= LINE.A && t < LINE.B) lines.push({ slot: "a", kind: "oval", text: LINE_A, bold: boldOf(LINE_A), age: t - LINE.A, at: faceAt, left: 0.44, hold });
      if (t >= LINE.B && t < LINE.C) lines.push({ slot: "b", kind: "burst", text: TEXT_B, bold: boldOf(TEXT_B), age: t - LINE.B, at: sayAt(), hold });
      if (t >= LINE.C && t < LINE.credit) lines.push({ slot: "c", kind: "burst", text: TEXT_C, bold: boldOf(TEXT_C), age: t - LINE.C, at: sayAt(), hold });
      const banner = t < R.dock ? { state: "slam", age: t }
        : t < R.burn[0] ? { state: "dock", age: t - R.dock }
          : t < LINE.collapse[0] ? { state: "home", age: t - R.burn[0] }
            : { state: "out", age: t - LINE.collapse[0] };
      const fl = FLASH.find((f) => t >= f && t < f + FLASH_LEN);
      comic.frame({
        banner,
        lines,
        credit: t >= LINE.credit && t < LINE.collapse[0] ? { ...CARD, age: t - LINE.credit } : null,
        avoid: box ? [box[0] * W - 0.12 * bw - 6, box[1] * H - 0.25 * bh, box[2] * W + 0.12 * bw + 6, box[3] * H + 2] : null,
        flash: fl === undefined ? null : { age: t - fl },
      });
    },
    dispose() {
      comic?.dispose();
      hits.dispose();
    },
  };
}
