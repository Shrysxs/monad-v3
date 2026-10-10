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
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-900 py-6 text-center text-xs text-gray-500">
          <p>
            Penguin Trace · Monad Blitz Hackathon · Monad Testnet (Chain ID 10143) · All file hashing executes locally in-browser.
          </p>
        </footer>
      </body>
    </html>
  );
}
