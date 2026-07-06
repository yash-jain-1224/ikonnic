"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-20">
      <div className="max-w-md text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d90000]">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          We hit a snag loading this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Our team has been notified. You can try again, or head back to the homepage while we sort it out.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-slate-400">Error reference: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d90000] px-5 py-3 text-sm font-black text-white transition hover:bg-[#b50000]"
          >
            <RefreshCcw size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-rosegold-200/60 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-rosegold-100"
          >
            <Home size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
