import type { MiddlewareHandler } from "hono";
import { timingSafeEqual } from "crypto";

export function apiKeyAuth(): MiddlewareHandler {
  return async (c, next) => {
    const apiSecret = process.env.API_SECRET;
    if (!apiSecret) {
      return c.json(
        {
          data: null,
          error: { message: "Server misconfiguration: API_SECRET not set", code: "SERVER_ERROR" },
          meta: null,
        },
        500
      );
    }

    const authHeader = c.req.header("x-api-key") ?? c.req.header("authorization");
    const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? "";

    // Constant-time comparison to prevent timing attacks
    let isValid = false;
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(apiSecret);
      if (a.length === b.length) {
        isValid = timingSafeEqual(a, b);
      }
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return c.json(
        {
          data: null,
          error: { message: "Invalid or missing API key", code: "UNAUTHORIZED" },
          meta: null,
        },
        401
      );
    }

    await next();
  };
}
