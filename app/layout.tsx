import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/navigation/Header";

export const metadata: Metadata = {
  title: "Penguin Trace — Verify software integrity. Trace release provenance.",
  description:
    "Security-focused Web3 verification and forensics layer for peer-to-peer software distribution, backed by Monad.",
  openGraph: {
    title: "Penguin Trace — Verify software integrity. Trace release provenance.",
    description:
      "Security-focused Web3 verification and forensics layer for peer-to-peer software distribution, backed by Monad.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 min-h-screen flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
        <Header />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500 bg-white">
          <div className="max-w-5xl mx-auto px-4 space-y-1">
            <p className="font-medium text-neutral-700">
              Penguin Trace — Verify software integrity. Trace release provenance.
            </p>
            <p>
              Anchored on Monad Testnet (Chain ID 10143) · All file hashing executes locally in your browser.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
