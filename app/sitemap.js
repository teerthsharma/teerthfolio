import { SITE_URL } from "../lib/site";
import { PLACES } from "../lib/world/places";

export default function sitemap() {
  return [
    { url: `${SITE_URL}/` },
    ...PLACES.filter((p) => p.id !== "home").map((p) => ({ url: `${SITE_URL}/projects/${p.id}` })),
  ];
}
