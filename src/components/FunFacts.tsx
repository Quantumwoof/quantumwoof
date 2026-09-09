"use client";

import { useState } from "react";
import { funFacts } from "@/content/site";

export function FunFacts() {
  const [i, setI] = useState(0);

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Fun facts</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate">{funFacts[i]}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {funFacts.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Fact ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 w-1.5 rounded-full transition ${
                idx === i ? "bg-electric" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setI((n) => (n + 1) % funFacts.length)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40 hover:bg-electric/10"
        >
          Another →
        </button>
      </div>
    </div>
  );
}
