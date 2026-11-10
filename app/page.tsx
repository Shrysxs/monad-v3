import Link from "next/link";
import { ArrowRight, FileCheck2, PenLine, ShieldCheck, Upload, FileJson, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Add your downloaded file",
    text: "It's checked right here in your browser. Nothing is uploaded.",
  },
  {
    icon: FileJson,
    title: "Add the publisher's signature file",
    text: "A small .json file the publisher offers next to the download.",
  },
  {
    icon: CheckCircle2,
    title: "Get a clear answer",
    text: "Genuine, changed, or withdrawn by the publisher — with what to do next.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-20 py-6">
      {/* Hero */}
      <section className="max-w-3xl space-y-6">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-950 leading-[1.05]">
          Is this download genuine?
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
          Penguin Trace checks that a file you downloaded is exactly what its publisher released, and that the publisher
          hasn&apos;t withdrawn it. Fake mirrors and tampered installers can&apos;t pass.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/verify"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
            Check a file
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-950 font-semibold transition-colors"
          >
            See how it works
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">How it works</h2>
        <ol className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-neutral-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-neutral-950 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <step.icon className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="font-semibold text-neutral-950">{step.title}</div>
              <p className="text-sm text-neutral-600 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Two audiences */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link href="/dna" className="group rounded-2xl border border-neutral-200 p-6 space-y-2 hover:border-neutral-400 transition-colors">
          <FileCheck2 className="w-6 h-6 text-neutral-700" />
          <div className="font-semibold text-neutral-950 flex items-center gap-1.5">
            Got two files with the same name?
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm text-neutral-600">Compare them to see which one is the real release.</p>
        </Link>
        <Link href="/publisher" className="group rounded-2xl border border-neutral-200 p-6 space-y-2 hover:border-neutral-400 transition-colors">
          <PenLine className="w-6 h-6 text-neutral-700" />
          <div className="font-semibold text-neutral-950 flex items-center gap-1.5">
            Do you publish software?
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm text-neutral-600">Sign your releases so your users can check them, and withdraw a bad release in one step.</p>
        </Link>
      </section>

      {/* Why it can be trusted, briefly */}
      <section className="rounded-2xl bg-neutral-50 border border-neutral-200 p-6 sm:p-8 space-y-3 max-w-3xl">
        <h2 className="text-lg font-semibold text-neutral-950">Why can&apos;t a fake download pass?</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Publishers register their identity and every release on the Monad blockchain, a public record nobody can quietly
          edit. Even if a download site is hacked, attackers can&apos;t change that record, so a swapped file or a forged
          signature is caught.
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed">
          One honest limit: &quot;genuine&quot; means it really came from the publisher. It isn&apos;t a virus scan.
        </p>
      </section>
    </div>
  );
}
