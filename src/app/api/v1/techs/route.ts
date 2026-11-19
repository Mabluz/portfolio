import { apiRoute } from "@/server/api";
import { listTechs } from "@/server/api-handlers";

export const dynamic = "force-dynamic";

/** The shared tech list. Projects refer to techs by name; unknown names are created on save. */
export const GET = apiRoute({ write: false }, async () => ({ body: { techs: await listTechs() } }));
