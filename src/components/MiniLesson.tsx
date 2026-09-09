import { miniLesson } from "@/content/site";

export function MiniLesson() {
  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-lg font-semibold text-white">Mini lesson</h2>
      <p className="text-sm font-medium text-lavender">{miniLesson.title}</p>
      <p className="text-sm leading-relaxed text-slate">{miniLesson.summary}</p>
      <div className="mt-auto rounded-xl border border-electric/30 bg-electric/[0.07] px-3 py-2.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-electric">
          Takeaway
        </p>
        <p className="mt-1 text-sm text-slate">{miniLesson.takeaway}</p>
      </div>
    </div>
  );
}
