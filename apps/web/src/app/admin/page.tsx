import { db } from "@taiyomoe/db"
import { storageUrl } from "@taiyomoe/storage"
import type { Metadata } from "next"
import Link from "next/link"
import { hasPermission } from "~/features/management/permissions"
import { requireManagementUser } from "~/features/management/server"
import {
  bulkReleaseAction,
  createChapter,
  createSeries,
  deleteChapter,
  deleteSeries,
  publishRelease,
  updateAccountState,
  updateChapter,
  updateReportStatus,
  updateSeries,
  updateUserRole,
} from "./actions"
import { CbzUploadForm } from "./cbz-upload-form"

export const metadata: Metadata = {
  title: "Yönetim | NovoraScans",
  description: "NovoraScans yetkili içerik ve kullanıcı yönetimi.",
  robots: { index: false, follow: false },
}
export const runtime = "nodejs"

const inputClass = "min-h-11 border border-nv-border bg-surface px-3"
const secondaryButton =
  "min-h-11 border border-nv-border px-8 font-semibold hover:bg-surface-raised content-center"
const primaryButton =
  "min-h-11 bg-nv-primary px-4 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"

function SeriesFields({
  series,
}: {
  series?: {
    id: string
    slug: string
    originalLanguage: string
    type: string
    status: string
    publicationYear: number | null
    localizations: { title: string; description: string }[]
  }
}) {
  const localization = series?.localizations[0]
  return (
    <>
      {series ? <input name="id" type="hidden" value={series.id} /> : null}
      <label className="grid gap-1 text-sm">
        Türkçe başlık
        <input
          className={inputClass}
          defaultValue={localization?.title}
          name="title"
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        Slug
        <input
          className={inputClass}
          defaultValue={series?.slug}
          name="slug"
          required
        />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Açıklama
        <textarea
          className="min-h-24 border border-nv-border bg-surface p-3"
          defaultValue={localization?.description}
          name="description"
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        Orijinal dil
        <select
          className={inputClass}
          defaultValue={series?.originalLanguage ?? "ko"}
          name="originalLanguage"
        >
          <option value="ko">Korece</option>
          <option value="ja">Japonca</option>
          <option value="zh">Çince</option>
          <option value="tr">Türkçe</option>
          <option value="en">İngilizce</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Tür
        <select
          className={inputClass}
          defaultValue={series?.type ?? "WEBTOON"}
          name="type"
        >
          {["WEBTOON", "MANGA", "MANHWA", "MANHUA", "COMIC"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Durum
        <select
          className={inputClass}
          defaultValue={series?.status ?? "ONGOING"}
          name="status"
        >
          {["ONGOING", "COMPLETED", "HIATUS", "ANNOUNCED", "CANCELLED"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Yayın yılı
        <input
          className={inputClass}
          defaultValue={series?.publicationYear ?? ""}
          name="publicationYear"
          type="number"
        />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Kapak (JPG, PNG veya WebP; en fazla 25 MB)
        <input
          accept="image/jpeg,image/png,image/webp"
          className="min-h-11 border border-nv-border bg-surface p-2"
          name="cover"
          type="file"
        />
      </label>
    </>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string
    reportStatus?: string
    user?: string
  }>
}) {
  const actor = await requireManagementUser("series:write")
  const query = await searchParams
  const userQuery = query.user?.trim().slice(0, 100) ?? ""
  const reportQuery = query.report?.trim().slice(0, 100) ?? ""
  const reportStatus = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED"].includes(
    query.reportStatus ?? "",
  )
    ? query.reportStatus
    : ""
  const canManageUsers = hasPermission(actor.role, "users:manage")
  const canPublish = hasPermission(actor.role, "content:publish")
  const canDelete = hasPermission(actor.role, "content:delete")

  const [series, users, reports, dashboard] = await Promise.all([
    db.series.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        localizations: { where: { locale: "tr" }, take: 1 },
        chapters: {
          where: { deletedAt: null },
          orderBy: { sortKey: "desc" },
          include: {
            localizations: { where: { locale: "tr" }, take: 1 },
            releases: {
              where: { deletedAt: null },
              orderBy: { revision: "desc" },
            },
          },
        },
      },
    }),
    canManageUsers
      ? db.user.findMany({
          ...(userQuery
            ? {
                where: {
                  OR: [
                    { name: { contains: userQuery, mode: "insensitive" } },
                    {
                      username: { contains: userQuery, mode: "insensitive" },
                    },
                    { email: { contains: userQuery, mode: "insensitive" } },
                  ],
                },
              }
            : {}),
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            banned: true,
          },
        })
      : Promise.resolve([]),
    canManageUsers
      ? db.contentReport.findMany({
          where: {
            ...(reportStatus
              ? {
                  status: reportStatus as
                    | "OPEN"
                    | "REVIEWING"
                    | "RESOLVED"
                    | "REJECTED",
                }
              : {}),
            ...(reportQuery
              ? {
                  OR: [
                    {
                      description: {
                        contains: reportQuery,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      user: {
                        OR: [
                          {
                            name: {
                              contains: reportQuery,
                              mode: "insensitive" as const,
                            },
                          },
                          {
                            username: {
                              contains: reportQuery,
                              mode: "insensitive" as const,
                            },
                          },
                          {
                            email: {
                              contains: reportQuery,
                              mode: "insensitive" as const,
                            },
                          },
                        ],
                      },
                    },
                    {
                      release: {
                        chapter: {
                          series: {
                            OR: [
                              {
                                slug: {
                                  contains: reportQuery,
                                  mode: "insensitive" as const,
                                },
                              },
                              {
                                localizations: {
                                  some: {
                                    title: {
                                      contains: reportQuery,
                                      mode: "insensitive" as const,
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            user: { select: { username: true } },
            release: {
              include: {
                chapter: {
                  include: {
                    series: {
                      include: {
                        localizations: { where: { locale: "tr" }, take: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    Promise.all([
      db.user.count(),
      db.series.count({ where: { deletedAt: null } }),
      db.platformChapter.count({ where: { deletedAt: null } }),
      db.contentReport.count({
        where: { status: { in: ["OPEN", "REVIEWING"] } },
      }),
      db.task.count({ where: { status: "FAILED" } }),
      db.contentRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          entityType: true,
          action: true,
          createdAt: true,
        },
      }),
    ]).then(
      ([users, series, chapters, openReports, failedCbz, recentRevisions]) => ({
        users,
        series,
        chapters,
        openReports,
        failedCbz,
        recentRevisions,
      }),
    ),
  ])

  return (
    <main className="py-8 content-shell" id="main-content">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-nv-muted-foreground text-sm">
            {actor.role}
          </p>
          <h1 className="font-bold text-3xl">NovoraScans yönetimi</h1>
          <p className="mt-1 text-nv-muted-foreground">
            Seri, bölüm, yayın ve yetkili kullanıcı işlemleri
          </p>
        </div>
        <Link className={secondaryButton} href="/tr">
          Siteye dön
        </Link>
      </div>

      {canManageUsers ? (
        <>
          <section className="mb-10" id="dashboard">
            <h2 className="mb-4 font-bold text-2xl">Sistem özeti</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Kullanıcı", dashboard.users],
                ["Seri", dashboard.series],
                ["Bölüm", dashboard.chapters],
                ["Açık rapor", dashboard.openReports],
                ["Başarısız işlem", dashboard.failedCbz],
              ].map(([label, value]) => (
                <article
                  className="border border-nv-border bg-surface p-4"
                  key={label}
                >
                  <p className="text-nv-muted-foreground text-sm">{label}</p>
                  <strong className="mt-1 block text-3xl">{value}</strong>
                </article>
              ))}
            </div>
            <p className="mt-4 text-nv-muted-foreground text-sm">
              Ayrıntılı veritabanı, storage ve disk kontrolü:{" "}
              <a
                className="font-semibold text-nv-primary"
                href="/api/admin/health"
              >
                sistem sağlık çıktısı
              </a>
            </p>
          </section>
          <section className="mb-10" id="reports">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-bold text-2xl">İçerik raporları</h2>
                <p className="mt-1 text-nv-muted-foreground text-sm">
                  Kullanıcı, seri veya açıklama içinde arayın ve duruma göre
                  süzün.
                </p>
              </div>
              <form
                action="/admin"
                className="grid w-full gap-2 sm:max-w-2xl sm:grid-cols-[1fr_auto_auto]"
                method="get"
              >
                {userQuery ? (
                  <input name="user" type="hidden" value={userQuery} />
                ) : null}
                <input
                  aria-label="Rapor ara"
                  className={inputClass}
                  defaultValue={reportQuery}
                  name="report"
                  placeholder="Rapor ara…"
                  type="search"
                />
                <select
                  aria-label="Rapor durumu"
                  className={inputClass}
                  defaultValue={reportStatus}
                  name="reportStatus"
                >
                  <option value="">Tüm durumlar</option>
                  {["OPEN", "REVIEWING", "RESOLVED", "REJECTED"].map(
                    (status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ),
                  )}
                </select>
                <button className={secondaryButton} type="submit">
                  Filtrele
                </button>
              </form>
            </div>
            {reports.length ? (
              <div className="grid gap-3">
                {reports.map((report) => (
                  <article
                    className="border border-nv-border bg-surface p-4"
                    key={report.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {report.type === "PANEL" ? "Panel" : "Bölüm"} ·{" "}
                          {report.release.chapter.series.localizations[0]
                            ?.title ?? report.release.chapter.series.slug}{" "}
                          / Bölüm {report.release.chapter.chapterNumber}
                        </p>
                        <p className="text-nv-muted-foreground text-sm">
                          @{report.user.username} ·{" "}
                          {new Intl.DateTimeFormat("tr", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(report.createdAt)}
                        </p>
                      </div>
                      <form
                        action={updateReportStatus}
                        className="grid min-w-72 gap-2"
                      >
                        <input name="id" type="hidden" value={report.id} />
                        <select
                          className={inputClass}
                          defaultValue={report.status}
                          name="status"
                        >
                          {["OPEN", "REVIEWING", "RESOLVED", "REJECTED"].map(
                            (status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ),
                          )}
                        </select>
                        <select
                          className={inputClass}
                          defaultValue={report.assignedToId ?? ""}
                          name="assignedToId"
                        >
                          <option value="">Atanmamış</option>
                          {users
                            .filter((user) =>
                              ["EDITOR", "ADMIN"].includes(user.role),
                            )
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                        </select>
                        <textarea
                          className="min-h-20 border border-nv-border bg-surface p-3 text-sm"
                          defaultValue={report.adminNote ?? ""}
                          name="adminNote"
                          placeholder="Yalnız yöneticilerin göreceği iç not"
                        />
                        <button className={secondaryButton} type="submit">
                          Güncelle
                        </button>
                      </form>
                    </div>
                    <p className="mt-3 text-sm">{report.reasons.join(" · ")}</p>
                    {report.description ? (
                      <p className="mt-2 text-nv-muted-foreground">
                        {report.description}
                      </p>
                    ) : null}
                    {report.attachmentStorageKey ? (
                      <a
                        className="mt-3 inline-flex min-h-11 items-center border border-nv-border px-3 font-semibold text-sm"
                        href={storageUrl(report.attachmentStorageKey) ?? "#"}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ek görseli aç
                      </a>
                    ) : null}
                    {report.metadata ? (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-semibold">
                          Teknik metadata
                        </summary>
                        <pre className="mt-2 overflow-auto bg-surface-raised p-3 text-xs">
                          {JSON.stringify(report.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="border border-nv-border bg-surface p-5 text-nv-muted-foreground">
                {reportQuery || reportStatus
                  ? "Filtrelerle eşleşen rapor bulunamadı."
                  : "Henüz rapor yok."}
              </p>
            )}
          </section>
          <section className="mb-10" id="recent-activity">
            <h2 className="mb-4 font-bold text-2xl">Son kritik işlemler</h2>
            {dashboard.recentRevisions.length ? (
              <ol className="grid gap-2">
                {dashboard.recentRevisions.map((revision) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 border border-nv-border bg-surface p-3 text-sm"
                    key={revision.id}
                  >
                    <span>
                      <strong>{revision.action}</strong> · {revision.entityType}
                    </span>
                    <time
                      className="text-nv-muted-foreground"
                      dateTime={revision.createdAt.toISOString()}
                    >
                      {new Intl.DateTimeFormat("tr", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(revision.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="border border-nv-border bg-surface p-5 text-nv-muted-foreground">
                Henüz kayıtlı kritik işlem yok.
              </p>
            )}
          </section>
          <section className="mb-10" id="users">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-bold text-2xl">Kullanıcılar</h2>
                <p className="mt-1 text-nv-muted-foreground text-sm">
                  Ad, kullanıcı adı veya e-posta ile arayın.
                </p>
              </div>
              <form
                action="/admin"
                className="flex w-full max-w-md gap-2"
                method="get"
              >
                {reportQuery ? (
                  <input name="report" type="hidden" value={reportQuery} />
                ) : null}
                {reportStatus ? (
                  <input
                    name="reportStatus"
                    type="hidden"
                    value={reportStatus}
                  />
                ) : null}
                <input
                  aria-label="Kullanıcı ara"
                  className={`${inputClass} min-w-0 flex-1`}
                  defaultValue={userQuery}
                  name="user"
                  placeholder="Kullanıcı ara…"
                  type="search"
                />
                <button className={secondaryButton} type="submit">
                  Ara
                </button>
              </form>
            </div>
            <div className="overflow-x-auto border border-nv-border">
              <table className="w-full min-w-3xl text-left text-sm">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="p-3">Kullanıcı</th>
                    <th className="p-3">E-posta</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Hesap</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr className="border-nv-border border-t" key={user.id}>
                      <td className="p-3">
                        <strong>{user.name}</strong>
                        <span className="block text-nv-muted-foreground">
                          @{user.username}
                        </span>
                      </td>
                      <td className="p-3">{user.email ?? "—"}</td>
                      <td className="p-3">
                        <form action={updateUserRole} className="flex gap-2">
                          <input name="userId" type="hidden" value={user.id} />
                          <select
                            className={inputClass}
                            defaultValue={user.role}
                            disabled={actor.id === user.id}
                            name="role"
                          >
                            {["USER", "UPLOADER", "EDITOR", "ADMIN"].map(
                              (role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            className={secondaryButton}
                            disabled={actor.id === user.id}
                            type="submit"
                          >
                            Kaydet
                          </button>
                        </form>
                      </td>
                      <td className="p-3">
                        <form action={updateAccountState}>
                          <input name="userId" type="hidden" value={user.id} />
                          <input
                            name="disabled"
                            type="hidden"
                            value={user.banned ? "false" : "true"}
                          />
                          <button
                            className={secondaryButton}
                            disabled={actor.id === user.id}
                            type="submit"
                          >
                            {user.banned ? "Etkinleştir" : "Devre dışı bırak"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {!users.length ? (
                    <tr>
                      <td
                        className="p-6 text-center text-nv-muted-foreground"
                        colSpan={4}
                      >
                        Aramayla eşleşen kullanıcı bulunamadı.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {canPublish ? (
        <section className="mb-10" id="bulk-releases">
          <h2 className="mb-4 font-bold text-2xl">Toplu sürüm işlemi</h2>
          <form
            action={bulkReleaseAction}
            className="grid gap-3 border border-nv-border bg-surface p-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <label className="grid gap-1 text-sm">
              Sürüm UUID’leri (virgül veya boşlukla ayırın)
              <textarea
                className="min-h-24 border border-nv-border bg-background p-3"
                name="ids"
                required
              />
            </label>
            <label className="grid content-start gap-1 text-sm">
              İşlem
              <select className={inputClass} name="action">
                <option value="PUBLISH">Yayınla</option>
                <option value="DRAFT">Taslağa al</option>
                <option value="ARCHIVE">Arşivle</option>
              </select>
            </label>
            <button className={`${primaryButton} self-end`} type="submit">
              Onayla ve uygula
            </button>
          </form>
          <p className="mt-2 text-nv-muted-foreground text-sm">
            Yayınlamadan önce tüm sürümler doğrulanır. Bir kayıt başarısızsa
            transaction bütünüyle geri alınır.
          </p>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-4 font-bold text-2xl">Yeni seri</h2>
        <form
          action={createSeries}
          className="grid gap-4 border border-nv-border bg-surface p-5 sm:grid-cols-2"
        >
          <SeriesFields />
          <button className={primaryButton} type="submit">
            Taslak seri oluştur
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-bold text-2xl">Seriler ve bölümler</h2>
        <div className="grid gap-6">
          {series.map((item) => (
            <article
              className="border border-nv-border bg-surface p-5"
              key={item.id}
            >
              <details>
                <summary className="cursor-pointer font-bold text-xl">
                  {item.localizations[0]?.title ?? item.slug}
                  <span className="ml-2 font-normal text-nv-muted-foreground text-sm">
                    {item.chapters.length} bölüm
                  </span>
                </summary>
                <div className="mt-5 grid gap-6">
                  <form
                    action={updateSeries}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <SeriesFields series={item} />
                    <button className={primaryButton} type="submit">
                      Seriyi güncelle
                    </button>
                  </form>
                  {canDelete ? (
                    <form action={deleteSeries}>
                      <input name="id" type="hidden" value={item.id} />
                      <button className={secondaryButton} type="submit">
                        Seriyi arşivle
                      </button>
                    </form>
                  ) : null}
                  <form
                    action={createChapter}
                    className="grid gap-3 border border-nv-border p-4 sm:grid-cols-5"
                  >
                    <input name="seriesId" type="hidden" value={item.id} />
                    <input
                      className={inputClass}
                      name="chapterNumber"
                      placeholder="Bölüm no"
                      required
                    />
                    <input
                      className={inputClass}
                      min="0"
                      name="sortKey"
                      placeholder="Sıra"
                      required
                      type="number"
                    />
                    <input
                      className={inputClass}
                      name="canonicalSlug"
                      placeholder="Slug"
                      required
                    />
                    <input
                      className={inputClass}
                      name="title"
                      placeholder="Başlık"
                    />
                    <button className={primaryButton} type="submit">
                      Boş taslak ekle
                    </button>
                  </form>
                  <CbzUploadForm seriesId={item.id} />
                  <div className="grid gap-3">
                    {item.chapters.map((chapter) => (
                      <div
                        className="border border-nv-border p-4"
                        key={chapter.id}
                      >
                        <form
                          action={updateChapter}
                          className="grid gap-3 sm:grid-cols-5"
                        >
                          <input name="id" type="hidden" value={chapter.id} />
                          <input
                            name="seriesId"
                            type="hidden"
                            value={item.id}
                          />
                          <input
                            className={inputClass}
                            defaultValue={chapter.chapterNumber}
                            name="chapterNumber"
                            required
                          />
                          <input
                            className={inputClass}
                            defaultValue={chapter.sortKey}
                            name="sortKey"
                            required
                            type="number"
                          />
                          <input
                            className={inputClass}
                            defaultValue={chapter.canonicalSlug}
                            name="canonicalSlug"
                            required
                          />
                          <input
                            className={inputClass}
                            defaultValue={chapter.localizations[0]?.title ?? ""}
                            name="title"
                          />
                          <button className={secondaryButton} type="submit">
                            Bölümü güncelle
                          </button>
                        </form>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {chapter.releases.map((release) => (
                            <form action={publishRelease} key={release.id}>
                              <input
                                name="id"
                                type="hidden"
                                value={release.id}
                              />
                              <button
                                className={secondaryButton}
                                disabled={
                                  !canPublish || release.status === "PUBLISHED"
                                }
                                type="submit"
                              >
                                {release.status === "PUBLISHED"
                                  ? `Yayında · ${release.pageCount} sayfa`
                                  : `Yayınla · ${release.pageCount} sayfa`}
                              </button>
                            </form>
                          ))}
                          {canDelete ? (
                            <form action={deleteChapter}>
                              <input
                                name="id"
                                type="hidden"
                                value={chapter.id}
                              />
                              <button className={secondaryButton} type="submit">
                                Bölümü arşivle
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
