import { ClerkProvider } from "@clerk/nextjs";
import CellesseonTheme from "@/components/layout/cellesseon-theme";
import type { Metadata, Viewport } from "next";
import { Albert_Sans, Dosis } from "next/font/google";
import Script from "next/script";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/app/globals.css";
import MainWrapper from "@/components/layout/main-wrapper";

export const metadata: Metadata = {
  title: "Cellesseon",
  description: "Cellesseon Smart Assistent",
};

export const viewport: Viewport = {
  themeColor: "dark",
  width: "device-width",
  height: "device-height",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const dosis = Dosis({
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-jwd-dosis",
  display: "swap",
});

const albertsans = Albert_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-jwd-albertsans",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dosis.variable} ${albertsans.variable}`}
    >
      <body>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#6A0DAD",
              colorText: "#008080",
            },
          }}
        >
          <Script id="theme-init" strategy="beforeInteractive">
            {`
              (() => {
                try {
                  const storageKey = "cellesseon-theme-mode";
                  const savedMode = localStorage.getItem(storageKey) || "system";
                  const mode = savedMode === "light" || savedMode === "dark" ? savedMode : "system";
                  const resolvedMode = mode === "system"
                    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                    : mode;
                  document.documentElement.setAttribute("data-cellesseon-theme", resolvedMode);
                } catch {
                  document.documentElement.setAttribute("data-cellesseon-theme", "light");
                }
              })();
            `}
          </Script>

          <CellesseonTheme>
            <MainWrapper>{children}</MainWrapper>
          </CellesseonTheme>
        </ClerkProvider>
      </body>
    </html>
  );
}
