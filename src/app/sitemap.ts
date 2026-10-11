import type { MetadataRoute } from "next";
import { notes } from "@/content/notes";
import { schoolTopics } from "@/content/woofSchool";
import { SITE_URL } from "@/lib/page-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  // Site pages change with each deploy; the sitemap is static, so this is the
  // build time. Notes carry their own publication date.
  const built = new Date();
  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
    lastModified: Date | string = built,
  ) => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority });

  return [
    page("/", 1, "daily"),
    page("/school", 0.9),
    ...schoolTopics
      .filter((t) => t.status === "ready")
      .map((t) => page(`/school/${t.slug}`, 0.7)),
    page("/play", 0.6),
    page("/notes", 0.6),
    ...notes.map((n) => page(`/notes/${n.slug}`, 0.5, "monthly", n.date)),
    page("/privacy", 0.2, "yearly"),
  ];
}
