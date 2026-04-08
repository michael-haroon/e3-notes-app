import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logRequest, logError } from "@/lib/logger";

type Handler = (req: NextRequest, ctx: unknown) => Promise<NextResponse>;

export function withLogging(handler: Handler): Handler {
  return async (req, ctx) => {
    const start = Date.now();
    const { userId } = await auth().catch(() => ({ userId: undefined }));
    try {
      const res = await handler(req, ctx);
      logRequest(req.method, new URL(req.url).pathname, userId ?? undefined, Date.now() - start, res.status);
      return res;
    } catch (err) {
      logError(err, { method: req.method, pathname: new URL(req.url).pathname, userId });
      throw err;
    }
  };
}
