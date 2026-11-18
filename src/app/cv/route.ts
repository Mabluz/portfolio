import { getSettings } from "@/lib/queries";
import { readUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET() {
  const { cvPath } = await getSettings();
  const data = cvPath ? await readUpload(cvPath) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="CV-Marius.pdf"', "Cache-Control": "no-cache" },
  });
}
