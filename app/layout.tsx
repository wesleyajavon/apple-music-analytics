import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { WebVitals } from "@/lib/components/web-vitals";
import { SentryInit } from "@/lib/components/sentry-init";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";
import { AiMasterToggle } from "@/lib/components/ai-master-toggle";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const locale =
    headersList.get("x-next-intl-locale") || routing.defaultLocale;

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = localStorage.getItem('apple-music-analytics-theme');
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark;
                if (!stored) {
                  isDark = true;
                } else if (stored === 'light') {
                  isDark = false;
                } else if (stored === 'system') {
                  isDark = systemDark;
                } else if (stored === 'dark' || stored.indexOf('dark') === 0) {
                  isDark = true;
                } else if (stored.indexOf('light') === 0) {
                  isDark = false;
                } else {
                  isDark = true;
                }
                document.documentElement.classList.toggle('dark', isDark);
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <SentryInit />
        <WebVitals />
        <Providers>
          <NextIntlClientProvider messages={messages}>
            {children}
            <AiMasterToggle />
          </NextIntlClientProvider>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
