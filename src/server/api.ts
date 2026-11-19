import "server-only";
import { z } from "zod";
import { authenticateApi, type ApiCaller } from "@/lib/api-auth";
import { ApiError, zodMessage } from "@/lib/api-format";
import { db } from "@/lib/db";

const MAX_BODY = 1024 * 1024;

type Result = { status?: number; body: unknown; audit?: string };
type Handler<P> = (ctx: { caller: ApiCaller; body: unknown; params: P; request: Request }) => Promise<Result>;

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps a /api/v1 route handler: authenticates the key (and IP whitelist) first, reads and limits
 * the JSON body for writes, maps errors to status codes and logs every write to ApiAuditLog.
 * Every API route goes through this, so none can forget the check.
 */
export function apiRoute<P = Record<string, never>>(opts: { write: boolean }, handler: Handler<P>) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    const auth = await authenticateApi(request.headers);
    if (!auth.ok) return json(auth.status, { error: auth.error });
    const { caller } = auth;
    const path = new URL(request.url).pathname;

    const log = async (status: number, summary: string) => {
      if (!opts.write) return;
      await db.apiAuditLog.create({ data: { keyId: caller.id, keyName: caller.name, ip: caller.ip, method: request.method, path, summary: summary.slice(0, 500), status } }).catch(() => {});
    };

    try {
      let body: unknown = undefined;
      if (opts.write) {
        if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) throw new ApiError(415, "Content-Type må være application/json");
        if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) throw new ApiError(413, "Forespørselen er for stor (maks 1 MB)");
        const text = await request.text();
        if (text.length > MAX_BODY) throw new ApiError(413, "Forespørselen er for stor (maks 1 MB)");
        try {
          body = text.trim() ? JSON.parse(text) : {};
        } catch {
          throw new ApiError(400, "Ugyldig JSON");
        }
      }
      const params = (context ? await context.params : {}) as P;
      const res = await handler({ caller, body, params, request });
      await log(res.status ?? 200, res.audit ?? "");
      return json(res.status ?? 200, res.body);
    } catch (e) {
      const [status, message] =
        e instanceof ApiError ? [e.status, e.message]
        : e instanceof z.ZodError ? [400, zodMessage(e)]
        : [500, "Noe gikk galt på serveren"];
      if (status === 500) console.error("[api]", e);
      await log(status, `Feil: ${message}`);
      return json(status, { error: message });
    }
  };
}
