import type { Metadata } from "next";
import { site } from "@/content/site";

export const SITE_URL = "https://www.quantumwoof.io";

/** Shared social card (baseline JPEG, 1200×630). */
export const OG_IMAGE = {
  url: "/og-x.jpg",
  width: 1200,
  height: 630,
  alt: "Hosky · QuantumWoof",
  type: "image/jpeg",
} as const;

/**
 * Per-page metadata: canonical (www, via metadataBase) plus Open Graph /
 * Twitter tags that carry this page's own title, description and URL.
 * Next merges `openGraph` / `twitter` shallowly, so each page must restate
 * the image — otherwise subpages would share the home card's text and URL.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Quantumwoof",
      type,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export const homeMetadata = pageMetadata({
  title: site.title,
  description: site.description,
  path: "/",
});
