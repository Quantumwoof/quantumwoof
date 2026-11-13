import type { SocialId } from "@/lib/starform/social";

/** Simple one-colour glyphs (currentColor) for the optional social handle. Generic shapes, not brand artwork. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function SocialGlyph({ id, size = 18 }: { id: SocialId | "none"; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false, ...S } as const;
  switch (id) {
    case "x":
      return (<svg {...p}><path d="M5 5l14 14M19 5L5 19" /></svg>);
    case "ig":
      return (<svg {...p}><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" /></svg>);
    case "tt":
      return (<svg {...p}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.5 2.6 2.2 4 4.6 4.2" /></svg>);
    case "yt":
      return (<svg {...p}><rect x="3" y="6" width="18" height="12" rx="4" /><path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor" /></svg>);
    case "tg":
      return (<svg {...p}><path d="M20 5L3.8 11.4l5.6 1.9L18 7.6l-6.6 7.1 5.4 4.3z" /><path d="M9.4 13.3l.6 5 2.3-3.1" /></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="8" /><path d="M6.5 17.5l11-11" /></svg>);
  }
}
