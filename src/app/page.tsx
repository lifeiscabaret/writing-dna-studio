"use client";

import { useState } from "react";
import { Studio } from "@/components/Studio";

export default function Home() {
  const [tutorialRestartSignal, setTutorialRestartSignal] = useState(0);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <header className="aurora border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:pt-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
            <span className="dna-strand h-3 w-3 rounded-full" />
            Microsoft Agents League · Creative Apps
          </div>
          <h1 className="max-w-2xl bg-linear-to-r from-accent to-accent-2 bg-clip-text text-4xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl">
            Writing DNA Studio
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            Extract the <strong className="text-foreground">DNA of your writing voice</strong>, then rewrite
            any message so it sounds unmistakably like you — across casual texts, social posts, professional
            emails, and blog paragraphs.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {["Voice extraction", "Style transfer", "Match scoring", "Knowledge grounding"].map((f) => (
              <span key={f} className="rounded-full bg-card/70 px-3 py-1 font-medium backdrop-blur">
                {f}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setTutorialRestartSignal((value) => value + 1)}
              className="rounded-full border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Restart tutorial
            </button>
          </div>
        </div>
      </header>

      {/* Studio */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Studio restartSignal={tutorialRestartSignal} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            ⚠️ All demo personas and samples are <strong>synthetic</strong> — no real private text is used.
          </p>
          <p>
            Knowledge layer is mocked; production target:{" "}
            <span className="text-accent">Microsoft Foundry IQ</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}
