import { apiRoute } from "@/server/api";
import { getProject, updateProject } from "@/server/api-handlers";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** One project by id or slug. */
export const GET = apiRoute<Params>({ write: false }, async ({ params }) => ({ body: { project: await getProject(params.id) } }));

/** Partial update: top-level fields are optional, `no`/`en` merge per field, lists replace. */
export const PATCH = apiRoute<Params>({ write: true }, async ({ params, body }) => {
  const { project, audit } = await updateProject(params.id, body);
  return { body: { project }, audit };
});
