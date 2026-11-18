import { readUpload } from "@/lib/uploads";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  const data = await readUpload(rel);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      // File names are random UUIDs, so a stored file never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
