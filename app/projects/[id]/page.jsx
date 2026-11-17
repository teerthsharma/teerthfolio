import { notFound } from "next/navigation";
import WorldPage, { placeTitle } from "../../../components/world/WorldPage";
import { PLACES, PROFILE } from "../../../lib/world/places";

const PROJECTS = PLACES.filter((p) => p.id !== "home");

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const place = PROJECTS.find((p) => p.id === id);
  if (!place) return {};
  return {
    title: placeTitle(place),
    description: `${place.hook} ${place.body}`,
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

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const place = PROJECTS.find((p) => p.id === id);
  if (!place) notFound();
  return <WorldPage place={place} />;
}
