import { apiRoute } from "@/server/api";
import { getAbout, updateAbout } from "@/server/api-handlers";

export const dynamic = "force-dynamic";

export const GET = apiRoute({ write: false }, async () => ({ body: { about: await getAbout() } }));

export const PATCH = apiRoute({ write: true }, async ({ body }) => {
  const { about, audit } = await updateAbout(body);
  return { body: { about }, audit };
});
