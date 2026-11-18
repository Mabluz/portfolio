"use client";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "@/components/ui/Icons";
import { deleteProjectImage, uploadProjectImages } from "@/server/actions/projects";

export type EditorImage = {
  id: number; path: string; width: number; height: number;
  galleryWidth: "FULL" | "HALF" | "THIRD"; captionNo: string; captionEn: string;
};

const WIDTHS = [
  ["FULL", "Hel bredde", 1],
  ["HALF", "Halv bredde", 2],
  ["THIRD", "En tredjedel", 3],
] as const;

type Props = { projectId: number; images: EditorImage[]; lang: "no" | "en"; onChange: (images: EditorImage[]) => void };

function Thumb({ img, index, lang, onPatch, onRemove }: { img: EditorImage; index: number; lang: "no" | "en"; onPatch: (p: Partial<EditorImage>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const n = index + 1;
  const capKey = lang === "no" ? "captionNo" : "captionEn";
  return (
    <figure ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`m-0 ${isDragging ? "relative z-10 opacity-80" : ""}`}>
      <div className="relative">
        <div className="aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-[10px] border border-line bg-sage" {...attributes} {...listeners} aria-label={`Bilde ${n}, dra for å endre rekkefølge`}>
          <Image src={`/uploads/${img.path}`} alt="" width={400} height={300} unoptimized className="pointer-events-none h-full w-full object-cover" />
        </div>
        {index === 0 && <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-forest px-2 py-[3px] text-[11px] font-semibold text-sand">Hovedbilde</span>}
        <button type="button" onClick={onRemove} aria-label={`Fjern bilde ${n}`} className="absolute top-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-paper text-muted hover:bg-tag">
          <X />
        </button>
      </div>
      <label className="sr-only" htmlFor={`cap-${img.id}`}>Bildetekst {n}</label>
      <input id={`cap-${img.id}`} value={img[capKey]} onChange={(e) => onPatch({ [capKey]: e.target.value })} placeholder="Bildetekst" className="mt-2 box-border min-h-10 w-full rounded-[10px] border border-line bg-white px-2.5 py-2 text-[13px] focus:border-forest focus:outline-2 focus:outline-forest" />
      {index === 0 ? (
        <p className="mt-2 mb-0 flex min-h-10 items-center gap-2 text-[13px] text-muted"><span aria-hidden="true" className="h-3 w-[26px] rounded-sm bg-forest" />Alltid full bredde</p>
      ) : (
        <div role="radiogroup" aria-label={`Bredde i galleriet, bilde ${n}`} className="mt-2 flex">
          {WIDTHS.map(([id, title, bars]) => (
            <button key={id} type="button" role="radio" aria-checked={img.galleryWidth === id} title={title} onClick={() => onPatch({ galleryWidth: id })}
              className={`relative flex min-h-10 flex-1 cursor-pointer items-center justify-center border first:rounded-l-lg last:rounded-r-lg [&+&]:border-l-0 ${img.galleryWidth === id ? "border-forest bg-forest text-sand" : "border-line bg-white text-[#8a8370]"}`}>
              <span aria-hidden="true" className="flex h-3 w-[26px] gap-0.5">{Array.from({ length: bars }, (_, i) => <span key={i} className="flex-1 rounded-sm bg-current" />)}</span>
              <span className="sr-only">{title}</span>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

export function ImageManager({ projectId, images, lang, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    setError(null);
    start(async () => {
      const res = await uploadProjectImages(projectId, fd);
      if (!res.ok) { setError(res.error); return; }
      onChange([...images, ...res.images.map((i, k) => ({ ...i, galleryWidth: (images.length + k === 0 ? "FULL" : "HALF") as EditorImage["galleryWidth"], captionNo: "", captionEn: "" }))]);
    });
    if (input.current) input.current.value = "";
  }

  function remove(img: EditorImage) {
    start(async () => {
      const res = await deleteProjectImage(projectId, img.id);
      if (!res.ok) setError(res.error);
      else onChange(images.filter((i) => i.id !== img.id));
    });
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = images.findIndex((i) => i.id === e.active.id);
    const to = images.findIndex((i) => i.id === e.over!.id);
    onChange(arrayMove(images, from, to));
  }

  return (
    <div>
      <label
        htmlFor="f-upload"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-2 border-dashed border-line bg-admin-bg p-8 text-center"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1F4D3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
        <span className="font-semibold">{pending ? "Laster opp…" : "Slipp bilder her, eller klikk for å velge"}</span>
        <span className="text-[13px] text-muted-2">PNG, JPG eller WebP · maks 15 MB per bilde</span>
        <input ref={input} id="f-upload" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && upload(e.target.files)} />
      </label>
      {error && <p role="alert" className="mb-4 rounded-[10px] bg-[#f6e7e4] px-3.5 py-2.5 text-sm text-[#8e2f2f]">{error}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.map((img, i) => (
              <Thumb key={img.id} img={img} index={i} lang={lang} onRemove={() => remove(img)} onPatch={(p) => onChange(images.map((x) => (x.id === img.id ? { ...x, ...p } : x)))} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
