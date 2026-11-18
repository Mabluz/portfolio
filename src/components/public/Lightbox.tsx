"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "@/components/ui/Icons";

export type LightboxImage = { src: string; alt: string; width: number; height: number; caption: string };
export type LightboxLabels = { open: string; close: string; prev: string; next: string; counter: string };

const Ctx = createContext<((index: number) => void) | null>(null);

const navBtn = "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-sand/40 bg-ink/60 text-sand hover:border-sand hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Holds all images on the project page so the enlarged view can step between them. */
export function LightboxProvider({ images, labels, children }: { images: LightboxImage[]; labels: LightboxLabels; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  }, []);
  // Reset the state right away instead of waiting for the queued "close" event
  const close = () => { setIndex(null); dialog.current?.close(); };
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  // Lock page scroll while open. Keyed on open/closed, not the index, so stepping between
  // images doesn't save "hidden" as the value to restore.
  const isOpen = index !== null;

  // Fallback for closes that bypass close(), e.g. the browser's own Esc handling. The event
  // is queued as a task, so it can arrive late; close() and Escape below don't depend on it.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    // A late event from an earlier close must not reset a lightbox that has been opened again
    const onClose = () => { if (!el.open) setIndex(null); };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = prev; };
  }, [isOpen]);

  const img = index === null ? null : images[index];
  const many = images.length > 1;

  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        aria-label={img?.alt || labels.open}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); close(); }
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
        // A click on the backdrop lands on the dialog itself; clicks on its content don't
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-sand backdrop:bg-ink/90 open:flex open:items-center open:justify-center"
      >
        {img && (
          <figure className="pointer-events-none m-0 flex max-h-full w-full flex-col items-center gap-3 px-4 py-16 md:px-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- full-size original, already WebP */}
            <img src={img.src} alt={img.alt} width={img.width} height={img.height} className="pointer-events-auto h-auto rounded-xl border-[1.5px] border-sand/20"
              // As big as the screen allows, also beyond the file's own size, keeping its proportions
              style={{ width: `min(100%, calc((100dvh - 10rem) * ${img.width / img.height}))` }}
            />
            <figcaption className="pointer-events-auto flex items-baseline gap-3 text-center text-sm text-sand/80">
              {many && <span className="font-mono text-xs text-gold">{labels.counter.replace("{n}", String(index! + 1)).replace("{total}", String(images.length))}</span>}
              {img.caption && <span>{img.caption}</span>}
            </figcaption>
          </figure>
        )}
        <button type="button" aria-label={labels.close} autoFocus onClick={close} className={`${navBtn} absolute top-4 right-4`}><X size={18} /></button>
        {many && (
          <>
            <button type="button" aria-label={labels.prev} onClick={() => step(-1)} className={`${navBtn} absolute bottom-4 left-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2`}><ArrowLeft /></button>
            <button type="button" aria-label={labels.next} onClick={() => step(1)} className={`${navBtn} absolute right-4 bottom-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2`}><ArrowRight size={18} /></button>
          </>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

/** Makes its content (an image) open in the lightbox at the given index. */
export function LightboxTrigger({ index, label, className = "", children }: { index: number; label: string; className?: string; children: React.ReactNode }) {
  const open = useContext(Ctx);
  if (!open) return <>{children}</>;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => open(index)}
      className={`block cursor-zoom-in border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest ${className}`}
    >
      {children}
    </button>
  );
}
