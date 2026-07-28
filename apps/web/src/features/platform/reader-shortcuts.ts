export const readerShortcutsStorageKey = "novora:reader:shortcuts"
export const readerShortcutsChangedEvent = "novora:reader-shortcuts-changed"

export type ReaderShortcuts = {
  scrollDown: string
  scrollUp: string
}

export const defaultReaderShortcuts: ReaderShortcuts = {
  scrollDown: "ArrowDown",
  scrollUp: "ArrowUp",
}

export function readReaderShortcuts(): ReaderShortcuts {
  try {
    const stored = JSON.parse(
      localStorage.getItem(readerShortcutsStorageKey) ?? "{}",
    ) as Partial<ReaderShortcuts>

    return {
      scrollDown:
        typeof stored.scrollDown === "string" && stored.scrollDown
          ? stored.scrollDown
          : defaultReaderShortcuts.scrollDown,
      scrollUp:
        typeof stored.scrollUp === "string" && stored.scrollUp
          ? stored.scrollUp
          : defaultReaderShortcuts.scrollUp,
    }
  } catch {
    return defaultReaderShortcuts
  }
}

export function saveReaderShortcuts(shortcuts: ReaderShortcuts) {
  localStorage.setItem(readerShortcutsStorageKey, JSON.stringify(shortcuts))
  window.dispatchEvent(new CustomEvent(readerShortcutsChangedEvent))
}

export function shortcutLabel(code: string, locale: "tr" | "en") {
  const labels: Record<string, { tr: string; en: string }> = {
    ArrowDown: { tr: "Aşağı ok", en: "Down arrow" },
    ArrowUp: { tr: "Yukarı ok", en: "Up arrow" },
    ArrowLeft: { tr: "Sol ok", en: "Left arrow" },
    ArrowRight: { tr: "Sağ ok", en: "Right arrow" },
    Space: { tr: "Boşluk", en: "Space" },
    Escape: { tr: "Esc", en: "Esc" },
  }

  if (labels[code]) return labels[code][locale]
  if (code.startsWith("Key")) return code.slice(3)
  if (code.startsWith("Digit")) return code.slice(5)
  return code
}
