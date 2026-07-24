import { appRouter, createTRPCContext } from "@taiyomoe/trpc"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import type { NextRequest } from "next/server"
import { getSession } from "~/utils/get-session"

const handler = async (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: async () =>
      createTRPCContext({
        session: await getSession(),
        headers: req.headers,
      }),
    onError({ error, path }) {
      console.error("tRPC request failed", {
        path,
        code: error.code,
        requestId: req.headers.get("x-request-id"),
      })
    },
  })
}

export { handler as GET, handler as POST }
