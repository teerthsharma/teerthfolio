"use client";

// THE NUNATAK (plan 2.4): the granite horn, its wind scoop and drift tail as one vertex-coloured mesh, and the erratics as
// two instanced meshes whose counts follow the quality tier. Standing parts stand on heightAt; decals sit 4 cm above it.

import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, Object3D } from "three";
import { detail } from "../../../lib/world/detail";
import { ERRATICS, ROCK, SCOOP_GRID, TAIL, WIND, decal, scoopPoint } from "../../../lib/world/nunatak";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { mat } from "../palette";

const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const vert = (x, y, z, c) => [x, y, z, c[0], c[1], c[2]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const up = (a, b, c) => dot(cross(sub(b, a), sub(c, a)), [0, 1, 0]) >= 0;
const tri = (out, a, b, c) => (up(a, b, c) ? out.push(a, b, c) : out.push(a, c, b));
const quad = (out, a, b, c, d) => { tri(out, a, b, c); tri(out, a, c, d); };

const SNOW = rgb("#f0f2f7");
const RIME = rgb("#dbeaf5");
const HORN = [rgb("#b79bff"), rgb("#ffb39a")];
const SCOOP_IN = rgb("#8fc3e0");
const SCOOP_OUT = rgb("#a9d4ee");
const TAIL_C = rgb("#f5f9fd");
const AXIS = [ROCK.x + 0.3 * WIND[0], 5, ROCK.z + 0.3 * WIND[1]];
const ROCK_GEO = new IcosahedronGeometry(1, 0);
const COUNT = (rock) => ERRATICS.filter((e) => e.rock === rock).length;

const hash = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

function horn(out) {
  const N = 7;
  const rings = [[0, ROCK.base, 0, 0], [4.5, 2.9, 0.5 * WIND[0], 0.5 * WIND[1]], [8.5, 1.4, 0, 0]];
  const pts = rings.map(([y, r, dx, dz], ri) => Array.from({ length: N }, (_, k) => {
    const t = (2 * Math.PI * k) / N;
    const x = ROCK.x + dx + r * Math.cos(t) + 0.35 * (2 * hash(ri * 32 + k) - 1);
    const z = ROCK.z + dz + r * Math.sin(t) + 0.35 * (2 * hash(ri * 32 + k + 16) - 1);
    return [x, heightAt(x, z) + y, z];
  }));
  const apex = [ROCK.x + 0.6, heightAt(ROCK.x + 0.6, ROCK.z + 0.4) + ROCK.height, ROCK.z + 0.4];
  let face = 0;
  const facet = (a, b, c) => {
    const g = [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);
    const flip = dot(cross(sub(b, a), sub(c, a)), sub(g, AXIS)) < 0;
    const [p, q, r] = flip ? [a, c, b] : [a, b, c];
    const n = cross(sub(q, p), sub(r, p));
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    const u = n.map((v) => v / len);
    let col = hash(face++) < 0.5 ? HORN[0] : HORN[1];
    if (u[1] > 0.55) col = SNOW;
    else if (g[1] < ROCK.height / 3 && -(u[0] * WIND[0] + u[2] * WIND[1]) > 0.3) col = RIME;
    out.push(vert(...p, col), vert(...q, col), vert(...r, col));
  };
  for (let ri = 0; ri < 2; ri++) {
    for (let k = 0; k < N; k++) {
      facet(pts[ri][k], pts[ri][(k + 1) % N], pts[ri + 1][(k + 1) % N]);
      facet(pts[ri][k], pts[ri + 1][(k + 1) % N], pts[ri + 1][k]);
    }
  }
  for (let k = 0; k < N; k++) facet(pts[2][k], pts[2][(k + 1) % N], apex);
}

function scoop(out) {
  const { na, nr } = SCOOP_GRID;
  const at = (i, j) => {
    const [x, z] = scoopPoint(i, j);
    return vert(x, decal(x, z), z, mix(SCOOP_IN, SCOOP_OUT, j / nr));
  };
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nr; j++) quad(out, at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
  }
}

function tail(out) {
  const n = Math.ceil(TAIL.len);
  const across = [-WIND[1], WIND[0]];
  const stations = Array.from({ length: n + 1 }, (_, k) => {
    const f = k / n;
    const s = TAIL.from + TAIL.len * f;
    const w = (TAIL.width - (TAIL.width - TAIL.tip) * f) / 2;
    const cx = ROCK.x + WIND[0] * s;
    const cz = ROCK.z + WIND[1] * s;
    const edge = (sign) => {
      const x = cx + sign * across[0] * w;
      const z = cz + sign * across[1] * w;
      return vert(x, heightAt(x, z) + 0.04, z, TAIL_C);
    };
    return { l: edge(1), r: edge(-1), m: vert(cx, heightAt(cx, cz) + TAIL.high * (1 - f), cz, TAIL_C) };
  });
  for (let k = 0; k < n; k++) {
    quad(out, stations[k].l, stations[k + 1].l, stations[k + 1].m, stations[k].m);
    quad(out, stations[k].m, stations[k + 1].m, stations[k + 1].r, stations[k].r);
  }
}

function nunatak() {
  const out = [];
  horn(out);
  scoop(out);
  tail(out);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(out.flatMap((v) => v.slice(0, 3)), 3));
  g.setAttribute("color", new Float32BufferAttribute(out.flatMap((v) => v.slice(3)), 3));
  return g;
}

export default function Nunatak() {
  const geo = useMemo(nunatak, []);
  const tier = useUi((s) => s.tier);
  const granite = useRef(null);
  const dark = useRef(null);

  useLayoutEffect(() => {
    const d = new Object3D();
    for (const [mesh, rock] of [[granite.current, "granite"], [dark.current, "dark"]]) {
      ERRATICS.filter((e) => e.rock === rock).forEach((e, k) => {
        d.position.set(e.x, heightAt(e.x, e.z) + e.r * 0.45, e.z);
        d.rotation.set(0, e.spin, 0);
        d.scale.set(e.r, e.r * 0.8, e.r);
        d.updateMatrix();
        mesh.setMatrixAt(k, d.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  useLayoutEffect(() => {
    const shown = ERRATICS.slice(0, detail(ERRATICS.length, tier));
    granite.current.count = shown.filter((e) => e.rock === "granite").length;
    dark.current.count = shown.filter((e) => e.rock === "dark").length;
  }, [tier]);

  return (
    <>
      <mesh geometry={geo} material={mat("#ffffff", { vertexColors: true, roughness: 0.6 })} castShadow receiveShadow />
      <instancedMesh ref={granite} args={[ROCK_GEO, mat("#b9aea8", { roughness: 0.6 }), COUNT("granite")]} castShadow receiveShadow />
      <instancedMesh ref={dark} args={[ROCK_GEO, mat("#62636f", { roughness: 0.6 }), COUNT("dark")]} castShadow receiveShadow />
    </>
  );
}
