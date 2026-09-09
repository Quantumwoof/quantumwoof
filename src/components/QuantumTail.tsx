"use client";

import { useState } from "react";

export function QuantumTail() {
  const [wagging, setWagging] = useState(true);

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Quantum tail</h2>
        <p className="mt-2 text-sm text-slate">
          A small widget with no academic purpose whatsoever — except reminding
          you that learning can have a sense of humor.
        </p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-navy-soft text-3xl">
          <span className={wagging ? "inline-block animate-wag" : "inline-block"}>
            〰️
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-muted">
            State:{" "}
            <span className="text-electric">
              {wagging ? "|happy⟩" : "|still⟩"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setWagging((w) => !w)}
            className="mt-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-electric/40"
          >
            {wagging ? "Collapse" : "Superpose"}
          </button>
        </div>
      </div>
    </div>
  );
}
