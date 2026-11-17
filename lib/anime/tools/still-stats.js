// Still-frame statistics over sRGB RGBA bytes: luma, HSV hue, tone shares. Pure JS, no imports.

const mod360 = (x) => ((x % 360) + 360) % 360;
const wrap180 = (x) => mod360(x + 180) - 180;

function each(rgba, w, h, fn) {
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    fn(rgba[o], rgba[o + 1], rgba[o + 2]);
  }
}

export function lumaY(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function hueOf(r, g, b) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    h = mod360(h);
  }
  return { h, s, v: max / 255 };
}

export function notan(rgba, w, h, a, b) {
  const c = [0, 0, 0];
  let n = 0;
  each(rgba, w, h, (r, g, bl) => {
    const y = lumaY(r, g, bl);
    c[y < a ? 0 : y < b ? 1 : 2]++;
    n++;
  });
  return n ? c.map((k) => (100 * k) / n) : c;
}

export function hueShare(rgba, w, h, { lo, hi, sMin = 0.25, vMin = 0.08 }) {
  let n = 0;
  let inside = 0;
  each(rgba, w, h, (r, g, b) => {
    const c = hueOf(r, g, b);
    if (!(c.s > sMin && c.v > vMin)) return;
    n++;
    if (lo <= hi ? c.h >= lo && c.h <= hi : c.h >= lo || c.h <= hi) inside++;
  });
  return { share: n ? inside / n : 0, n };
}

export function hueMedian(rgba, w, h, { sMin = 0.25, vMin = 0.08 } = {}) {
  const hues = [];
  each(rgba, w, h, (r, g, b) => {
    const c = hueOf(r, g, b);
    if (c.s > sMin && c.v > vMin) hues.push(c.h);
  });
  if (!hues.length) return null;
  const rad = Math.PI / 180;
  let sx = 0;
  let sy = 0;
  for (const d of hues) {
    sx += Math.cos(d * rad);
    sy += Math.sin(d * rad);
  }
  const centre = Math.atan2(sy, sx) / rad;
  const offs = hues.map((d) => wrap180(d - centre)).sort((p, q) => p - q);
  const m = offs.length >> 1;
  const med = offs.length % 2 ? offs[m] : (offs[m - 1] + offs[m]) / 2;
  return mod360(centre + med);
}

export function satMean(rgba, w, h) {
  let sum = 0;
  let n = 0;
  each(rgba, w, h, (r, g, b) => {
    sum += hueOf(r, g, b).s;
    n++;
  });
  return n ? sum / n : 0;
}

export function lumaStd(rgba, w, h) {
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  each(rgba, w, h, (r, g, b) => {
    const y = lumaY(r, g, b);
    sum += y;
    sum2 += y * y;
    n++;
  });
  if (!n) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
}

export function maxY(rgba, w, h) {
  let m = 0;
  each(rgba, w, h, (r, g, b) => {
    m = Math.max(m, lumaY(r, g, b));
  });
  return m;
}

export function darkFrac(rgba, w, h, { min = 0.035, grid = [64, 40] } = {}) {
  const [gx, gy] = grid;
  let dark = 0;
  for (let cy = 0; cy < gy; cy++) {
    const y0 = Math.floor((cy * h) / gy);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / gy));
    for (let cx = 0; cx < gx; cx++) {
      const x0 = Math.floor((cx * w) / gx);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / gx));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * w + x) * 4;
          sum += lumaY(rgba[o], rgba[o + 1], rgba[o + 2]);
          n++;
        }
      }
      if (sum / n < min) dark++;
    }
  }
  return dark / (gx * gy);
}
