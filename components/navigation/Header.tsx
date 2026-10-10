"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, GitCompare, Activity, KeyRound, ExternalLink, PlayCircle } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/verify", label: "Live Integrity", icon: Shield },
    { href: "/dna", label: "Release DNA", icon: GitCompare },
    { href: "/risk", label: "Risk Intelligence", icon: Activity },
    { href: "/publisher", label: "Publisher Portal", icon: KeyRound },
  ];

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              PT
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              Penguin<span className="text-cyan-400"> Trace</span>
            </span>
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-cyan-950/50 text-cyan-300 border border-cyan-800/50"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/demo"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              pathname === "/demo"
                ? "bg-cyan-500 text-gray-950 shadow-md shadow-cyan-950"
                : "bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/80"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Try Demo</span>
          </Link>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-800/50 text-xs text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Monad Testnet (10143)</span>
          </div>

          <a
            href="https://testnet.monadscan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-200"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
}
