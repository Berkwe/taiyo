"use client"

import { useEffect, useState } from "react"

export type PopupMotionState = "opening" | "open" | "closing"

export function useAnimatedPresence(open: boolean, exitDuration = 220) {
  const [rendered, setRendered] = useState(open)
  const [motionState, setMotionState] = useState<PopupMotionState>(
    open ? "open" : "closing",
  )

  useEffect(() => {
    let firstFrame = 0
    let secondFrame = 0
    let exitTimer = 0

    if (open) {
      setRendered(true)
      setMotionState("opening")
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setMotionState("open"))
      })
    } else if (rendered) {
      setMotionState("closing")
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      exitTimer = window.setTimeout(
        () => setRendered(false),
        reducedMotion ? 0 : exitDuration,
      )
    }

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      window.clearTimeout(exitTimer)
    }
  }, [exitDuration, open, rendered])

  return { motionState, rendered }
}
