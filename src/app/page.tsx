"use client";

import { useState } from "react";
import { Studio } from "@/components/Studio";

export default function Home() {
  const [tutorialRestartSignal, setTutorialRestartSignal] = useState(0);

  return (
    <div className="aurora flex min-h-full flex-col">
      {/* Minimal top bar */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="dna-strand h-4 w-4 rounded-full" />
            Writing DNA Studio
          </div>
          <button
            onClick={() => setTutorialRestartSignal((value) => value + 1)}
            className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur transition hover:border-accent hover:text-accent"
          >
            Restart
          </button>
        </div>
      </header>

      {/* Chat-style writing assistant. Restart fully resets state via remount. */}
      <main className="flex-1 px-4 py-10 sm:py-16">
        <Studio key={tutorialRestartSignal} />
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            ⚠️ All demo voices and samples are <strong>synthetic</strong> — no real private text is used.
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
