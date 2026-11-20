"use client"

import { buttonVariants } from "@taiyomoe/ui/components/button"
import { CheckCircle2, CircleX } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const REDIRECT_SECONDS = 4

export function VerificationResult({
  description,
  homeHref,
  homeLabel,
  redirectLabel,
  signInLabel,
  status,
  title,
}: {
  description: string
  homeHref: string
  homeLabel: string
  redirectLabel: string
  signInLabel: string
  status: "success" | "error"
  title: string
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    if (status !== "success") return

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    const redirect = window.setTimeout(() => {
      window.location.replace(homeHref)
    }, REDIRECT_SECONDS * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(redirect)
    }
  }, [homeHref, status])

  const Icon = status === "success" ? CheckCircle2 : CircleX

  return (
    <section
      aria-live="polite"
      className="w-full max-w-md rounded-2xl border border-nv-border bg-surface p-6 text-center shadow-xl sm:p-8"
    >
      <Icon
        aria-hidden="true"
        className={
          status === "success"
            ? "mx-auto mb-5 text-nv-success"
            : "mx-auto mb-5 text-danger"
        }
        size={56}
        strokeWidth={1.8}
      />
      <h1 className="font-bold text-2xl">{title}</h1>
      <p className="mt-3 text-nv-muted-foreground text-sm">{description}</p>

      {status === "success" ? (
        <>
          <p className="mt-3 text-nv-muted-foreground text-sm">
            {redirectLabel.replace("{seconds}", String(remainingSeconds))}
          </p>
          <Link
            className={buttonVariants({ className: "mt-6 w-full" })}
            href={homeHref}
          >
            {homeLabel}
          </Link>
        </>
      ) : (
        <div className="mt-6 grid gap-3">
          <Link
            className={buttonVariants({ className: "w-full" })}
            href="/auth/sign-in"
          >
            {signInLabel}
          </Link>
          <Link
            className={buttonVariants({
              className: "w-full",
              variant: "outline",
            })}
            href={homeHref}
          >
            {homeLabel}
          </Link>
        </div>
      )}
    </section>
  )
}
