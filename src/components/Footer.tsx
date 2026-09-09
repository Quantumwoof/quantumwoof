import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl border-t border-white/10 px-4 py-8 text-sm text-slate-muted sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built with curiosity · {site.name} · placeholders for{" "}
          <span className="text-slate">{site.domainNote}</span>
        </p>
        <p className="text-xs">
          Socials & email are placeholders — swap them in{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-electric-dim">
            src/content/site.ts
          </code>
        </p>
      </div>
    </footer>
  );
}
