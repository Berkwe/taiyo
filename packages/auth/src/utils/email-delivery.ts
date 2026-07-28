import { APIError } from "better-auth/api"

export async function deliverAuthEmail(send: () => Promise<unknown>) {
  try {
    return await send()
  } catch (error) {
    const smtpError = error as {
      code?: unknown
      responseCode?: unknown
    }

    console.error("[auth-email] Delivery failed", {
      code:
        typeof smtpError.code === "string" ? smtpError.code : "UNKNOWN_ERROR",
      responseCode:
        typeof smtpError.responseCode === "number"
          ? smtpError.responseCode
          : undefined,
    })

    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DELIVERY_FAILED",
      message: "The authentication email could not be delivered",
    })
  }
}
