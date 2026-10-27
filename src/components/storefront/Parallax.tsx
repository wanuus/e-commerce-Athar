"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Moves its content slightly slower than the page while scrolling (hero background depth). */
export function Parallax({ children, className, speed = 0.18 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.min(window.scrollY, 900) * speed;
      if (ref.current) ref.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.12)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);
  return <div ref={ref} className={`will-change-transform ${className ?? ""}`} style={{ transform: "scale(1.12)" }}>{children}</div>;
}
