const stars = [
  { name: "Vega", tip: "Bright, blue-white — summer triangle corner" },
  { name: "Deneb", tip: "Distant swan; light left long ago" },
  { name: "Altair", tip: "Nearby flier; quick across the night" },
];

export function SkyTonight() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{
              left: `${8 + ((i * 37) % 84)}%`,
              top: `${12 + ((i * 53) % 70)}%`,
              animationDelay: `${(i % 7) * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lavender/35 bg-lavender/[0.12] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-lavender">
          Static demo · ok
        </div>
        <h2 className="text-lg font-semibold text-white">Sky tonight</h2>
        <p className="mt-1 text-sm text-slate">
          A quiet sample chart — not live ephemeris. Imagine a clear northern
          evening and three familiar markers.
        </p>
        <ul className="mt-4 space-y-2">
          {stars.map((s) => (
            <li
              key={s.name}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5"
            >
              <span className="mt-0.5 text-electric">✦</span>
              <div>
                <p className="text-sm font-medium text-white">{s.name}</p>
                <p className="text-xs text-slate-muted">{s.tip}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
