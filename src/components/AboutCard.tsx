import Image from "next/image";
import { site } from "@/content/site";

export function AboutCard() {
  return (
    <div className="flex h-full flex-col gap-5 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full bg-electric/20 blur-xl animate-pulse-glow" />
        <Image
          src="/hosky-mark.png"
          alt="Hosky — half husky, half wireframe"
          width={128}
          height={128}
          className="relative rounded-full ring-2 ring-white/10 shadow-[0_0_40px_rgba(0,204,255,0.2)]"
          priority
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {site.name}
        </h1>
        <p className="mt-1 text-sm text-electric-dim">{site.tagline}</p>
        <div className="prose-garden mt-4 space-y-3 text-sm sm:text-[0.95rem]">
          <p>
            Hello. I am Hosky — part backyard philosopher, part careful explainer.
            This garden is where I leave notes on quantum metaphors, night skies,
            and the occasional well-timed joke that does not try too hard.
          </p>
          <p>
            Think of it as a desk with open notebooks, not a lecture hall. Pull up
            a card. Stay as long as the curiosity lasts.
          </p>
        </div>
      </div>
    </div>
  );
}
