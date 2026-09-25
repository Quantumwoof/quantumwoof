import type { MetadataRoute } from "next";
import { notes } from "@/content/notes";
import { schoolTopics } from "@/content/woofSchool";
import { SITE_URL } from "@/lib/page-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ) => ({ url: `${SITE_URL}${path}`, changeFrequency, priority });

  return [
    page("/", 1, "daily"),
    page("/school", 0.9),
    ...schoolTopics
      .filter((t) => t.status === "ready")
      .map((t) => page(`/school/${t.slug}`, 0.7)),
    page("/play", 0.6),
    page("/notes", 0.6),
    ...notes.map((n) => page(`/notes/${n.slug}`, 0.5, "monthly")),
    page("/privacy", 0.2, "yearly"),
  ];
}
