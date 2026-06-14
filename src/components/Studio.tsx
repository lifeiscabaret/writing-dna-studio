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

/**
 * One-tap refinements shown under a result. "More casual" / "More polished"
 * switch the output format (a genuine change today); the others act as a
 * regeneration hook, ready to carry tone hints once the engine supports them.
 */
const REFINEMENTS: { label: string; format?: OutputFormat }[] = [
  { label: "Warmer" },
  { label: "Shorter" },
  { label: "More confident" },
  { label: "More casual", format: "casual-message" },
  { label: "More polished", format: "professional-email" },
];

type DnaMeta = { source: "user" } | { source: "demo"; label: string };
type FlowMode = "landing" | "demo" | "wizard";
type WizardStep = 1 | 2 | 3;

export function Studio({ restartSignal }: StudioProps) {
  const [flowMode, setFlowMode] = useState<FlowMode>("landing");
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [styleSample, setStyleSample] = useState("");
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const [dna, setDna] = useState<WritingDNA | null>(null);
  const [dnaMeta, setDnaMeta] = useState<DnaMeta | null>(null);

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
  const [demoStage, setDemoStage] = useState(0);

  const sampleReady = styleSample.trim().length >= MIN_SAMPLE;
  const demoProfile = DEMO_PROFILES[0];
  const demoOutput =
    "Hi team, we're on track to launch next week. Please let me know if you'd like early access.";

  useEffect(() => {
    if (flowMode !== "demo") return;
    setDemoStage(0);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setDemoStage(1), 700));
    timers.push(window.setTimeout(() => setDemoStage(2), 1800));
    timers.push(window.setTimeout(() => setDemoStage(3), 3200));
    return () => timers.forEach(window.clearTimeout);
  }, [flowMode]);

  useEffect(() => {
    if (restartSignal === undefined) return;
    setFlowMode("landing");
    setWizardStep(1);
    setDemoStage(0);
  }, [restartSignal]);

  function resetForWizard() {
    setStyleSample("");
    setActiveProfile(null);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    setSourceText(DEFAULT_SOURCE);
    setFormat("casual-message");
    setUseKnowledge(false);
    setRecipientName("");
    setSenderName("");
    setError(null);
  }

  function handleSampleChange(value: string) {
    setStyleSample(value);
    setActiveProfile(null);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    setError(null);
  }

  function useDemoSample() {
    setStyleSample(demoProfile.sample);
    setActiveProfile(demoProfile.id);
    setError(null);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
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
      setWizardStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoadingDna(false);
    }
  }

  async function handleRewrite(formatOverride?: OutputFormat) {
    const effectiveFormat = formatOverride ?? format;
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
          format: effectiveFormat,
          useKnowledge,
          recipientName,
          senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as RewriteResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoadingRewrite(false);
    }
  }

  // Lightweight one-tap refinements. A couple map to a different output format
  // (a real change today); the rest re-run the rewrite as a regeneration hook
  // until the engine grows per-request tone controls.
  function refine(formatOverride?: OutputFormat) {
    if (formatOverride) setFormat(formatOverride);
    void handleRewrite(formatOverride);
  }

  async function copyOutput() {
    if (!result) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startDemo() {
    resetForWizard();
    setStyleSample(demoProfile.sample);
    setActiveProfile(demoProfile.id);
    setSourceText(DEFAULT_SOURCE);
    setFormat("casual-message");
    setUseKnowledge(false);
    setFlowMode("demo");
  }

  function startWizard() {
    resetForWizard();
    setFlowMode("wizard");
    setWizardStep(1);
  }

  function goBack() {
    if (wizardStep > 1) {
      setWizardStep((step) => (step - 1) as WizardStep);
    }
  }

  function goToRewrite() {
    setWizardStep(3);
  }

  function renderLanding() {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 rounded-[2rem] border border-border bg-card/80 p-8 text-center shadow-xl shadow-slate-950/10 backdrop-blur-xl">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">Writing DNA Studio</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Write anything. Make it sound like you.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted">
            Teach the app your voice once, then turn rough drafts into messages, posts, emails, and paragraphs that feel like you.
          </p>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl border border-border bg-background p-6 text-left shadow-sm">
            <p className="text-sm font-semibold">Rough draft</p>
            <p className="mt-3 text-sm text-muted">What you'd quickly type.</p>
            <div className="mt-5 h-24 rounded-3xl bg-slate-950/5 p-4 text-sm text-slate-700">
              “Can you send me the launch details?”
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            <div className="h-12 w-12 rounded-3xl bg-accent text-2xl leading-none text-white shadow-lg shadow-accent/20">→</div>
            <div className="h-12 w-12 rounded-3xl bg-accent text-2xl leading-none text-white shadow-lg shadow-accent/20">→</div>
          </div>
          <div className="rounded-3xl border border-border bg-background p-6 text-left shadow-sm">
            <p className="text-sm font-semibold">In your voice</p>
            <p className="mt-3 text-sm text-muted">How it comes out.</p>
            <div className="mt-5 h-24 rounded-3xl bg-slate-950/5 p-4 text-sm text-slate-700">
              “hey! could you send over the launch details when you get a sec? would love to take a look 🙏”
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={startDemo}
            className="rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:border-accent"
          >
            Watch demo
          </button>
          <button
            onClick={startWizard}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2"
          >
            Let&apos;s start
          </button>
        </div>
      </div>
    );
  }

  function renderDemo() {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-[2rem] border border-border bg-card/80 p-8 shadow-xl shadow-slate-950/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">Demo</p>
            <h2 className="text-3xl font-semibold text-foreground">Watch the flow</h2>
          </div>
          <button
            onClick={startWizard}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:border-accent"
          >
            Start my own
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`rounded-3xl border p-5 text-left transition ${demoStage === 0 ? "border-accent bg-accent-soft/25 shadow-lg shadow-accent/10" : "border-border bg-background"}`}>
            <p className="text-sm font-semibold">1. Sample</p>
            <p className="mt-2 text-xs text-muted">Voice source</p>
            <div className="mt-4 h-24 rounded-3xl bg-slate-950/5 p-4 text-sm text-slate-700">
              {demoProfile.sample}
            </div>
          </div>
          <div className={`rounded-3xl border p-5 text-left transition ${demoStage === 1 ? "border-accent bg-accent-soft/25 shadow-lg shadow-accent/10" : "border-border bg-background"}`}>
            <p className="text-sm font-semibold">2. DNA</p>
            <p className="mt-2 text-xs text-muted">Style traits</p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {demoStage >= 1 ? (
                <>
                  <div className="rounded-2xl bg-white/90 p-3 shadow-sm">Warmth · High</div>
                  <div className="rounded-2xl bg-white/90 p-3 shadow-sm">Rhythm · Punchy</div>
                </>
              ) : (
                <div className="h-16 rounded-2xl bg-slate-950/5" />
              )}
            </div>
          </div>
          <div className={`rounded-3xl border p-5 text-left transition ${demoStage >= 2 ? "border-accent bg-accent-soft/25 shadow-lg shadow-accent/10" : "border-border bg-background"}`}>
            <p className="text-sm font-semibold">3. Rewrite</p>
            <p className="mt-2 text-xs text-muted">Ready output</p>
            <div className="mt-4 h-24 rounded-3xl bg-slate-950/5 p-4 text-sm text-slate-700">
              {demoStage >= 2 ? demoOutput : ""}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {[0, 1, 2, 3].map((stage) => (
            <span key={stage} className={`h-2 w-8 rounded-full transition ${demoStage === stage ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setFlowMode("landing")}
            className="rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold transition hover:border-accent"
          >
            Back to start
          </button>
          <button
            onClick={() => setFlowMode("wizard")}
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2"
          >
            Use my writing
          </button>
        </div>
      </div>
    );
  }

  function renderWizard() {
    const stepLabels = ["Sample", "DNA", "Rewrite"];
    return (
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">Step {wizardStep} of 3</p>
                <h2 className="mt-3 text-3xl font-semibold text-foreground">
                  {wizardStep === 1 ? "Add your samples" : wizardStep === 2 ? "Review your DNA" : "Rewrite in your voice"}
                </h2>
              </div>
              <button
                onClick={() => setFlowMode("landing")}
                className="rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:border-accent"
              >
                Restart
              </button>
            </div>
            <div className="mt-6 flex items-center gap-3">
              {stepLabels.map((label, index) => {
                const step = index + 1;
                const active = step === wizardStep;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${active ? "bg-accent text-white" : "border border-border text-muted"}`}>
                      {step}
                    </div>
                    <span className={`text-xs uppercase tracking-[0.22em] ${active ? "text-foreground" : "text-muted"}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {wizardStep === 1 && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <textarea
                value={styleSample}
                onChange={(e) => handleSampleChange(e.target.value)}
                placeholder="Paste 2–4 sentences in your natural voice (English or 한국어)…"
                rows={8}
                className="w-full resize-y rounded-3xl border border-border bg-background p-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={useDemoSample}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:border-accent"
                >
                  Use demo sample
                </button>
                <button
                  onClick={handleGenerateDna}
                  disabled={!sampleReady || loadingDna}
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingDna ? "Analyzing…" : "Generate my Writing DNA"}
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              {dna ? (
                <DnaProfileCard
                  dna={dna}
                  title={dnaMeta?.source === "demo" ? dnaMeta.label : "Your Writing DNA"}
                  badge={dnaMeta?.source === "demo" ? "Demo style" : undefined}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted">
                  Generate your Writing DNA to review it here.
                </div>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={goBack}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:border-accent"
                >
                  Back
                </button>
                <button
                  onClick={goToRewrite}
                  disabled={!dna}
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to rewrite
                </button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="grid gap-4">
                <label className="text-base font-semibold text-foreground">What do you want to say?</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={5}
                  disabled={!dna}
                  placeholder="Jot down a rough draft — we'll make it sound like you."
                  className="w-full resize-y rounded-3xl border border-border bg-background p-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    disabled={!dna}
                    className={`rounded-3xl border p-4 text-left text-sm transition disabled:opacity-50 ${
                      format === f.id
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-background hover:border-accent/50"
                    }`}
                  >
                    <div className="font-semibold">{f.icon} {f.label}</div>
                    <div className="mt-1 text-xs text-muted">{f.description}</div>
                  </button>
                ))}
              </div>

              {format === "professional-email" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient name"
                    disabled={!dna}
                    className="rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-50"
                  />
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name"
                    disabled={!dna}
                    className="rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-50"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-3xl border border-dashed border-border bg-background p-4 text-xs text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useKnowledge}
                    onChange={(e) => setUseKnowledge(e.target.checked)}
                    disabled={!dna}
                    className="h-4 w-4 accent-accent"
                  />
                  Ground with mock knowledge
                </label>
                <p>{useKnowledge ? "Uses a mock knowledge layer for demo grounding." : "Knowledge is off by default."}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={goBack}
                  className="rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:border-accent"
                >
                  Back
                </button>
                <button
                  onClick={() => handleRewrite()}
                  disabled={!dna || loadingRewrite || sourceText.trim().length < 3}
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingRewrite ? "Rewriting…" : "Make it sound like me"}
                </button>
              </div>

              {result && !loadingRewrite && (
                <div className="rounded-3xl border-2 border-accent/30 bg-card p-6 shadow-lg shadow-accent/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Rewritten output</p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">This is your text, in your voice</h3>
                    </div>
                    <button
                      onClick={copyOutput}
                      className="shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:border-accent"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-3xl bg-white p-5 text-base leading-relaxed text-slate-800 shadow-sm">
                    {result.output}
                  </div>

                  {result.appliedTransforms.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-foreground">Why it sounds like you</p>
                      <ul className="mt-3 flex flex-col gap-2">
                        {result.appliedTransforms.slice(0, 3).map((transform) => (
                          <li key={transform} className="flex items-start gap-2 text-sm text-muted">
                            <span className="mt-0.5 text-accent">✓</span>
                            <span>{transform}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-sm font-semibold text-foreground">Not quite right? Nudge it.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {REFINEMENTS.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => refine(r.format)}
                          disabled={loadingRewrite}
                          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>

        <div className="space-y-6">
          {wizardStep === 2 && dna && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Next step</p>
              <p className="mt-2 text-sm text-muted">Rewrite your message using this DNA profile.</p>
              <div className="mt-4 rounded-3xl border border-border bg-background p-4 text-sm text-slate-700">
                {sourceText.length > 120 ? `${sourceText.slice(0, 120)}…` : sourceText}
              </div>
            </div>
          )}
          {wizardStep === 3 && result && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <ScoreBreakdown score={result.score} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {flowMode === "landing" && renderLanding()}
      {flowMode === "demo" && renderDemo()}
      {flowMode === "wizard" && renderWizard()}
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
    <div className="flex h-full min-h-[21rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="dna-strand mb-4 h-12 w-12 rounded-xl" />
      <p className="text-sm font-medium">Your Writing DNA will appear here</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        Paste your writing (or try a demo style), then hit <span className="font-medium text-accent">Generate Writing DNA</span>.
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
