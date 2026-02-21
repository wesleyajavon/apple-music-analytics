import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20"
        aria-hidden
      />
      <div
        className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-blue-100/40 dark:bg-blue-900/20 blur-3xl -z-10"
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-indigo-100/30 dark:bg-indigo-900/15 blur-3xl -z-10"
        aria-hidden
      />
      <div className="z-10 max-w-2xl w-full flex flex-col items-center text-center">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
          Apple Music Analytics
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-4 tracking-tight">
          Welcome back, Wesley
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-10 max-w-md">
          Analyze your listening habits and discover your musical trends.
        </p>
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Access Wesley&apos;s dashboard
          <svg
            className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </main>
  );
}

