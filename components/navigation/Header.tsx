"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Play } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/verify", label: "Check a file" },
  { href: "/dna", label: "Compare files" },
  { href: "/publisher", label: "For publishers" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? "bg-neutral-100 text-neutral-950 font-medium" : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
    }`;

  return (
    <header className="border-b border-neutral-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs">
              PT
            </span>
            <span className="font-bold text-base tracking-tight text-neutral-950">Penguin Trace</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              pathname === "/demo"
                ? "bg-neutral-950 text-white border-neutral-950"
                : "bg-white text-neutral-950 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Try the demo
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-neutral-700 hover:bg-neutral-100"
            aria-label="Open menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 flex flex-col gap-1">
          {[...NAV_ITEMS, { href: "/demo", label: "Try the demo" }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={linkClass(pathname === item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
