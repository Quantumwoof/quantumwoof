"use client";

import { useEffect } from "react";
import { useWoofProgress } from "@/hooks/useWoofProgress";

export function MarkVisited({ slug }: { slug: string }) {
  const { markVisited } = useWoofProgress();
  useEffect(() => {
    markVisited(slug);
  }, [slug, markVisited]);
  return null;
}
