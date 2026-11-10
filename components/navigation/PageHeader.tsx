import React from "react";

/** Simple page title + one plain sentence. */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2 pb-2">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">{title}</h1>
      <p className="text-base text-neutral-600 max-w-2xl leading-relaxed">{subtitle}</p>
    </div>
  );
}
