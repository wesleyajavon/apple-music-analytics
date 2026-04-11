import { notFound } from 'next/navigation';

/**
 * Layout pour la page Sentry Test.
 * En production, la page est inaccessible (404).
 */
export default function SentryTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <>{children}</>;
}
