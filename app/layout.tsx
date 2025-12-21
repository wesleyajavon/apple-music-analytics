import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

