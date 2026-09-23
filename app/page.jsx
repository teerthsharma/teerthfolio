import SealGame from "../components/world/SealGame";
import { PLACES, PROFILE } from "../lib/world/places";

export default function Home() {
  return (
    <main>
      <SealGame />
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
        <h1>{PROFILE.name}: {PROFILE.title.replace("'", "’")}</h1>
        <p>{PROFILE.line}</p>
        <p><a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a></p>
        {PLACES.map((place) => (
          <article key={place.id}>
            <h2>{place.name}</h2>
            <p>{place.hook}</p>
            <ul>
              {place.proof.map((p) => (
                <li key={p.label}>{p.value} {p.label}</li>
              ))}
            </ul>
            <p>{place.body}</p>
            {place.contributions && (
              <ul>
                {place.contributions.map((c) => (
                  <li key={`${c.repo}#${c.pr}`}>
                    <a href={c.url ?? `https://github.com/${c.repo}/pull/${c.pr}`}>
                      {c.repo} #{c.pr}: {c.what} — {c.result}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <ul>
              {place.links.map((l) => (
                <li key={l.url}><a href={l.url}>{l.label}</a></li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
