import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { WebVitals } from "@/lib/components/web-vitals";
import { SentryInit } from "@/lib/components/sentry-init";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";

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
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <SentryInit />
        <WebVitals />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
