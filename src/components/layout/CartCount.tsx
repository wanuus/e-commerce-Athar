"use client";

import { useEffect, useRef, useState } from "react";

/** Cart badge that pops whenever the number of items changes. */
export function CartCount({ count }: { count: number }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (prev.current === count) return;
    prev.current = count;
    setBump(true);
    const id = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(id);
  }, [count]);
  if (count <= 0) return null;
  return (
    <span className={`absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1 text-[11px] font-bold text-white ${bump ? "animate-pop" : ""}`}>
      {count}
    </span>
  );
}
