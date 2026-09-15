"use client";

import { useCallback, useRef, useState } from "react";
import { site } from "@/content/site";

type Props = {
  name: string;
  dateLabel: string;
  woofedCount: number;
  totalTopics: number;
};

/**
 * Shareable Nebula Sniffer brag card — Web Share + canvas download.
 */
export function CertShareCard({ name, dateLabel, woofedCount, totalTopics }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const displayName = name.trim() || "Anonymous sniffer";
  const shareText = `${displayName} · Certified Nebula Sniffer · Sniffed ${woofedCount}/${totalTopics} courtyards · ${site.domainNote}/school · ${site.socials.handle}`;

  const drawCard = useCallback(async (): Promise<Blob | null> => {
    const w = 720;
    const h = 900;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Night background
    ctx.fillStyle = "#0a1224";
    ctx.fillRect(0, 0, w, h);
    // Stars
    ctx.fillStyle = "rgba(248,250,252,0.7)";
    for (let i = 0; i < 48; i++) {
      const x = ((i * 97) % (w - 40)) + 20;
      const y = ((i * 53) % (h - 40)) + 20;
      const r = 0.8 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Border card
    const pad = 48;
    ctx.strokeStyle = "rgba(212,196,253,0.55)";
    ctx.lineWidth = 3;
    roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 28);
    ctx.stroke();

    ctx.fillStyle = "#d4c4fd";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText("NEBULA SNIFFER", pad + 36, pad + 64);

    // Star badge
    ctx.strokeStyle = "#f5c542";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, pad + 180, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f5c542";
    ctx.font = "40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦", w / 2, pad + 194);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(displayName.slice(0, 28), w / 2, pad + 280);

    ctx.fillStyle = "#a8b6c8";
    ctx.font = "500 24px system-ui, sans-serif";
    ctx.fillText(`Sniffed ${woofedCount} / ${totalTopics} courtyards`, w / 2, pad + 330);
    ctx.fillText(dateLabel || "—", w / 2, pad + 370);

    ctx.fillStyle = "#d4c4fd";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(`${site.domainNote}/school`, w / 2, pad + 460);
    ctx.fillStyle = "#a8b6c8";
    ctx.font = "500 20px system-ui, sans-serif";
    ctx.fillText(site.socials.handle, w / 2, pad + 500);
    ctx.textAlign = "left";

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }, [displayName, dateLabel, woofedCount, totalTopics]);

  const onShare = async () => {
    setBusy(true);
    setNote("");
    try {
      const blob = await drawCard();
      const url = `https://${site.domainNote}/school`;
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], "nebula-sniffer.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Certified Nebula Sniffer",
            text: shareText,
            files: [file],
            url,
          });
          setNote("Shared.");
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: "Certified Nebula Sniffer", text: shareText, url });
        setNote("Shared.");
        return;
      }
      // Fallback: open X intent
      const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(intent, "_blank", "noopener,noreferrer");
      setNote("Opened share.");
    } catch {
      setNote("Share cancelled.");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    setNote("");
    try {
      const blob = await drawCard();
      if (!blob) {
        setNote("Could not render card.");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "nebula-sniffer.png";
      a.click();
      URL.revokeObjectURL(a.href);
      setNote("Saved image.");
    } catch {
      setNote("Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <p className="card-label mb-0 text-lavender">Share card</p>
      <div
        ref={cardRef}
        className="rounded-2xl border border-lavender/40 bg-navy-soft/80 px-5 py-6 text-center"
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-lavender">
          Nebula Sniffer
        </p>
        <p className="mt-4 text-3xl text-gold" aria-hidden>
          ✦
        </p>
        <p className="mt-3 text-xl font-semibold text-white">{displayName}</p>
        <p className="mt-2 text-sm text-slate">
          Sniffed {woofedCount} / {totalTopics} courtyards
        </p>
        <p className="mt-1 text-sm text-slate-muted">{dateLabel || "—"}</p>
        <p className="mt-5 text-sm text-lavender">{site.domainNote}/school</p>
        <p className="mt-1 text-xs text-slate-muted">{site.socials.handle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onShare()}
          className="rounded-full bg-lavender px-4 py-2 text-sm font-semibold text-navy transition hover:bg-lavender-soft disabled:opacity-60"
        >
          Share to X
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:border-electric/40 disabled:opacity-60"
        >
          Save image
        </button>
      </div>
      {note ? <p className="text-xs text-slate-muted">{note}</p> : null}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
