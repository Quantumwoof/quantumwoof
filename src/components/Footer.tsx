import Link from "next/link";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl border-t border-white/10 px-4 py-8 text-sm text-slate-muted sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Built with curiosity · {site.name}</p>
        <p className="text-xs">
          <Link
            href="/privacy"
            className="text-electric transition hover:text-white"
          >
            Privacy
          </Link>
          {" · "}
          <a
            href={`mailto:${site.contact.email}`}
            className="text-electric transition hover:text-white"
          >
            {site.contact.email}
          </a>
          {" · "}
          <span className="text-slate">{site.domainNote}</span>
        </p>
      </div>
    </footer>
  );
}
