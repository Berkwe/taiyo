import { ImageResponse } from "next/og"
import { siteConfig } from "~/site-config"

export const alt = `${siteConfig.name} — Türkçe webtoon, manga ve manhwa`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "flex-start",
        background: "#101112",
        color: "#EFF1F2",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "84px",
        width: "100%",
      }}
    >
      <div style={{ color: "#5A83A6", fontSize: 28 }}>NOVORASCANS</div>
      <div
        style={{ fontSize: 68, fontWeight: 700, marginTop: 24, maxWidth: 900 }}
      >
        Çeviri kalitesini seç. Hikâyeye odaklan.
      </div>
      <div style={{ color: "#999EA4", fontSize: 30, marginTop: 30 }}>
        Webtoon · Manga · Manhwa · Comic
      </div>
    </div>,
    size,
  )
}
