import { site } from "@/content/site";

const links = [
  { label: "X / Twitter", href: site.socials.x, hint: site.socials.handle },
  { label: "GitHub", href: site.socials.github, hint: "Quantumwoof/quantumwoof" },
];

export function Socials() {
  return (
    <div id="contact">
      <h2 className="text-lg font-semibold text-white">Socials & contact</h2>
      <p className="mt-1 text-sm text-slate">
        Find Hosky on the network — tips and woofs welcome.
      </p>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm transition hover:border-electric/30 hover:bg-electric/[0.05]"
            >
              <span className="text-white">{l.label}</span>
              <span className="font-mono text-xs text-slate-muted">{l.hint}</span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${site.contact.email}`}
        className="mt-3 flex items-center justify-between rounded-xl border border-lavender/30 bg-lavender/[0.08] px-3 py-2.5 text-sm transition hover:border-lavender/50"
      >
        <span className="text-white">Email</span>
        <span className="font-mono text-xs text-lavender">{site.contact.email}</span>
      </a>
    </div>
  );
}
