import SealGame from "../components/world/SealGame";
import { PLACES, PROFILE } from "../lib/world/places";

export default function Home() {
  return (
    <main>
      <SealGame />
      {/* The same content as the island, as plain text for search engines and
          screen readers that never enter the canvas. */}
      <section className="sr-only" aria-label={`${PROFILE.name}'s projects`}>
        <h1>{PROFILE.name}: {PROFILE.title}</h1>
        <p>{PROFILE.line}</p>
        {PLACES.map((place) => (
          <article key={place.id}>
            <h2>{place.name}</h2>
            <p>{place.hook}</p>
            <p>{place.body}</p>
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
