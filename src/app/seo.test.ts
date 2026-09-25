import { describe, expect, test } from "bun:test";
import robots from "./robots";
import sitemap from "./sitemap";
import { pageMetadata } from "@/lib/page-metadata";
import { notes } from "@/content/notes";
import { schoolTopics } from "@/content/woofSchool";

describe("SEO routes", () => {
  test("robots.txt allows the site, hides APIs, points at the www sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toContain("/api/");
    expect(r.sitemap).toBe("https://www.quantumwoof.io/sitemap.xml");
  });

  test("sitemap lists every public page on www and no 'later' topics", () => {
    const urls = sitemap().map((e) => e.url);
    for (const u of urls) expect(u.startsWith("https://www.quantumwoof.io/")).toBe(true);
    expect(urls).toContain("https://www.quantumwoof.io/");
    expect(urls).toContain("https://www.quantumwoof.io/school");
    expect(urls).toContain("https://www.quantumwoof.io/play");
    expect(urls).toContain("https://www.quantumwoof.io/privacy");
    for (const t of schoolTopics) {
      expect(urls.includes(`https://www.quantumwoof.io/school/${t.slug}`)).toBe(t.status === "ready");
    }
    for (const n of notes) expect(urls).toContain(`https://www.quantumwoof.io/notes/${n.slug}`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("pageMetadata gives each page its own canonical, OG text/url and the share image", () => {
    const m = pageMetadata({ title: "Woof School · Hosky", description: "d", path: "/school" });
    expect(m.alternates?.canonical).toBe("/school");
    const og = m.openGraph as { url: string; title: string; images: { url: string }[] };
    expect(og.url).toBe("/school");
    expect(og.title).toBe("Woof School · Hosky");
    expect(og.images[0].url).toBe("/og-x.jpg");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
  });
});
