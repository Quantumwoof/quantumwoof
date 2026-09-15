import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start py-16 sm:py-24">
      <p className="card-label mb-2">Lost path</p>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        This trail went quiet
      </h1>
      <p className="mt-3 text-slate">
        Hosky sniffed this URL and found empty grass. No shame — gardens have
        dead ends. Pick a lit path below and keep wandering.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-electric/15 px-4 py-2 text-sm font-medium text-electric ring-1 ring-electric/30 transition hover:bg-electric/25 hover:text-white"
        >
          Back to the garden
        </Link>
        <Link
          href="/notes"
          className="rounded-full px-4 py-2 text-sm text-slate ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
        >
          Notes
        </Link>
        <Link
          href="/school"
          className="rounded-full px-4 py-2 text-sm text-slate ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
        >
          School
        </Link>
        <Link
          href="/play"
          className="rounded-full px-4 py-2 text-sm text-slate ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
        >
          Play
        </Link>
      </div>
      <p className="mt-10 font-mono text-xs text-slate-muted">404 · QuantumWoof garden</p>
    </div>
  );
}
