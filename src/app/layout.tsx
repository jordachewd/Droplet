import { ClerkProvider } from "@clerk/nextjs";
import DropletTheme from "@/components/layout/droplet-theme";
import type { Metadata, Viewport } from "next";
import { Albert_Sans, Dosis } from "next/font/google";
import Script from "next/script";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/app/globals.css";
import MainWrapper from "@/components/layout/main-wrapper";
import { Analytics } from "@vercel/analytics/next";
import AppGradientBg from "@/components/shared/app-gradient-bg";

export const metadata: Metadata = {
  title: "Droplet",
  description: "Your AI assistant, your way.",
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${dosis.variable} ${albertsans.variable}`}
    >
      <body>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#4B0082",
              colorText: "#191970",
            },
          }}
        >
          <Script id="theme-init" strategy="beforeInteractive">
            {`
              (() => {
                try {
                  const storageKey = "droplet-theme-mode";
                  const legacyStorageKey = "cellesseon-theme-mode";
                  const savedMode = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey) || "system";
                  const mode = savedMode === "light" || savedMode === "dark" ? savedMode : "system";
                  const resolvedMode = mode === "system"
                    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                    : mode;
                  document.documentElement.setAttribute("data-droplet-theme", resolvedMode);
                } catch {
                  document.documentElement.setAttribute("data-droplet-theme", "light");
                }
              })();
            `}
          </Script>

          <DropletTheme>
            <MainWrapper>{children}</MainWrapper>
          </DropletTheme>
        </ClerkProvider>
        <AppGradientBg />
        <Analytics />
      </body>
    </html>
  );
}
