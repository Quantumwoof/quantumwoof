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

/** Share-image alt text that names the page it represents. */
function ogAlt(title: string) {
  return title === site.title ? OG_IMAGE.alt : `${title} — ${OG_IMAGE.alt}`;
}

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
      images: [{ ...OG_IMAGE, alt: ogAlt(title) }],
    },
    twitter: {
      card: "summary_large_image",
      site: site.socials.handle,
      creator: site.socials.handle,
      title,
      description,
      images: [{ url: OG_IMAGE.url, alt: ogAlt(title) }],
    },
  };
}

export const notFoundMetadata: Metadata = {
  title: "Lost in space · QuantumWoof",
  description: "This trail went quiet — pick a lit path back to the garden.",
  // No `robots` here: Next injects `<meta name="robots" content="noindex">` itself
  // for not-found pages (and a second tag would be a duplicate).
  openGraph: {
    title: "Lost in space · QuantumWoof",
    description: "This trail went quiet — pick a lit path back to the garden.",
    images: [{ ...OG_IMAGE, alt: ogAlt("Lost in space · QuantumWoof") }],
  },
  twitter: {
    card: "summary_large_image",
    site: site.socials.handle,
    creator: site.socials.handle,
    title: "Lost in space · QuantumWoof",
    images: [{ url: OG_IMAGE.url, alt: ogAlt("Lost in space · QuantumWoof") }],
  },
};

export const homeMetadata = pageMetadata({
  title: site.title,
  description: site.description,
  path: "/",
});
