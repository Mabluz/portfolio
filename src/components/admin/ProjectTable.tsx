"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, Pencil, Search } from "@/components/ui/Icons";
import { reorderProjects } from "@/server/actions/projects";

export type Row = {
  id: number; slug: string; title: string; sub: string; type: "BIG" | "SMALL";
  status: "DRAFT" | "PUBLISHED" | "HIDDEN"; langs: string; updated: string; thumb: string | null;
};
type Filter = "alle" | "store" | "sma";

const STATUS = { PUBLISHED: ["Publisert", "#2F7A55"], DRAFT: ["Utkast", "#B07A2A"], HIDDEN: ["Skjult", "#8A8370"] } as const;
const iconBtn = "inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-muted no-underline hover:bg-[#efe8da] hover:text-ink";

function SortableRow({ row, draggable }: { row: Row; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !draggable });
  const [label, dot] = STATUS[row.status];
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`border-t border-[#ede6d6] hover:bg-[#fbf8f1] ${isDragging ? "relative z-10 bg-paper shadow-lg" : ""}`}>
      <td className="py-3 pr-2 pl-5">
        <button type="button" disabled={!draggable} aria-label={`Dra for å endre rekkefølge: ${row.title}`} className="flex h-9 w-6 cursor-grab touch-none items-center justify-center border-0 bg-transparent text-[#8a8370] disabled:cursor-not-allowed disabled:opacity-30" {...attributes} {...listeners}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
        </button>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-sage">
            {row.thumb && <Image src={row.thumb} alt="" width={128} height={88} unoptimized className="h-full w-full object-cover object-top" />}
          </div>
          <div>
            <p className="m-0 font-semibold">{row.title}</p>
            <p className="mt-0.5 mb-0 text-[13px] text-muted-2">{row.sub}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-3"><span className={`rounded-full px-2.5 py-1 font-mono text-xs ${row.type === "BIG" ? "bg-forest text-sand" : "bg-[#efe8da] text-ink"}`}>{row.type === "BIG" ? "Stort" : "Lite"}</span></td>
      <td className="px-2 py-3"><span className="inline-flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: dot }} />{label}</span></td>
      <td className="px-2 py-3 font-mono text-[13px] text-muted">{row.langs}</td>
      <td className="px-2 py-3 text-sm text-muted">{row.updated}</td>
      <td className="py-1.5 pr-5 pl-2 text-right whitespace-nowrap">
        <Link className={iconBtn} href={`/prosjekter/${row.slug}`} target="_blank" aria-label={`Forhåndsvis ${row.title}`}><Eye /></Link>
        <Link className={iconBtn} href={`/admin/prosjekter/${row.id}`} aria-label={`Rediger ${row.title}`}><Pencil /></Link>
      </td>
    </tr>
  );
}

export function ProjectTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("alle");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const counts = { alle: rows.length, store: rows.filter((r) => r.type === "BIG").length, sma: rows.filter((r) => r.type === "SMALL").length };
  const visible = useMemo(
    () => rows.filter((r) => (filter === "alle" || (filter === "store" ? r.type === "BIG" : r.type === "SMALL")) && r.title.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, filter, query],
  );
  const draggable = filter === "alle" && query.trim() === "";

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rows.findIndex((r) => r.id === e.active.id);
    const to = rows.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(rows, from, to);
    const before = rows;
    setRows(next);
    setError(null);
    start(async () => {
      const res = await reorderProjects(next.map((r) => r.id));
      if (!res.ok) { setRows(before); setError(res.error); }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-admin-line bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-line px-5 py-4">
        <div role="group" aria-label="Filtrer prosjekter" className="flex flex-wrap gap-2">
          {([["alle", "Alle"], ["store", "Store"], ["sma", "Små"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-medium ${filter === id ? "border-ink bg-ink text-admin-bg" : "border-line bg-paper text-ink"}`}>
              {label} ({counts[id]})
            </button>
          ))}
        </div>
        <label className="flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-admin-bg px-3">
          <Search className="text-muted-2" />
          <span className="sr-only">Søk i prosjekter</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk i prosjekter" className="w-[180px] border-0 bg-transparent text-sm text-ink outline-none" />
        </label>
      </div>
      {!draggable && rows.length > 1 && <p className="m-0 border-b border-admin-line bg-admin-bg px-5 py-2 text-[13px] text-muted-2">Vis «Alle» uten søk for å endre rekkefølgen.</p>}
      {error && <p role="alert" className="m-0 border-b border-admin-line bg-[#f6e7e4] px-5 py-2 text-sm text-[#8e2f2f]">{error}</p>}
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-xs tracking-[0.06em] text-muted-2 uppercase">
                <th className="w-9 py-3 pr-2 pl-5 font-medium"><span className="sr-only">Rekkefølge</span></th>
                <th className="px-2 py-3 font-medium">Prosjekt</th>
                <th className="px-2 py-3 font-medium">Type</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Språk</th>
                <th className="px-2 py-3 font-medium">Sist endret</th>
                <th className="py-3 pr-5 pl-2 text-right font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={visible.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {visible.map((r) => <SortableRow key={r.id} row={r} draggable={draggable} />)}
              </SortableContext>
              {visible.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-2">Ingen prosjekter å vise.</td></tr>}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
