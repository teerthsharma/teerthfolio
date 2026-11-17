import { SITE_URL } from "./site.js";
import { PROFILE } from "./world/places.js";

// The Person and WebSite nodes shared by the home page and the project pages,
// so every page refers to the same @id.
export const PERSON_ID = `${SITE_URL}/#person`;

export const PERSON = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: PROFILE.name,
  url: SITE_URL,
  sameAs: [PROFILE.github, PROFILE.site],
};

export const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: PROFILE.name,
  url: `${SITE_URL}/`,
  inLanguage: "en",
  author: { "@id": PERSON_ID },
};

// Escaped so the JSON cannot close its own <script> tag.
export const jsonLd = (data) => JSON.stringify(data).replace(/</g, "\\u003c");
