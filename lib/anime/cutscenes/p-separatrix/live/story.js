
import { ease, lerp } from "./geo.js";
import { floorY, poolLevel } from "./world.js";
import { T } from "../clock.js";


export const N = 8;
const U0 = [-1.9, 0.2, 1.5, -0.3, 2.4, 0.12, -1.3, -2.6];
const BAND_SIDE = [1, -1, 1];
export const R_DROP = 0.45;
const KV = 1.25;
const KU = 1.0;
const SPEED = 1.6;
const POOL_SETTLE = 0.35;
export const PARCEL_R = 0.28;
const STALL_AT = Math.log(8.9 / 0.25) / KV;

export function makeParcels(L) {
  const v0 = -L.ridgeEnd + 0.4;
  let band = 0;
  return U0.map((u0, i) => {
    const isBand = Math.abs(u0) < 0.5;
    const side = isBand ? BAND_SIDE[band++ % 3] : Math.sign(u0);
    const sp = Math.acosh(Math.max(1.0001, (L.poolX - 0.4) / Math.abs(u0))) / KU;
    return {
      i,
      u0,
      v0,
      band: isBand,
      side,
      drop: T.flowIn + 0.3 * i,
      jump: T.jump + 0.06 * i,
      back: T.rewind + 0.07 * i,
      run: T.rewind + 0.07 * i + 0.8,
      sp,
      ru: side * L.poolX + (hash(i, 1) - 0.5) * 1.5,
      rv: L.poolV + (hash(i, 2) - 0.5) * 1.5,
      pool: 0,
      ring: 0,
      tear: 0,
    };
  });
}
function hash(i, k) {
  return (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
}
export function schedule(parcels) {
  for (const p of parcels) {
    if (p.band) {
      p.stall = p.run + STALL_AT / SPEED;
      p.tear = p.stall + 0.9;
    } else p.ring = p.run + (p.sp + POOL_SETTLE) / SPEED;
  }
  return parcels;
}

function flow(L, p, s, out) {
  out.k = 0;
  out.drop = 0;
  out.v = p.v0 * Math.exp(-KV * s);
  if (p.band) {
    out.u = p.u0 * (1 + 1.6 * ease(0, STALL_AT, s));
    if (s >= STALL_AT) {
      out.k = 2;
      out.v = -0.25;
    }
    return out;
  }
  out.u = p.u0 * Math.cosh(KU * s);
  if (s > p.sp) {
    const d = Math.min(1, (s - p.sp) / POOL_SETTLE);
    const eu = p.u0 * Math.cosh(KU * p.sp);
    const ev = p.v0 * Math.exp(-KV * p.sp);
    out.u = lerp(eu, p.side * L.poolX, d);
    out.v = lerp(ev, L.poolV, d);
    out.drop = d;
    if (d >= 1) out.k = 1;
  }
  return out;
}

export function parcelAt(L, p, t, out) {
  out.s = 0;
  out.disc = 0.42;
  out.spin = 0;
  out.tear = 0;
  out.y = -90;
  const lift = PARCEL_R;
  const place = (u, v, hover = 0) => {
    out.u = u;
    out.v = v;
    out.y = floorY(L, u, v) + lift + hover;
  };
  if (t >= p.run) {
    const s = (t - p.run) * SPEED;
    flow(L, p, s, F);
    place(F.u, F.v, F.k === 1 ? 0.0 : 0.02);
    if (F.k === 1 || F.drop > 0) {
      out.y = lerp(floorY(L, F.u, F.v) + lift, poolLevel(L, p.side) + 0.05, F.drop);
      out.s = F.k === 1 ? 2 : 1;
      out.disc = 0.42 * (1 - F.drop);
    } else if (F.k === 2) {
      out.s = 4;
      const sw = ease(0, 0.9, t - p.stall);
      out.disc = lerp(0.42, 1.65, sw);
      if (t >= p.tear) {
        out.s = 5;
        out.tear = ease(0, 0.55, t - p.tear);
        out.disc = lerp(1.65, 0.1, ease(0.1, 0.7, t - p.tear));
        if (t > p.tear + 0.9) out.s = 6;
      }
    } else {
      out.s = 1;
    }
    out.spin = s * 3.2;
    return out;
  }
  if (t >= p.back) {
    const d = ease(0, 0.8, t - p.back);
    place(lerp(p.ru, p.u0, d), lerp(p.rv, p.v0, d), 0.25 * Math.sin(Math.PI * d));
    out.s = 3;
    out.spin = -d * 9;
    return out;
  }
  if (t >= p.jump) {
    place(p.ru, p.rv);
    out.y = poolLevel(L, p.side) + 0.07 + 0.03 * Math.sin(t * 2.3 + p.i);
    out.s = 2;
    return out;
  }
  if (t >= p.drop) {
    const tau = t - p.drop;
    if (tau < R_DROP) {
      const e = tau / R_DROP;
      out.u = lerp(0, p.u0, e);
      out.v = lerp(p.v0 - 0.9, p.v0, e);
      out.y = lerp(3.1, floorY(L, p.u0, p.v0) + lift, e * e) + 0.2 * Math.sin(Math.PI * e);
      out.s = 1;
      return out;
    }
    flow(L, p, tau - R_DROP, F);
    place(F.u, F.v);
    out.s = 1;
    out.spin = (tau - R_DROP) * 3.2;
  }
  return out;
}
const F = { u: 0, v: 0, k: 0, drop: 0 };

export function gateAt(parcels, t) {
  let up = 0;
  for (const p of parcels) {
    if (p.band) continue;
    const a = t - p.ring;
    if (a > 0 && a < 1.2) up = Math.max(up, ease(0, 0.2, a) * (1 - ease(0.8, 1.2, a)));
  }
  return up;
}
export function beaconAt(parcels, t) {
  let first = Infinity;
  for (const p of parcels) if (p.band) first = Math.min(first, p.tear);
  return t >= first ? 0.5 + 0.5 * Math.sin((t - first) * 11) : 0.12;
}
