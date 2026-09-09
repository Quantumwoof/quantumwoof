import Link from "next/link";

const games = [
  {
    href: "/play#constellation",
    title: "Constellation connect",
    blurb: "Trace the stars in order. A quiet connect-the-dots under night sky.",
    tag: "Focus",
  },
  {
    href: "/play#photon",
    title: "Fetch the photon",
    blurb: "Short timing rounds. Catch the rising blip — no arcade cacophony.",
    tag: "Reflex",
  },
];

export function WoofGamesTeaser() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Woof games</h2>
          <p className="mt-1 text-sm text-slate">
            Optional diversions. Skip them if you came for notes — no judgment.
          </p>
        </div>
        <Link
          href="/play"
          className="shrink-0 text-sm text-electric transition hover:text-white"
        >
          Play →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-electric/30 hover:bg-electric/[0.04]"
          >
            <span className="rounded-full bg-electric/10 px-2 py-0.5 font-mono text-[0.65rem] text-electric-dim">
              {g.tag}
            </span>
            <h3 className="mt-2 text-sm font-semibold text-white group-hover:text-electric-dim">
              {g.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate">{g.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
