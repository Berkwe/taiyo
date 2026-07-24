"use client"

import { Bug, X } from "lucide-react"
import { useState } from "react"
import {
  type DebugViewerRole,
  debugAccounts,
  debugViewerCookie,
} from "~/features/debug/config"

const roles = Object.keys(debugAccounts) as DebugViewerRole[]

export function DebugRoleSwitcher({
  initialRole,
}: {
  initialRole: DebugViewerRole
}) {
  const [open, setOpen] = useState(false)

  return (
    <aside className="fixed right-3 bottom-3 z-[120]">
      {open ? (
        <div className="w-72 border border-nv-border bg-surface p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="block">Debug görünümü</strong>
              <small className="text-nv-muted-foreground">
                Yalnız geliştirme ortamı
              </small>
            </div>
            <button
              aria-label="Debug panelini kapat"
              className="inline-flex size-10 items-center justify-center"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          <label className="mt-4 grid gap-2 text-sm">
            Mock hesap
            <select
              className="min-h-11 border border-nv-border bg-background px-3"
              defaultValue={initialRole}
              onChange={(event) => {
                document.cookie = `${debugViewerCookie}=${event.target.value}; Path=/; Max-Age=604800; SameSite=Lax`
                window.location.reload()
              }}
            >
              {roles.map((role) => (
                <option value={role} key={role}>
                  {role} · {debugAccounts[role].name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-nv-muted-foreground text-xs leading-5">
            Mock roller yalnız yerel geliştirmede çalışır. Yönetim işlemleri
            yerel geliştirme verisini değiştirebilir.
          </p>
        </div>
      ) : (
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-nv-border bg-surface px-4 font-semibold text-sm shadow-xl"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Bug size={17} /> Debug: {initialRole}
        </button>
      )}
    </aside>
  )
}
