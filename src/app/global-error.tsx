"use client";

import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  void error;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "Albert Sans, sans-serif",
          background:
            "linear-gradient(180deg, rgba(230,230,250,0.92) 0%, rgba(216,212,255,0.92) 100%)",
          color: "#1B003F",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "560px",
            borderRadius: "16px",
            border: "1px solid rgba(25,25,112,0.2)",
            backgroundColor: "rgba(255,255,255,0.88)",
            boxShadow: "0 12px 30px rgba(25,25,112,0.12)",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", lineHeight: 1.2 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
            An unexpected error occurred while rendering the page.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "1px solid rgba(25,25,112,0.25)",
                borderRadius: "10px",
                backgroundColor: "#D9F20C",
                color: "#1B003F",
                fontWeight: 600,
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                border: "1px solid rgba(25,25,112,0.25)",
                borderRadius: "10px",
                backgroundColor: "transparent",
                color: "#1B003F",
                fontWeight: 600,
                padding: "10px 16px",
                textDecoration: "none",
              }}
            >
              Return home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
