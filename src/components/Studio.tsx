"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DEMO_PROFILES,
  FORMATS,
  type DemoProfile,
  type OutputFormat,
  type RewriteResult,
  type WritingDNA,
} from "@/lib/dna";

interface StudioProps {
  restartSignal?: number;
}
import { DnaProfileCard } from "./DnaProfileCard";
import { ScoreBreakdown } from "./ScoreBreakdown";

const DEFAULT_SOURCE =
  "We are launching our new product next week. Please let me know if you would like to be added to the early access list, as availability is limited.";

const MIN_SAMPLE = 20;

type DnaMeta = { source: "user" } | { source: "demo"; label: string };

type TutorialState =
  | "intro"
  | "sampleInput"
  | "generateDna"
  | "sourceText"
  | "formatSelect"
  | "rewrite"
  | "result"
  | "done";

export function Studio({ restartSignal }: StudioProps) {
  // Step 1 — samples
  const [styleSample, setStyleSample] = useState("");
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Step 2 — generated DNA
  const [dna, setDna] = useState<WritingDNA | null>(null);
  const [dnaMeta, setDnaMeta] = useState<DnaMeta | null>(null);

  // Step 3 — rewrite
  const [sourceText, setSourceText] = useState(DEFAULT_SOURCE);
  const [format, setFormat] = useState<OutputFormat>("casual-message");
  const [useKnowledge, setUseKnowledge] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [result, setResult] = useState<RewriteResult | null>(null);

  const [loadingDna, setLoadingDna] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tutorialState, setTutorialState] = useState<TutorialState>("intro");
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialMounted, setTutorialMounted] = useState(false);

  const sampleReady = styleSample.trim().length >= MIN_SAMPLE;

  useEffect(() => {
    setTutorialMounted(true);
    const saved = window.localStorage.getItem("writing-dna-studio-tutorial");
    if (saved !== "skipped" && saved !== "done") {
      setTutorialVisible(true);
      setTutorialState("intro");
    }
  }, []);

  useEffect(() => {
    if (restartSignal === undefined) return;
    if (!tutorialMounted) return;
    setTutorialVisible(true);
    setTutorialState("intro");
  }, [restartSignal, tutorialMounted]);

  useEffect(() => {
    if (!tutorialVisible) return;
    if (tutorialState === "sampleInput" && sampleReady) {
      setTutorialState("generateDna");
    }
    if (tutorialState === "sourceText" && sourceText.trim().length >= 3) {
      setTutorialState("formatSelect");
    }
  }, [tutorialVisible, tutorialState, sampleReady, sourceText]);

  function saveTutorialStatus(status: "skipped" | "done") {
    window.localStorage.setItem("writing-dna-studio-tutorial", status);
    setTutorialVisible(false);
    setTutorialState("done");
  }

  function onSampleChange(value: string) {
    setStyleSample(value);
    setActiveProfile(null);
    // Editing the sample invalidates a previously generated DNA + rewrite.
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    if (tutorialVisible && tutorialState === "sampleInput" && value.trim().length >= MIN_SAMPLE) {
      setTutorialState("generateDna");
    }
  }

  function loadDemo(p: DemoProfile) {
    setStyleSample(p.sample);
    setActiveProfile(p.id);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    setError(null);
    if (tutorialVisible && tutorialState !== "done") {
      setTutorialState("generateDna");
    }
  }

  async function handleGenerateDna() {
    setLoadingDna(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: styleSample }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not analyze the sample.");
      setDna(data.dna as WritingDNA);
      const active = DEMO_PROFILES.find((p) => p.id === activeProfile);
      setDnaMeta(active ? { source: "demo", label: active.name } : { source: "user" });
      if (tutorialVisible) {
        setTutorialState("sourceText");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoadingDna(false);
    }
  }

  async function handleRewrite() {
    setLoadingRewrite(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleSample,
          sourceText,
          format,
          useKnowledge,
          recipientName,
          senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as RewriteResult);
      if (tutorialVisible) {
        setTutorialState("result");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoadingRewrite(false);
    }
  }

  async function copyOutput() {
    if (!result) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openTutorialIntro() {
    setTutorialVisible(true);
    setTutorialState("intro");
  }

  function startTutorial() {
    setTutorialVisible(true);
    setTutorialState("sampleInput");
  }

  function startDemoWalkthrough() {
    const demo = DEMO_PROFILES[0];
    setStyleSample(demo.sample);
    setActiveProfile(demo.id);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    setError(null);
    setSourceText(DEFAULT_SOURCE);
    setFormat("casual-message");
    setUseKnowledge(false);
    setTutorialVisible(true);
    setTutorialState("generateDna");
  }

  const tutorialActive = tutorialVisible && tutorialState !== "done";
  const tutorialIntroOpen = tutorialVisible && tutorialState === "intro";

  const sampleStepFocused = tutorialActive && tutorialState === "sampleInput";
  const generateStepFocused = tutorialActive && tutorialState === "generateDna";
  const sourceStepFocused = tutorialActive && tutorialState === "sourceText";
  const formatStepFocused = tutorialActive && tutorialState === "formatSelect";
  const rewriteStepFocused = tutorialActive && tutorialState === "rewrite";
  const resultStepFocused = tutorialActive && tutorialState === "result";

  return (
    <div className="relative">
      {tutorialIntroOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Guided demo
                </p>
                <h2 className="mt-4 text-3xl font-semibold">Explore Writing DNA</h2>
                <p className="mt-2 text-sm text-muted">See your voice transform in three simple steps.</p>
              </div>
              <button
                onClick={() => saveTutorialStatus("skipped")}
                className="rounded-full border border-border bg-background/90 px-3 py-1 text-sm font-semibold text-muted transition hover:bg-background"
              >
                ×
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-background p-5 text-center transition hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-accent-soft text-xl">
                  📝
                </div>
                <p className="mt-4 text-sm font-semibold">Sample</p>
                <p className="mt-1 text-xs text-muted">Your writing</p>
              </div>
              <div className="rounded-3xl border border-border bg-background p-5 text-center transition hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-accent-soft text-xl">
                  🧬
                </div>
                <p className="mt-4 text-sm font-semibold">Extract DNA</p>
                <p className="mt-1 text-xs text-muted">Style profile</p>
              </div>
              <div className="rounded-3xl border border-border bg-background p-5 text-center transition hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-accent-soft text-xl">
                  ✨
                </div>
                <p className="mt-4 text-sm font-semibold">Rewrite</p>
                <p className="mt-1 text-xs text-muted">In your voice</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={startDemoWalkthrough}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2"
              >
                Showcase demo
              </button>
              <button
                onClick={startTutorial}
                className="rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent"
              >
                Use my writing
              </button>
              <button
                onClick={() => saveTutorialStatus("skipped")}
                className="rounded-full border border-border bg-transparent px-5 py-3 text-sm font-semibold text-muted transition hover:border-rose-500 hover:text-rose-500"
              >
                Skip demo
              </button>
            </div>
          </div>
        </div>
      )}
      {tutorialActive && !tutorialIntroOpen && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-slate-950/10" />
      )}
      <div className="grid gap-6 lg:grid-cols-2 relative z-20">
      {/* ───────────────────────── LEFT: guided flow ───────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* STEP 1 — paste samples */}
        <section
          className={`rounded-3xl border p-5 shadow-sm transition-all duration-300 relative ${
            sampleStepFocused
              ? "border-accent bg-accent-soft/25 shadow-[0_0_0_6px_rgba(56,189,248,0.24)]"
              : tutorialActive
              ? "border-border bg-card/90 opacity-70"
              : "border-border bg-card"
          }`}
        >
          <StepHeader icon="📝" label="Sample" subtitle="Your voice" />
          {sampleStepFocused && (
            <TutorialCallout title="Paste a sample" description="Start with your own writing or choose a demo style." />
          )}
          <textarea
            value={styleSample}
            onChange={(e) => onSampleChange(e.target.value)}
            placeholder="Paste 2–4 sentences in your natural voice (English or 한국어)…"
            rows={5}
            className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{styleSample.trim().length} chars</span>
            {!sampleReady && styleSample.length > 0 && (
              <span className="text-amber-500">Keep going — more sample helps.</span>
            )}
          </div>

          <p className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-[11px] leading-snug text-muted">
            <span className="font-semibold">Consent first.</span> Your sample is temporary and never stored.
          </p>

          <div className="mt-4 border-t border-dashed border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted">Demo styles</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadDemo(p)}
                  title={p.blurb}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activeProfile === p.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-background hover:border-accent/50"
                  }`}
                >
                  <span aria-hidden>{p.emoji}</span>
                  {p.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Synthetic styles are for safe testing only — they’re fictional, not real people.
            </p>
          </div>
        </section>

        {/* STEP 2 — generate DNA */}
        <section
          className={`rounded-3xl border p-5 shadow-sm transition-all duration-300 relative ${
            generateStepFocused
              ? "border-accent bg-accent-soft/25 shadow-[0_0_0_6px_rgba(56,189,248,0.24)]"
              : tutorialActive
              ? "border-border bg-card/90 opacity-70"
              : "border-border bg-card"
          }`}
        >
          <StepHeader icon="🧬" label="Extract DNA" subtitle="Style profile" />
          {generateStepFocused && (
            <TutorialCallout title="Extract DNA" description="Analyze your writing into a reusable style fingerprint." />
          )}
          <button
            onClick={handleGenerateDna}
            disabled={!sampleReady || loadingDna}
            className="mt-3 w-full rounded-xl border border-accent bg-accent-soft px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingDna ? "Analyzing your voice…" : dna ? "🧬 Regenerate Writing DNA" : "🧬 Generate Writing DNA"}
          </button>
          {dna && !loadingDna && (
            <p className="mt-2 text-xs text-emerald-500">
              ✓ DNA ready — see your profile on the right, then rewrite below.
            </p>
          )}
        </section>

        {/* STEP 3 — rewrite */}
        <section
          className={`rounded-3xl border p-5 shadow-sm transition-all duration-300 relative ${
            rewriteStepFocused || formatStepFocused || sourceStepFocused
              ? "border-accent bg-accent-soft/25 shadow-[0_0_0_6px_rgba(56,189,248,0.24)]"
              : tutorialActive
              ? "border-border bg-card/90 opacity-70"
              : "border-border bg-card"
          }`}
        >
          <StepHeader icon="✨" label="Rewrite" subtitle="In your voice" />
          {(sourceStepFocused || formatStepFocused || rewriteStepFocused) && (
            <TutorialCallout
              title="Rewrite now"
              description="Enter source text, choose a format, and transform it to your voice."
            />
          )}

          <label className="mt-3 block text-xs font-medium text-muted">What do you want to say?</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={3}
            disabled={!dna}
            className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />

          <p className="mt-3 mb-2 text-xs font-medium text-muted">Output format</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                disabled={!dna}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                  format === f.id
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <span className="text-sm font-semibold">
                  {f.icon} {f.label}
                </span>
                <span className="text-[11px] leading-snug text-muted">{f.description}</span>
              </button>
            ))}
          </div>

          {format === "professional-email" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient name"
                disabled={!dna}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
              />
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your name"
                disabled={!dna}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-dashed border-border bg-background p-3">
            <input
              type="checkbox"
              checked={useKnowledge}
              onChange={(e) => setUseKnowledge(e.target.checked)}
              disabled={!dna}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span className="text-xs leading-snug text-muted">
              <span className="font-medium text-foreground">Ground with knowledge layer</span>
              <br />
              Weave in relevant facts. Uses a <strong>mock</strong> index today —{" "}
              <span className="text-accent">Microsoft Foundry IQ</span> in production.
            </span>
          </label>

          <button
            onClick={handleRewrite}
            disabled={!dna || loadingRewrite || sourceText.trim().length < 3}
            className="mt-4 w-full overflow-hidden rounded-xl bg-linear-to-r from-accent to-accent-2 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingRewrite ? "Rewriting in your voice…" : "✨ Rewrite in my voice"}
          </button>
        </section>

        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>

      {/* ───────────────────────── RIGHT: results ───────────────────────── */}
      <div className="flex flex-col gap-5">
        {!dna && !loadingDna && <EmptyState />}
        {loadingDna && <DnaLoadingState />}

        {dna && (
          <DnaProfileCard
            dna={dna}
            title={dnaMeta?.source === "demo" ? dnaMeta.label : "Your Writing DNA"}
            badge={dnaMeta?.source === "demo" ? "Demo style" : undefined}
          />
        )}

        {loadingRewrite && <RewriteLoadingState />}

        {result && !loadingRewrite && (
          <>
            <section
              className={`rounded-2xl border p-5 shadow-sm transition relative ${
                resultStepFocused
                  ? "border-accent bg-accent-soft/20 shadow-[0_0_0_4px_rgba(56,189,248,0.25)]"
                  : "border-border bg-card"
              } ${tutorialActive && !resultStepFocused ? "opacity-60" : ""}`}
            >
              {resultStepFocused && (
                <TutorialCallout
                  title="Review your rewrite"
                  description="Copy the rewritten text and finish the tutorial when you’re ready."
                  action={
                    <button
                      onClick={() => saveTutorialStatus("done")}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-2"
                    >
                      Finish tutorial
                    </button>
                  }
                />
              )}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Rewritten output</h3>
                <button
                  onClick={copyOutput}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition hover:border-accent hover:text-accent"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <div className="whitespace-pre-wrap rounded-xl bg-accent-soft/60 p-4 text-sm leading-relaxed">
                {result.output}
              </div>

              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer select-none font-medium">
                  How it was rewritten ({result.appliedTransforms.length} steps)
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.appliedTransforms.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </details>

              {useKnowledge && (
                <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                  <span className="font-medium text-foreground">Knowledge layer:</span>{" "}
                  {result.knowledge.note}
                  {result.knowledge.facts.map((f) => (
                    <div key={f.source} className="mt-1.5 font-mono text-[11px]">
                      • {f.claim}{" "}
                      <span className="opacity-60">
                        ({f.source}, {Math.round(f.confidence * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <ScoreBreakdown score={result.score} />
            </section>
          </>
        )}
      </div>
    </div>
    </div>
  );
}

function StepHeader({
  icon,
  label,
  subtitle,
}: {
  icon: string;
  label: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-accent-soft text-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold">{label}</h2>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function TutorialCallout({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-accent/20 bg-white/95 p-4 text-sm text-foreground shadow-sm shadow-accent/10">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-85 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="dna-strand mb-4 h-12 w-12 rounded-xl" />
      <p className="text-sm font-medium">Your Writing DNA will appear here</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        Paste your writing (or try a demo style), then hit{" "}
        <span className="font-medium text-accent">Generate Writing DNA</span>.
      </p>
    </div>
  );
}

function DnaLoadingState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="shimmer mb-3 h-4 w-40 rounded" />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-12 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer h-3 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

function RewriteLoadingState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="shimmer h-24 w-full rounded" />
    </div>
  );
}
