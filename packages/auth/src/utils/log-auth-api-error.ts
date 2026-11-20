const readString = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) return undefined

  const field = value[key as keyof typeof value]
  return typeof field === "string" ? field : undefined
}

const readNumber = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) return undefined

  const field = value[key as keyof typeof value]
  return typeof field === "number" ? field : undefined
}

export const logAuthApiError = (error: unknown) => {
  const body =
    error && typeof error === "object" && "body" in error
      ? error.body
      : undefined

  console.error("[auth-api] Unhandled authentication error", {
    code:
      readString(body, "code") ?? readString(error, "code") ?? "UNKNOWN_ERROR",
    message:
      readString(body, "message") ??
      (error instanceof Error ? error.message : "Unknown authentication error"),
    name: error instanceof Error ? error.name : typeof error,
    status: readString(error, "status"),
    statusCode: readNumber(error, "statusCode"),
    stack:
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? undefined
        : error.stack,
  })
}
