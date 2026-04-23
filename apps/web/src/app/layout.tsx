import type { Metadata } from "next";
import "@fontsource-variable/source-sans-3/wght.css";
import "@fontsource-variable/source-serif-4/wght.css";
import "@fontsource/source-code-pro/latin-400.css";
import "@fontsource/source-code-pro/latin-500.css";
import "./globals.css";
import { Geist } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Shop App V2",
  description:
    "Clean-slate implementation for stock accountability, portals, and commerce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", "font-sans", geist.variable)}>
      <body className="min-h-svh font-sans text-base leading-[1.55] text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
