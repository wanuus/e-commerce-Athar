"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Sticky header that gains a shadow, a firmer background and a slimmer height once the page scrolls. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 8);
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
  }, []);
  return (
    <header
      data-scrolled={scrolled}
      className="group sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur transition-[background-color,box-shadow,border-color] duration-300 data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/95 data-[scrolled=true]:shadow-soft"
    >
      {children}
    </header>
  );
}
