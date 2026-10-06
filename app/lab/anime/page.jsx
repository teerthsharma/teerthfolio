import { notFound } from "next/navigation";
import AnimeLab from "../../../components/anime/AnimeLab.jsx";

// dev and preview only: production deployments 404 here
export const metadata = { title: "Anime engine lab", robots: { index: false } };
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <AnimeLab />;
}
