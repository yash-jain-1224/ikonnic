"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  // global-error replaces the root layout, so it must render <html> and <body>
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                background: "#d90000",
                color: "#fff",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.5rem",
                fontWeight: 900,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
