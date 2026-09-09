import type { Metadata } from "next";
import Link from "next/link";
import { BentoCard } from "@/components/BentoCard";
import { ConstellationConnect } from "@/components/games/ConstellationConnect";
import { FetchPhoton } from "@/components/games/FetchPhoton";

export const metadata: Metadata = {
  title: "Woof games · Hosky",
  description: "Optional chill games from Hosky’s QuantumWoof garden.",
};

export default function PlayPage() {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="card-label mb-2">Optional recess</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Woof games</h1>
        <p className="mt-2 max-w-2xl text-slate">
          Two small diversions for when the notes can wait. No high scores that matter — just
          a bit of sky and light.{" "}
          <Link href="/" className="text-electric hover:underline">
            Back to the garden
          </Link>
        </p>
      </div>

      <BentoCard label="Sky homework" id="constellation">
        <ConstellationConnect />
      </BentoCard>

      <BentoCard label="Optics lab" id="photon">
        <FetchPhoton />
      </BentoCard>
    </div>
  );
}
