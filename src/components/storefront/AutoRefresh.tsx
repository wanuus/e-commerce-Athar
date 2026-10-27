"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the page a few times so a payment confirmed by the (slower) webhook appears without a manual reload. */
export function AutoRefresh({ intervalMs = 4000, maxTimes = 15 }: { intervalMs?: number; maxTimes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (++n > maxTimes) return clearInterval(id);
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, maxTimes]);
  return null;
}
