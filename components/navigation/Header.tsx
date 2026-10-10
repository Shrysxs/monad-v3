"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, GitCompare, Activity, KeyRound, ExternalLink, PlayCircle } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/verify", label: "Verify a file" },
    { href: "/dna", label: "Release history" },
    { href: "/risk", label: "Risk report" },
    { href: "/publisher", label: "Publisher" },
  ];

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              PT
            </div>
            <span className="font-bold text-base tracking-tight text-neutral-900">
              Penguin Trace
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900 font-semibold"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-normal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/demo"
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              pathname === "/demo"
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            Try Demo
          </Link>

          <a
            href="https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-900"
            title="Monad Testnet Registry Explorer"
          >
            <span>Monad (10143)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
}
