import type { Metadata } from "next";
import Link from "next/link";
import { HoskyStarForm } from "@/components/games/HoskyStarForm";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Hosky Star Form · Woof games",
  description:
    "Collapse gas clouds into stars from O to M, leave black holes, neutron stars and white dwarfs, and survive the passing stars. Learn how stars form while you play.",
  path: "/play/star-form",
});

export default function StarFormPage() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <p className="card-label mb-1 hidden text-lavender sm:block">Woof games · competitive</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Hosky Star Form</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate sm:mt-2 sm:text-base">
          Gather gas, collapse it into stars, and chase the all-time top 3.{" "}
          <Link href="/play" className="text-electric hover:underline">
            Back to Woof games
          </Link>
        </p>
      </div>
      <section className="bento-card border-lavender/40 p-2.5 sm:p-5">
        <HoskyStarForm />
      </section>
    </div>
  );
}
