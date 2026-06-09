import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { WebVitals } from "@/lib/components/web-vitals";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";
import { PublicDemoProvider } from "@/lib/providers/public-demo-provider";
import { Providers } from "./providers";
import { AiMasterToggle } from "@/lib/components/ai-master-toggle";
import { ConditionalAnalytics } from "@/lib/components/conditional-analytics";
import { ConditionalSentry } from "@/lib/components/conditional-sentry";
import { CookieConsentBanner } from "@/lib/components/cookie-consent-banner";
import { GroqAiConsentPromptProvider } from "@/lib/context/groq-ai-consent-prompt-context";


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
  const publicProfileUserId = await resolveActivePublicProfileUserId();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__AMA_PUBLIC_PROFILE_USER_ID__=${JSON.stringify(publicProfileUserId)};`,
          }}
        />
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
        <WebVitals />
        <Providers>
          <PublicDemoProvider publicProfileUserId={publicProfileUserId}>
            <ConditionalSentry />
            <NextIntlClientProvider messages={messages}>
              <GroqAiConsentPromptProvider>
                {children}
                <AiMasterToggle />
                <CookieConsentBanner />
              </GroqAiConsentPromptProvider>
            </NextIntlClientProvider>
            <ConditionalAnalytics />
          </PublicDemoProvider>
        </Providers>
      </body>
    </html>
  );
}
