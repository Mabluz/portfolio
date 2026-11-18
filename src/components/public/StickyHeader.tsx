"use client";
import { useEffect, useRef, useState } from "react";

// Ignore tiny scroll movements so the header doesn't flicker on trackpads.
const THRESHOLD = 6;

/**
 * Keeps the header at the top of the viewport: it slides away while scrolling down and comes
 * back as soon as the visitor scrolls up. Always visible near the top of the page, and while
 * something inside it has keyboard focus.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(window.scrollY, 0);
      setScrolled(y > 0);
      if (y <= (ref.current?.offsetHeight ?? 0)) {
        setHidden(false);
        last = y;
      } else if (Math.abs(y - last) >= THRESHOLD) {
        setHidden(y > last);
        last = y;
      }
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`sticky top-0 z-40 border-b bg-sand transition-[translate,border-color,box-shadow] duration-300 ease-out focus-within:translate-y-0 ${
        hidden ? "-translate-y-full" : ""
      } ${scrolled && !hidden ? "border-ink/10 shadow-[0_6px_20px_-12px_rgba(43,42,36,0.35)]" : "border-transparent"}`}
    >
      {children}
    </div>
  );
}
