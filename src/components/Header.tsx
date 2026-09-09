import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
      <Link href="/" className="group flex items-center gap-3">
        <Image
          src="/hosky-mark.png"
          alt="Hosky mark"
          width={44}
          height={44}
          className="rounded-full ring-1 ring-white/15 transition group-hover:ring-electric/40"
          priority
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide text-white">Hosky</p>
          <p className="text-xs text-slate-muted">QuantumWoof garden</p>
        </div>
      </Link>
      <nav className="flex items-center gap-1 text-sm text-slate sm:gap-2">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
        >
          Garden
        </Link>
        <Link
          href="/notes"
          className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
        >
          Notes
        </Link>
        <Link
          href="/play"
          className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
        >
          Play
        </Link>
        <a
          href="#contact"
          className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
        >
          Contact
        </a>
      </nav>
    </header>
  );
}
