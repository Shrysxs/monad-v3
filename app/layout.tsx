import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/navigation/Header";
import { getRegistryAddress } from "@/lib/chain/contract";

export const metadata: Metadata = {
  title: "Penguin Trace — Is this download genuine?",
  description:
    "Check that a downloaded file is exactly what its publisher released, and that the release hasn't been withdrawn.",
  openGraph: {
    title: "Penguin Trace — Is this download genuine?",
    description:
      "Check that a downloaded file is exactly what its publisher released, and that the release hasn't been withdrawn.",
    type: "website",
  },
};

// Runs before paint: apply the saved theme, or follow the system setting.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-white text-neutral-950 min-h-screen flex flex-col antialiased selection:bg-neutral-950 selection:text-white">
        <Header />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-neutral-200 py-8 text-sm text-neutral-500">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>Penguin Trace — check that a download is genuine. Files never leave your computer.</p>
            <a
              href={`https://testnet.monadscan.com/address/${getRegistryAddress()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-950 underline underline-offset-2"
            >
              Registry on Monad Testnet
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
