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
      <body className="bg-white text-neutral-950 min-h-screen flex flex-col antialiased selection:bg-neutral-950 selection:text-white">
        <Header />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-neutral-200 py-10 text-xs text-neutral-500 bg-neutral-50/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-neutral-900">
                Penguin Trace — Verify software integrity. Trace provenance.
              </p>
              <p className="text-neutral-500 text-[11px]">
                Cryptographic release verification layer. All file hashing executes client-side via Web Crypto SHA-256.
              </p>
            </div>

            <div className="flex items-center space-x-4 text-[11px] font-mono text-neutral-600">
              <a
                href="https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-950 hover:underline transition-colors"
              >
                Monad Testnet (10143)
              </a>
              <span>·</span>
              <span>SwarmTraceRegistry</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
