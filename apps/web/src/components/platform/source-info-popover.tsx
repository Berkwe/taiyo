"use client"

import { CircleHelp } from "lucide-react"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

export function SourceInfoPopover({
  align = "center",
  ariaLabel,
  description,
  label,
}: {
  align?: "center" | "end"
  ariaLabel?: string
  description: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)
  const tooltip = useRef<HTMLSpanElement>(null)
  const pointerFocus = useRef(false)
  const openedByHover = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    setMounted(true)
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !root.current?.contains(target) &&
        !tooltip.current?.contains(target)
      ) {
        openedByHover.current = false
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  const updatePosition = useCallback(() => {
    const trigger = root.current?.getBoundingClientRect()
    const popup = tooltip.current?.getBoundingClientRect()
    if (!trigger || !popup) return
    const viewportPadding = 8
    const preferredLeft =
      align === "end"
        ? trigger.right - popup.width
        : trigger.left + trigger.width / 2 - popup.width / 2
    const left = Math.min(
      window.innerWidth - popup.width - viewportPadding,
      Math.max(viewportPadding, preferredLeft),
    )
    const above = trigger.top - popup.height - 8
    const top =
      above >= viewportPadding
        ? above
        : Math.min(
            window.innerHeight - popup.height - viewportPadding,
            trigger.bottom + 8,
          )
    setPosition({ left, top: Math.max(viewportPadding, top) })
  }, [align])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open, updatePosition])

  return (
    <span className="relative inline-flex" ref={root}>
      <button
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={ariaLabel ?? `${label}: kaynak açıklaması`}
        className="inline-flex size-8 items-center justify-center rounded-full border border-nv-border bg-surface-raised text-foreground hover:border-nv-primary focus-visible:outline-2 focus-visible:outline-ring"
        onBlur={() => {
          openedByHover.current = false
          setOpen(false)
        }}
        onClick={() => {
          if (pointerFocus.current) {
            setOpen(true)
          } else {
            setOpen((value) => !value)
          }
          openedByHover.current = false
          pointerFocus.current = false
        }}
        onFocus={(event) => {
          if (
            !pointerFocus.current &&
            event.currentTarget.matches(":focus-visible")
          )
            setOpen(true)
        }}
        onPointerCancel={() => {
          pointerFocus.current = false
        }}
        onPointerDown={() => {
          pointerFocus.current = true
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && !open) {
            openedByHover.current = true
            setOpen(true)
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && openedByHover.current) {
            openedByHover.current = false
            setOpen(false)
          }
        }}
        type="button"
      >
        <CircleHelp aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
      {open && mounted
        ? createPortal(
            <span
              className="fixed z-50 w-64 max-w-[calc(100vw-1rem)] border border-nv-border bg-surface-raised p-3 text-left font-normal text-foreground text-xs shadow-xl"
              id={id}
              ref={tooltip}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
            >
              {description}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
