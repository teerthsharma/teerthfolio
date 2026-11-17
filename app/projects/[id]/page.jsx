import { notFound } from "next/navigation";
import SealGame from "../../../components/world/SealGame";
import { SITE_URL } from "../../../lib/site";
import { PERSON, jsonLd } from "../../../lib/jsonld";
import { PLACES, PROFILE } from "../../../lib/world/places";

const PROJECTS = PLACES.filter((p) => p.id !== "home");

// Upstream titles are the data title plus the brand. These five would pass 60 characters, so they use shorter forms.
const SHORT_TITLE = {
  "pr-xnnpack-10801": "Reusing leading gap in the memory planner",
  "pr-tensorflow-124410": "Missing back-prop in transitive reduction",
  "pr-openxla-46539": "Deterministic GPU reduction-grouping codegen",
  "pr-topograph-432": "Gating cluster wide RBAC to applicable rules",
  "pr-pyrefly-4180": "Pinning 208-module recheck propagation panic",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }));
}

// Clips at a word so the result, ellipsis included, is at most `max` characters.
function clip(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

// Lab titles under 30 characters get the brand, as upstream titles do; longer than 60 they clip.
function placeTitle(place) {
  if (place.section === "upstream") return `${SHORT_TITLE[place.id] ?? place.title} — ${PROFILE.name}`;
  const title = `${place.name}: ${place.kind}`.replace(/\.$/, "");
  return clip(title.length < 30 ? `${title} — ${PROFILE.name}` : title, 60);
}

// Upstream descriptions open with the repo and PR. Lab descriptions under 120 characters gain the lab name.
function placeDescription(place) {
  const body = `${place.hook} ${place.body}`;
  if (place.section === "upstream") return clip(`${place.kind}: ${body}`, 160);
  return clip(body.length < 120 ? `${place.name} ${place.section}: ${body}` : body, 160);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const place = PROJECTS.find((p) => p.id === id);
  if (!place) return {};
  return {
    title: placeTitle(place),
    description: placeDescription(place),
    alternates: { canonical: `/projects/${place.id}` },
    openGraph: {
      title: placeTitle(place),
      description: place.hook,
      url: `/projects/${place.id}`,
      type: "website",
      siteName: PROFILE.name,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${PROFILE.name} — ${PROFILE.title}` }],
    },
  };
}

function Article({ place }) {
  return (
    <article>
      <p>{place.hook}</p>
      <ul>
        {place.proof.map((p, i) => (
          <li key={i}>{p.value} {p.label}</li>
        ))}
      </ul>
      <p>{place.body}</p>
      <ul>
        {place.links.map((l) => (
          <li key={l.url}><a href={l.url}>{l.label}</a></li>
        ))}
      </ul>
    </article>
  );
}

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const place = PROJECTS.find((p) => p.id === id);
  if (!place) notFound();
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: placeTitle(place),
    description: place.hook,
    url: `${SITE_URL}/projects/${place.id}`,
    codeRepository: place.links[0]?.url,
    programmingLanguage: place.language,
    author: PERSON,
  };
  return (
    <main>
      <SealGame spawn={place.id} />
      <noscript>
        <style>{`
          html, body {
            height: auto;
            overflow: visible;
            background: #fbfaf7;
          }
          .game { display: none; }
          section.sr-only {
            position: static;
            width: auto;
            height: auto;
            overflow: visible;
            clip-path: none;
            white-space: normal;
            max-width: 680px;
            margin: 0 auto;
            padding: 48px 16px;
            color: #1c1b19;
            font-family: var(--font-sans), sans-serif;
          }
          section.sr-only a { color: #163d9a; }
          section.sr-only h1, section.sr-only h2 { line-height: 1.15; letter-spacing: -0.02em; }
          section.sr-only article { border-bottom: 1px solid #e5e2da; padding: 24px 0; }
          section.sr-only article:last-of-type { border-bottom: 0; }
        `}</style>
        <div
          style={{
            background: "#fbfaf7",
            color: "#5f5b53",
            borderBottom: "1px solid #e5e2da",
            padding: "12px 16px",
            textAlign: "center",
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 14,
          }}
        >
          The island needs JavaScript. Here is the same work as plain text, or visit{" "}
          <a href={PROFILE.site} style={{ color: "#163d9a" }}>
            {PROFILE.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
          .
        </div>
      </noscript>
      <section id="crawler-copy" className="sr-only" aria-label={`${PROFILE.name}'s projects`}>
        <h1>{placeTitle(place)}</h1>
        <Article place={place} />
        <nav aria-label="More projects">
          <a href="/">{PROFILE.name}: all projects</a>
          <ul>
            {PROJECTS.filter((p) => p.id !== place.id).map((p) => (
              <li key={p.id}><a href={`/projects/${p.id}`}>{placeTitle(p)}</a></li>
            ))}
          </ul>
        </nav>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    </main>
  );
}
