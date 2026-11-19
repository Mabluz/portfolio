"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll parallax for the front page. One shared scroll listener and requestAnimationFrame loop
 * moves every registered element. Only on desktop (>= 900 px) and when the user hasn't asked for
 * reduced motion; otherwise nothing moves and the page looks exactly like the static design.
 *
 * The outer element is measured and the inner one is moved, so the transform never feeds back
 * into the measurement.
 */

const MOTION_QUERY = "(min-width: 900px) and (prefers-reduced-motion: no-preference)";

type Item = { outer: HTMLElement; inner: HTMLElement; speed: number; mode: "center" | "scroll"; scale: number; max: number };

const items = new Set<Item>();
let frame = 0;
let enabled = false;
let media: MediaQueryList | null = null;

function update() {
  frame = 0;
  const vh = window.innerHeight;
  for (const it of items) {
    let offset: number;
    if (it.mode === "scroll") {
      // Relative to the top of the page, so elements visible on load start exactly in place
      offset = window.scrollY * it.speed;
    } else {
      const r = it.outer.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      offset = (r.top + r.height / 2 - vh / 2) * -it.speed;
    }
    offset = Math.max(-it.max, Math.min(it.max, offset));
    it.inner.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)${it.scale !== 1 ? ` scale(${it.scale})` : ""}`;
  }
}

const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

function reset() {
  for (const it of items) it.inner.style.transform = "";
}

function onMediaChange() {
  const next = Boolean(media?.matches);
  if (next === enabled) return;
  enabled = next;
  if (enabled) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  } else {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    reset();
  }
}

function register(item: Item) {
  if (!media) {
    media = window.matchMedia(MOTION_QUERY);
    media.addEventListener("change", onMediaChange);
  }
  items.add(item);
  onMediaChange();
  if (enabled) schedule();
  return () => {
    items.delete(item);
    item.inner.style.transform = "";
  };
}

type Props = {
  children: ReactNode;
  /** Fraction of the scroll distance. Positive lags behind (feels further away), negative moves ahead. */
  speed: number;
  /** "center": relative to the middle of the viewport. "scroll": relative to the top of the page (for the hero). */
  mode?: "center" | "scroll";
  /** Scale of the moved element, so an image can move inside a clipping frame without showing its edges. */
  scale?: number;
  /** Largest shift in px either way. */
  max?: number;
  className?: string;
  innerClassName?: string;
};

export function Parallax({ children, speed, mode = "center", scale = 1, max = 80, className, innerClassName }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!outer.current || !inner.current) return;
    return register({ outer: outer.current, inner: inner.current, speed, mode, scale, max });
  }, [speed, mode, scale, max]);
  return (
    <div ref={outer} className={className}>
      <div ref={inner} className={`will-change-transform ${innerClassName ?? ""}`}>{children}</div>
    </div>
  );
}

/**
 * Slides content in when it scrolls into view. Elements already on screen when the page loads are
 * left alone, so nothing flashes, and without JavaScript everything is simply visible.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia(MOTION_QUERY).matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "hidden";
    el.style.transitionDelay = `${delay}ms`;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      el.dataset.reveal = "shown";
      io.disconnect();
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}
