/**
 * Root layout — global providers, fonts, and metadata.
 * Derived from: tech-spec.md §12, design-doc.md §2.2
 *
 * Typography (design-doc.md §2.2):
 * - Fraunces: display/headings only, large sizes
 * - Inter: body/UI text, dense dashboards
 * - IBM Plex Mono: prices, quantities, order IDs, OTPs
 */

import type { Metadata, Viewport } from "next";
import {
  Inter,
  Fraunces,
  IBM_Plex_Mono,
} from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { WebSocketProvider } from "@/lib/contexts/websocket-context";
import "./globals.css";

/**
 * Inter — body/UI text.
 * Neutral, extremely legible at small sizes, built for dense dashboards.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Fraunces — display/headings.
 * Humanist serif with warmth, used sparingly at large sizes only.
 * Gives the platform a trace of trade/ledger-book character.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

/**
 * IBM Plex Mono — data/numerals.
 * Used for prices, quantities, order IDs, OTPs.
 * Unambiguous 0 vs O, 1 vs l distinction matters for OTP readout.
 */
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "B2B Wholesale Marketplace",
  description:
    "A B2B wholesale marketplace connecting retailers with wholesalers, with reliable delivery tracking and full payment reconciliation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /** Responsive down to 360px for Retailer and Delivery Partner (design-doc.md §7) */
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
