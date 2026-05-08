import { Albert_Sans, Dosis } from "next/font/google";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/styles/index.css";
import DropletTheme from "@/context/droplet-theme";
import AppBaseWrapper from "@/components/layout/AppBaseWrapper";
import AppBaseBackground from "@/components/layout/AppBaseBackground";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Droplet",
  description: "Your AI assistant, your way.",
};

export const viewport: Viewport = {
  themeColor: "dark",
  width: "device-width",
  height: "device-height",
  initialScale: 1,
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

const clerkAppearance = {
  variables: {
    colorPrimary: "#4B0082",
    colorText: "#191970",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${dosis.variable} ${albertsans.variable}`}
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const storageKey = "droplet-theme-mode";
                  const savedMode = localStorage.getItem(storageKey) || "system";
                  const mode = savedMode === "light" || savedMode === "dark" ? savedMode : "system";
                  const resolvedMode = mode === "system"
                    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                    : mode;
                  document.documentElement.setAttribute("data-droplet-theme", resolvedMode);
                } catch {
                  // Storage access can fail in restricted browser contexts; fallback to light theme.
                  document.documentElement.setAttribute("data-droplet-theme", "light");
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <DropletTheme>
            <AppBaseWrapper>{children}</AppBaseWrapper>
          </DropletTheme>
        </ClerkProvider>
        <AppBaseBackground />
        <Analytics />
      </body>
    </html>
  );
}
