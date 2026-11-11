import SealGame from "./SealGame";
import { PLACES, PROFILE, SITE_URL } from "../../lib/world/places";

const PROJECTS = PLACES.filter((p) => p.id !== "home");

const PERSON = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: PROFILE.name,
  url: SITE_URL,
  email: `mailto:${PROFILE.email}`,
  sameAs: [PROFILE.github, PROFILE.site],
};

export function placeTitle(place) {
  const title = place.section === "upstream" ? `${place.kind}: ${place.name}` : `${place.name}: ${place.kind}`;
  return title.replace(/\.$/, "");
}

function Article({ place, heading }) {
  return (
    <article>
      {heading}
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

export default function WorldPage({ place }) {
  const data = place
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: placeTitle(place),
        description: place.hook,
        url: `${SITE_URL}/projects/${place.id}`,
        codeRepository: place.links[0]?.url,
        programmingLanguage: place.language,
        author: PERSON,
      }
    : {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: SITE_URL,
        name: `${PROFILE.name} — ${PROFILE.title}`,
        mainEntity: PERSON,
        hasPart: PROJECTS.map((p) => ({
          "@type": "CreativeWork",
          name: placeTitle(p),
          url: `${SITE_URL}/projects/${p.id}`,
        })),
      };

  return (
    <main>
      <SealGame spawn={place?.id} />
      <noscript>
        {/* No JS: hide the (inert) canvas shell and let the plain-text
            section below stand on its own, in the landing site's palette. */}
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
      {/* The same content as the island, as plain text for search engines and
          for visitors without JavaScript. SealGame marks it inert once the
          game runs, so its 30-odd links stop being invisible Tab stops. */}
      <section id="crawler-copy" className="sr-only" aria-label={`${PROFILE.name}'s projects`}>
        {place ? (
          <>
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
          </>
        ) : (
          <>
            <h1>{PROFILE.name}: {PROFILE.title.replace("'", "’")}</h1>
            <p>{PROFILE.line}</p>
            <p><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a></p>
            {PLACES.map((p) => (
              <Article
                key={p.id}
                place={p}
                heading={<h2>{p.id === "home" ? p.name : <a href={`/projects/${p.id}`}>{p.name}</a>}</h2>}
              />
            ))}
          </>
        )}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    </main>
  );
}
