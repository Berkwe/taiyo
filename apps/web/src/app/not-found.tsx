import Link from "next/link"

export default function NotFound() {
  return (
    <main
      className="grid min-h-[70vh] place-content-center text-center content-shell"
      id="main-content"
    >
      <p className="font-bold text-7xl text-nv-primary">404</p>
      <h1 className="mt-5 font-bold text-3xl">Sayfa bulunamadı</h1>
      <p className="mt-3 text-nv-muted-foreground">
        Bağlantı değişmiş veya aradığınız içerik kaldırılmış olabilir.
      </p>
      <Link
        className="mx-auto mt-7 inline-flex min-h-11 items-center bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
        href="/tr"
      >
        Ana sayfaya dön
      </Link>
    </main>
  )
}
