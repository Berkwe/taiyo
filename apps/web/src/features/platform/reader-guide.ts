export const readerGuideVersion = 1
export const readerGuideStorageKey = `novora:guide:reader:v${readerGuideVersion}`

export type ReaderGuideStep = "translation-choices"

export interface ReaderGuideProgress {
  version: number
  completedSteps: ReaderGuideStep[]
}

export function shouldStartReaderGuide(
  storage: Storage,
  currentProgressKey: string,
  progressKeyPrefix: string,
) {
  if (storage.getItem(readerGuideStorageKey)) return false
  return !Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).some(
    (key) => key?.startsWith(progressKeyPrefix) && key !== currentProgressKey,
  )
}

export function completeReaderGuide(storage: Storage, step: ReaderGuideStep) {
  const progress: ReaderGuideProgress = {
    version: readerGuideVersion,
    completedSteps: [step],
  }
  storage.setItem(readerGuideStorageKey, JSON.stringify(progress))
}
