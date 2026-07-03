import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

/**
 * True Next.js root layout — genuinely missing from the uploaded repo (no
 * file anywhere contained an <html>/<body> pair, confirmed by search before
 * writing this). middleware.ts already runs clerkMiddleware() and gates
 * every non-public route via auth.protect(), but a clerkMiddleware() with no
 * <ClerkProvider> ancestor breaks auth app-wide, not just on any one route —
 * so this file is required for the app to boot at all, not an optional
 * nicety layered on top of what was already working.
 *
 * (marketing)/layout.tsx is the marketing route group's own nested layout
 * (Navbar, SearchPalette, scroll-progress chrome) — this file is its parent,
 * shared by every route group including the future (app) dashboard group.
 */
export const metadata: Metadata = {
  title: "Content Storm — The Adversarial Knowledge Compiler",
  description:
    "Ingest source material, run it through five adversarial expert personas, and compile the synthesis into a multi-modal lecture plus an interactive Challenge Chamber.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
