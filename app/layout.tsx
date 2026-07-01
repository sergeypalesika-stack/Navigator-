import type { Metadata, Viewport } from "next"
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: "Navigator – Sayama Travel",
  description: "Гид-ассистент Sayama Travel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Navigator",
  },
  icons: {
    apple: [
      { url: "/icon/icon-192.png", sizes: "192x192" },
      { url: "/icon/icon-512.png", sizes: "512x512" },
    ],
    icon: [
      { url: "/icon/icon-192.png", sizes: "192x192" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#0b1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body style={{margin:0, padding:0, background:"#0b1120"}}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
