"use client";

import { useState, type ReactNode } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { useCountry } from "@/hooks/useCountry";

/**
 * Blocks the play page until a country is chosen (persisted in localStorage).
 * Children render only after the visitor has a stored country.
 */
export function PlayCountryGate({ children }: { children: ReactNode }) {
  const { needsPrompt, hydrated } = useCountry();
  const [ready, setReady] = useState(false);

  const unlocked = hydrated && (!needsPrompt || ready);

  return (
    <>
      <CountryPicker
        variant="modal"
        open={hydrated && needsPrompt && !ready}
        title="Country first, then recess"
        blurb="Tell Hosky where you are so the sky toys stay hemisphere-honest. One pick, saved in localStorage — then the games unlock."
        onSaved={() => setReady(true)}
      />
      {unlocked ? (
        <div className="space-y-4">{children}</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
          <p className="text-sm text-slate">
            {hydrated
              ? "Pick a country above to open the woof games."
              : "Checking your sky…"}
          </p>
        </div>
      )}
    </>
  );
}
