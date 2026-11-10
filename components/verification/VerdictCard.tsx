"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Check, X, Minus } from "lucide-react";
import type { VerificationVerdict } from "@/lib/verification/types";
import { describeVerdict, type Tone } from "@/lib/ui/verdict-copy";

const TONE_STYLES: Record<Tone, { box: string; icon: React.ReactNode }> = {
  good: {
    box: "bg-emerald-50 border-emerald-300 text-emerald-950",
    icon: <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />,
  },
  warn: {
    box: "bg-amber-50 border-amber-300 text-amber-950",
    icon: <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0" />,
  },
  bad: {
    box: "bg-red-50 border-red-300 text-red-950",
    icon: <XCircle className="w-9 h-9 text-red-600 shrink-0" />,
  },
  neutral: {
    box: "bg-neutral-50 border-neutral-300 text-neutral-900",
    icon: <HelpCircle className="w-9 h-9 text-neutral-500 shrink-0" />,
  },
};

function CheckIcon({ tone }: { tone: Tone }) {
  if (tone === "good") return <Check className="w-4 h-4 text-emerald-600" />;
  if (tone === "bad") return <X className="w-4 h-4 text-red-600" />;
  if (tone === "warn") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
  return <Minus className="w-4 h-4 text-neutral-400" />;
}

/** Plain-language result: one clear answer, what it means, what to do, and four simple checks. */
export function VerdictCard({ verdict }: { verdict: VerificationVerdict }) {
  const copy = describeVerdict(verdict);
  const style = TONE_STYLES[copy.tone];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className={`p-6 border-b ${style.box}`}>
        <div className="flex items-start gap-4">
          {style.icon}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{copy.title}</h2>
              {verdict.trustSource === "DEMO_FIXTURE" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-current/20 font-medium">
                  Sample data
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed">{copy.meaning}</p>
            <p className="text-sm font-semibold leading-relaxed">{copy.action}</p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-neutral-100">
        {copy.checks.map((c) => (
          <li key={c.label} className="flex items-start gap-3 px-6 py-3.5">
            <span className="mt-0.5 w-6 h-6 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
              <CheckIcon tone={c.tone} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-neutral-950">{c.label}</div>
              <div className="text-sm text-neutral-600">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
