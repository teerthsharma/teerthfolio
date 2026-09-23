// Copies the island's words from teerthsharma.github.io, verbatim.
//
// The landing site is the source of truth for every claim on the island: its
// eleven upstream cards (index.html) and eleven project cards (work.html),
// each with its figure's title and description. This script parses those two
// files and writes data/showcase.json, so nothing on the island is
// paraphrased by hand or by an agent. Re-run it whenever the landing site
// changes:
//
//   node scripts/extract-showcase.mjs [path/to/teerthsharma.github.io]

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const site = process.argv[2] || path.resolve("../teerthsharma.github.io");
const read = (f) => readFileSync(path.join(site, f), "utf8");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", minus: "−", times: "×", middot: "·", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…", rarr: "→", gamma: "γ", rho: "ρ" };
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
const text = (html) => decode(html.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const one = (block, re) => {
  const m = block.match(re);
  return m ? text(m[1]) : null;
};
const all = (block, re) => [...block.matchAll(re)].map((m) => text(m[1]));
const attr = (block, re) => block.match(re)?.[1] ?? null;

function figure(block) {
  return {
    name: attr(block, /data-fig="([^"]+)"/),
    viewBox: attr(block, /data-vb="([^"]+)"/),
    title: one(block, /<svg[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/),
    desc: one(block, /<desc[^>]*>([\s\S]*?)<\/desc>/),
    labels: all(block, /<text[^>]*>([\s\S]*?)<\/text>/g),
    caption: one(block, /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/),
  };
}

function articles(html, cls) {
  return [...html.matchAll(new RegExp(`<article class="${cls}[^"]*" id="([^"]+)"([^>]*)>([\\s\\S]*?)</article>`, "g"))].map((m) => ({ id: m[1], attrs: m[2], block: m[3] }));
}

const upstream = articles(read("index.html"), "card").map(({ id, block }) => {
  const repoLine = one(block, /<span class="card__repo[^"]*">([\s\S]*?)<\/span>/);
  const m = repoLine.match(/^(merged into|landed in) ([\w.-]+)\/([\w.-]+) #(\d+)$/);
  return {
    id,
    section: "upstream",
    verb: m[1],
    org: m[2],
    repo: `${m[2]}/${m[3]}`,
    pr: Number(m[4]),
    logo: attr(block, /<img src="assets\/org\/([^"]+)"/),
    title: one(block, /<h3 class="card__title">([\s\S]*?)<\/h3>/),
    body: one(block, /<p class="card__body">([\s\S]*?)<\/p>/),
    result: one(block, /<p class="card__cap[^"]*">([\s\S]*?)<\/p>/),
    tags: all(block, /<li class="tag[^"]*">([\s\S]*?)<\/li>/g),
    checks: all(block, /<ul class="ev__list">([\s\S]*?)<\/ul>/g).length ? all(block.match(/<ul class="ev__list">([\s\S]*?)<\/ul>/)[1], /<li>([\s\S]*?)<\/li>/g) : [],
    url: attr(block, /<a class="card__link" href="([^"]+)"/),
    figure: figure(block),
  };
});

const lab = articles(read("work.html"), "proj").map(({ id, attrs, block }) => ({
  id,
  section: "lab",
  name: one(block, /<h2 class="proj__name">([\s\S]*?)<\/h2>/),
  tagline: one(block, /<p class="pt__tagline">([\s\S]*?)<\/p>/),
  language: attr(attrs, /data-lang="([^"]+)"/),
  url: attr(block, /<a class="pt__cta" href="([^"]+)"/),
  more: attr(block, /<a class="pt__more" href="([^"]+)"/),
  claim: one(block, /<p class="proj__claim">([\s\S]*?)<\/p>/),
  specs: [...block.matchAll(/<span class="spec( spec--t)?">([\s\S]*?)<\/span>\s*(?=<span class="spec|<\/div>)/g)].map((s) =>
    s[1] ? { text: text(s[2]) } : { value: one(s[2], /<b class="spec__n">([\s\S]*?)<\/b>/), label: one(s[2], /<span class="spec__l">([\s\S]*?)<\/span>/) },
  ),
  tags: all(block, /<li class="tag[^"]*">([\s\S]*?)<\/li>/g),
  figure: figure(block),
}));

const index = read("index.html");

// The hero grid's proof cells give every upstream card its headline, in the
// order the landing site ranks them. The island uses both.
const headlines = [...index.matchAll(/<a class="proofcell" href="#([^"]+)"[\s\S]*?<span class="proofcell__num[^"]*">([\s\S]*?)<\/span>/g)].map((m) => ({ id: m[1], text: text(m[2]) }));
headlines.forEach((h, rank) => {
  const u = upstream.find((x) => x.id === h.id);
  if (!u) throw new Error(`hero cell ${h.id} has no card`);
  u.headline = h.text;
  u.rank = rank;
});
for (const u of upstream) if (!u.headline) throw new Error(`${u.id} has no hero headline`);
upstream.sort((a, b) => a.rank - b.rank);

const out = {
  source: "https://teerthsharma.github.io/ (index.html, work.html)",
  intro: {
    heading: one(index, /<h1[^>]*>([\s\S]*?)<\/h1>/),
    lead: one(index, /<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/),
    upstreamHeading: one(index, /<h2>(What I fixed, and where\.)<\/h2>/),
    upstreamLead: one(index, /<h2>What I fixed, and where\.<\/h2>\s*<p>([\s\S]*?)<\/p>/),
  },
  upstream,
  lab,
};

for (const u of upstream) {
  for (const k of ["title", "body", "result", "url"]) if (!u[k]) throw new Error(`${u.id} is missing ${k}`);
  if (!u.figure.name || !u.figure.desc) throw new Error(`${u.id} has no figure description`);
}
for (const p of lab) {
  for (const k of ["name", "tagline", "url", "claim"]) if (!p[k]) throw new Error(`${p.id} is missing ${k}`);
  if (!p.figure.name || !p.figure.desc) throw new Error(`${p.id} has no figure description`);
}

writeFileSync("data/showcase.json", JSON.stringify(out, null, 2) + "\n");

// The org marks the upstream cards use, served from public/org/.
mkdirSync("public/org", { recursive: true });
const orgDir = path.join(site, "assets/org");
if (existsSync(orgDir)) for (const f of readdirSync(orgDir)) copyFileSync(path.join(orgDir, f), path.join("public/org", f));

console.log(`showcase: ${upstream.length} upstream, ${lab.length} lab -> data/showcase.json`);
