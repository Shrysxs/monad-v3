"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X, Play } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/verify", label: "Verify a file" },
    { href: "/dna", label: "Release history" },
    { href: "/risk", label: "Risk report" },
    { href: "/publisher", label: "Publisher" },
  ];

  return (
    <header className="border-b border-neutral-200/90 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-md bg-neutral-950 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm group-hover:bg-neutral-800 transition-colors">
              PT
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-neutral-950 leading-none">
                Penguin Trace
              </span>
              <span className="text-[10px] font-mono text-neutral-600 tracking-wider uppercase mt-0.5">
                Release Provenance
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all duration-150 ${
                    isActive
                      ? "bg-neutral-950 text-white font-medium shadow-sm"
                      : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 font-normal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Monad Testnet Live Badge */}
          <a
            href="https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-neutral-600 bg-neutral-100 border border-neutral-200 hover:text-neutral-950 hover:border-neutral-300 transition-colors"
            title="Monad Testnet Registry Contract (0xeB3Ef...)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Monad 10143</span>
            <ExternalLink className="w-2.5 h-2.5 text-neutral-600" />
          </a>

          {/* Try Demo Action Button */}
          <Link
            href="/demo"
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 inline-flex items-center space-x-1.5 shadow-sm ${
              pathname === "/demo"
                ? "bg-neutral-950 text-white border-neutral-950"
                : "bg-white text-neutral-950 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400"
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Try Demo</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-in fade-in duration-150">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-xs font-medium ${
                  isActive
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-neutral-100 mt-2">
            <a
              href="https://testnet.monadscan.com/address/0xeB3Ef45368cf0A28679FC6F037295fC2607deF01"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-mono text-neutral-600"
            >
              <span>Monad Testnet (10143)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
