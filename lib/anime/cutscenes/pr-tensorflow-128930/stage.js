// STAGE for pr-tensorflow-128930: the held camera of each shot and the screen-to-world maps every layer shares.
// The set is built facing each held lens (the camera never moves inside a shot), so a target is a spot in the image band (u right, v down), not a world number.
import { Matrix4, Quaternion, Vector3 } from "three";

const TAN = (deg) => Math.tan((deg * Math.PI) / 360);
export const BAND = 2.39;
export const bandFrac = (aspect) => Math.min(1, aspect / BAND);

// the held camera of every shot: a private director clone, the hero as it stands on the cut
export function cameras(ctx, aspect) {
  const D = new ctx.camera.constructor(ctx.scene, () => {});
  const at = (t) => ctx.player.sealPlace(ctx.player.law.time("cast", t));
  D.sealAt = at; D.sealState = at;
  return D.shots.map((sh) => {
    const o = D.at(sh.t0 + 1e-5, aspect);
    const eye = new Vector3(...o.eye), look = new Vector3(...o.look), up = new Vector3(Math.sin((o.dutch * Math.PI) / 180), Math.cos((o.dutch * Math.PI) / 180), 0);
    const M = new Matrix4().lookAt(eye, look, up);
    const R = new Vector3().setFromMatrixColumn(M, 0), U = new Vector3().setFromMatrixColumn(M, 1), F = new Vector3().setFromMatrixColumn(M, 2).negate();
    const hero = at(sh.t0 + 1e-5);
    return { i: sh.i, n: sh.n, t0: sh.t0, t1: sh.t1, eye, F, R, U, q: new Quaternion().setFromRotationMatrix(M), fov: o.fov, dutch: o.dutch, hero: new Vector3(...hero.at), scale: hero.scale };
  });
}
export const shotAt = (cams, t) => { let k = 0; for (let i = 0; i < cams.length; i++) if (t + 1e-6 >= cams[i].t0) k = i; return k; };

// the image band (between the bars) as ndc: u 0..1 left to right, v 0..1 top to bottom
export const bandNdc = (u, v, aspect) => [2 * u - 1, (1 - 2 * v) * bandFrac(aspect)];

export function ray(cam, u, v, aspect) {
  const [x, y] = bandNdc(u, v, aspect), th = TAN(cam.fov), tw = th * aspect;
  return cam.F.clone().addScaledVector(cam.R, x * tw).addScaledVector(cam.U, y * th).normalize();
}

// the ground point (y = h) under a screen spot
export function ground(cam, u, v, aspect, h = 0) {
  const d = ray(cam, u, v, aspect);
  return cam.eye.clone().addScaledVector(d, (h - cam.eye.y) / d.y);
}

// the point of the plane z (m along the lens axis) behind a screen spot
export function onPlane(cam, u, v, aspect, z) {
  const d = ray(cam, u, v, aspect);
  return cam.eye.clone().addScaledVector(d, z / d.dot(cam.F));
}

// world size of the image band's height / width at depth z
export const bandHeight = (cam, aspect, z) => 2 * TAN(cam.fov) * z * bandFrac(aspect);
export const bandWidth = (cam, aspect, z) => 2 * TAN(cam.fov) * z * aspect;
export const depthOf = (cam, p) => p.clone().sub(cam.eye).dot(cam.F);

// a flat card parallel to the image plane covering a screen rect [u0, u1, v0, v1] at depth z: { pos, w, h }
export function rectAt(cam, aspect, r, z) {
  return { pos: onPlane(cam, (r[0] + r[1]) / 2, (r[2] + r[3]) / 2, aspect, z), w: (r[1] - r[0]) * bandWidth(cam, aspect, z), h: (r[3] - r[2]) * bandHeight(cam, aspect, z) };
}

// a figure standing in the water with its feet at a screen spot, `hH` band heights tall: { pos, scale } (the pup is 0.8 per unit scale)
export function figureAt(cam, aspect, u, v, hH) {
  const pos = ground(cam, u, v, aspect), z = depthOf(cam, pos);
  return { pos, scale: (hH * bandHeight(cam, aspect, z)) / 0.8, z };
}

// the screen spot (u, v in the band) of a world point
export function toBand(cam, p, aspect) {
  const d = p.clone().sub(cam.eye), z = d.dot(cam.F), th = TAN(cam.fov);
  const x = d.dot(cam.R) / z / (th * aspect), y = d.dot(cam.U) / z / th;
  return [(x + 1) / 2, (1 - y / bandFrac(aspect)) / 2, z];
}
