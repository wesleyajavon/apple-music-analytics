import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebVitals } from "@/lib/components/web-vitals";
import { SentryInit } from "@/lib/components/sentry-init";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Apple Music Analytics Dashboard",
  description: "Personal analytics dashboard for Apple Music listening behavior",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">
        <SentryInit />
        <WebVitals />
        {children}
      </body>
    </html>
  );
}

