import { apiRoute } from "@/server/api";
import { createProject, listProjects } from "@/server/api-handlers";

export const dynamic = "force-dynamic";

/** All projects, drafts included, in display order. */
export const GET = apiRoute({ write: false }, async () => ({ body: { projects: await listProjects() } }));

/** Creates a project (draft unless `status` says otherwise) from the same fields PATCH takes. */
export const POST = apiRoute({ write: true }, async ({ body }) => {
  const { project, audit } = await createProject(body);
  return { status: 201, body: { project }, audit };
});
