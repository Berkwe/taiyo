import { auth } from "@taiyomoe/auth/server"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth.handler)

const readErrorResponse = async (response: Response) => {
  try {
    const body = (await response.clone().json()) as {
      code?: unknown
      message?: unknown
    }

    return {
      code: typeof body.code === "string" ? body.code : "UNKNOWN_ERROR",
      message:
        typeof body.message === "string"
          ? body.message
          : "Authentication request failed",
    }
  } catch {
    return {
      code: "UNKNOWN_ERROR",
      message: "Authentication request failed without a JSON response",
    }
  }
}

const isMobileRequest = (request: Request) =>
  request.headers.get("sec-ch-ua-mobile") === "?1" ||
  /Android|iPhone|iPad|Mobile/i.test(request.headers.get("user-agent") ?? "")

const withAuthErrorLogging =
  (handler: (request: Request) => Promise<Response>) =>
  async (request: Request) => {
    try {
      const response = await handler(request)

      if (!response.ok) {
        const error = await readErrorResponse(response)

        console.error("[auth-api] Authentication request failed", {
          ...error,
          host:
            request.headers.get("x-forwarded-host") ??
            request.headers.get("host"),
          method: request.method,
          mobile: isMobileRequest(request),
          origin: request.headers.get("origin"),
          path: new URL(request.url).pathname,
          requestId: request.headers.get("x-request-id"),
          status: response.status,
        })
      }

      return response
    } catch (error) {
      console.error("[auth-api] Authentication handler crashed", {
        code:
          error && typeof error === "object" && "code" in error
            ? error.code
            : "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        method: request.method,
        path: new URL(request.url).pathname,
        requestId: request.headers.get("x-request-id"),
      })
      throw error
    }
  }

export const GET = withAuthErrorLogging(handlers.GET)
export const POST = withAuthErrorLogging(handlers.POST)
