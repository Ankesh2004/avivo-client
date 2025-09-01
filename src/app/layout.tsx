"use client"
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import { SessionProvider } from "next-auth/react"
import { SocketContextProvider } from "@/context/SocketContextProvider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            <SocketContextProvider>
          <Suspense fallback={null}>
            {children}
            {/* <Analytics /> */}
          </Suspense>
          </SocketContextProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
