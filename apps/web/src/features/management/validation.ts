import { z } from "zod"
import { slugify } from "../platform/paths"

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} zorunlu`)
    .max(max, `${label} en fazla ${max} karakter olabilir`)

export const seriesInputSchema = z.object({
  id: z.uuid().optional(),
  title: text("Başlık", 160),
  description: text("Açıklama", 5_000),
  slug: text("Slug", 180).transform(slugify),
  originalLanguage: z.enum(["tr", "en", "ko", "ja", "zh"]),
  type: z.enum(["WEBTOON", "MANGA", "MANHWA", "MANHUA", "COMIC"]),
  status: z.enum(["ONGOING", "COMPLETED", "HIATUS", "ANNOUNCED", "CANCELLED"]),
  publicationYear: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 2)
      .optional(),
  ),
})

export const chapterInputSchema = z.object({
  id: z.uuid().optional(),
  seriesId: z.uuid(),
  chapterNumber: text("Bölüm numarası", 30),
  canonicalSlug: text("Bölüm slug", 180).transform(slugify),
  title: z.string().trim().max(200),
  sortKey: z.coerce.number().int().min(0).max(1_000_000),
})

export const roleInputSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["USER", "UPLOADER", "EDITOR", "ADMIN"]),
})

export const accountStateSchema = z.object({
  userId: z.uuid(),
  disabled: z.enum(["true", "false"]).transform((value) => value === "true"),
})

export function formObject(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, value]) => typeof value === "string"),
  )
}
