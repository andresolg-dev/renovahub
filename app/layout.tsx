import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import NotificationHandler from "@/components/notification-handler"
import MainLayout from "@/components/main-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RenovaHub",
  description: "Gestión centralizada de licencias de software y notificaciones de renovación.",
  manifest: "/manifest.ts",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <NotificationHandler />
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
