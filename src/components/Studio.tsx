"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  DEMO_PROFILES,
  FORMATS,
  type OutputFormat,
  type RewriteResult,
  type WritingDNA,
} from "@/lib/dna";
import { DnaProfileCard } from "./DnaProfileCard";
import { ScoreBreakdown } from "./ScoreBreakdown";

const DEFAULT_SOURCE = "Can you send me the launch details?";
const MIN_SAMPLE = 20;

/** One-tap refinements. A couple switch format (a real change today); the rest
 *  re-run the rewrite as a regeneration hook for future tone controls. */
const REFINEMENTS: { label: string; format?: OutputFormat }[] = [
  { label: "Warmer" },
  { label: "Shorter" },
  { label: "More confident" },
  { label: "More casual", format: "casual-message" },
  { label: "More polished", format: "professional-email" },
];

type Stage = "landing" | "teach" | "compose";
type DnaMeta = { source: "user" } | { source: "demo"; label: string };

/** Distil the DNA into a few friendly, human-readable chips. */
function voiceChips(dna: WritingDNA): string[] {
  const chips: string[] = [];
  chips.push(dna.axes.formality >= 60 ? "polished" : "casual");
  if (dna.axes.warmth >= 55) chips.push("warm");
  if (dna.axes.directness >= 58) chips.push("direct");
  if (dna.metrics.avgSentenceLength <= 11) chips.push("short rhythm");
  else if (dna.metrics.avgSentenceLength >= 20) chips.push("flowing");
  if (dna.axes.energy >= 62) chips.push("high energy");
  if (dna.axes.playfulness >= 55) chips.push("playful");
  if (dna.usesEmoji && dna.metrics.emojiRate >= 0.5) chips.push("emoji-friendly");
  for (const t of dna.toneTags) {
    if (chips.length >= 6) break;
    if (!chips.includes(t)) chips.push(t);
  }
  return Array.from(new Set(chips)).slice(0, 6);
}

export function Studio() {
  const [stage, setStage] = useState<Stage>("landing");
  const [heroKey, setHeroKey] = useState(0);

  const [styleSample, setStyleSample] = useState("");
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [dna, setDna] = useState<WritingDNA | null>(null);
  const [dnaMeta, setDnaMeta] = useState<DnaMeta | null>(null);

  const [sourceText, setSourceText] = useState(DEFAULT_SOURCE);
  const [format, setFormat] = useState<OutputFormat>("casual-message");
  const [useKnowledge, setUseKnowledge] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sentDraft, setSentDraft] = useState("");
  const [result, setResult] = useState<RewriteResult | null>(null);

  const [loadingDna, setLoadingDna] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const demoProfile = DEMO_PROFILES[0];
  const sampleReady = styleSample.trim().length >= MIN_SAMPLE;

  function resetAll() {
    setStage("landing");
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
    setSentDraft("");
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

  function applyDemoSample() {
    setStyleSample(demoProfile.sample);
    setActiveProfile(demoProfile.id);
    setDna(null);
    setDnaMeta(null);
    setResult(null);
    setError(null);
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
    setSentDraft(sourceText.trim());
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

  function startTeaching() {
    setStage("teach");
    setError(null);
  }

  function startTeachingWithDemo() {
    applyDemoSample();
    setStage("teach");
  }

  // ---------------------------------------------------------------- Landing
  function renderLanding() {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
            Writing assistant
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Write anything.
            <br />
            Make it sound like you.
          </h1>
        </div>

        <HeroChat key={heroKey} />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={startTeaching}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2"
          >
            Teach it my voice
          </button>
          <button
            onClick={startTeachingWithDemo}
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:border-accent"
          >
            Watch it work
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Teach
  function renderTeach() {
    const chips = dna ? voiceChips(dna) : [];
    return (
      <ChatPanel title="Voice setup" subtitle="Teach me how you write" onRestart={resetAll}>
        <div className="flex flex-col gap-3">
          <Bubble role="assistant">
            <p className="font-medium text-foreground">Send me 2–3 messages that sound like you.</p>
            <p className="mt-1 text-xs text-muted">
              A text, a DM, an email — anything in your natural voice. English or 한국어.
            </p>
          </Bubble>

          {(loadingDna || dna) && styleSample && (
            <Bubble role="user">
              <span className="line-clamp-4 whitespace-pre-wrap">{styleSample}</span>
            </Bubble>
          )}

          {loadingDna && (
            <Bubble role="assistant" className="w-fit">
              <span className="text-muted">Learning your voice</span> <TypingDots />
            </Bubble>
          )}

          {dna && !loadingDna && (
            <>
              <Bubble role="assistant">
                <span className="inline-flex items-center gap-2">
                  <span className="voice-pulse grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-white">
                    ✓
                  </span>
                  <span className="font-medium text-foreground">Got it. I learned your voice.</span>
                </span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((c, i) => (
                    <span
                      key={c}
                      className="chip-in rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent"
                      style={{ animationDelay: `${300 + i * 90}ms` }}
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <details className="group mt-3">
                  <summary className="cursor-pointer list-none text-[11px] font-medium text-muted underline-offset-2 group-open:underline">
                    View full voice profile
                  </summary>
                  <div className="mt-3">
                    <DnaProfileCard
                      dna={dna}
                      title={dnaMeta?.source === "demo" ? dnaMeta.label : "Your Writing DNA"}
                      badge={dnaMeta?.source === "demo" ? "Demo voice" : undefined}
                    />
                  </div>
                </details>
              </Bubble>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setStage("compose")}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2"
                >
                  Start writing →
                </button>
                <button
                  onClick={() => handleSampleChange("")}
                  className="text-xs font-medium text-muted underline-offset-2 hover:underline"
                >
                  Use a different voice
                </button>
              </div>
            </>
          )}
        </div>

        {!dna && !loadingDna && (
          <Composer
            value={styleSample}
            onChange={handleSampleChange}
            onSubmit={handleGenerateDna}
            placeholder="Paste a few messages that sound like you…"
            submitLabel="Teach my voice"
            disabled={!sampleReady}
            rows={4}
            secondary={
              <button
                onClick={applyDemoSample}
                className="text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                or use a demo voice
              </button>
            }
          />
        )}

        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </ChatPanel>
    );
  }

  // ---------------------------------------------------------------- Compose
  function renderCompose() {
    const chips = dna ? voiceChips(dna) : [];
    return (
      <ChatPanel
        title="Your voice"
        subtitle="Writing as you"
        onRestart={resetAll}
        header={
          dna ? (
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-1.5">
                {chips.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent"
                  >
                    {c}
                  </span>
                ))}
                <span className="text-[10px] font-medium text-muted underline-offset-2 group-open:underline">
                  profile
                </span>
              </summary>
              <div className="mt-3">
                <DnaProfileCard
                  dna={dna}
                  title={dnaMeta?.source === "demo" ? dnaMeta.label : "Your Writing DNA"}
                  badge={dnaMeta?.source === "demo" ? "Demo voice" : undefined}
                />
              </div>
            </details>
          ) : null
        }
      >
        <div className="flex flex-col gap-3">
          <Bubble role="assistant">
            <p className="font-medium text-foreground">What do you want to say?</p>
            <p className="mt-1 text-xs text-muted">
              Type a rough draft — I&apos;ll send it back sounding like you.
            </p>
          </Bubble>

          {(loadingRewrite || result) && sentDraft && (
            <Bubble role="user">
              <span className="whitespace-pre-wrap">{sentDraft}</span>
            </Bubble>
          )}

          {loadingRewrite && (
            <Bubble role="assistant" className="w-fit">
              <span className="text-muted">Writing in your voice</span> <TypingDots />
            </Bubble>
          )}

          {result && !loadingRewrite && (
            <Bubble role="assistant" className="!max-w-[92%]">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {result.output}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={copyOutput}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:border-accent"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <ScoreBreakdown score={result.score} />
              </div>

              {result.appliedTransforms.length > 0 && (
                <p className="mt-3 text-[11px] leading-5 text-muted">
                  <span className="font-medium text-foreground">Why it sounds like you:</span>{" "}
                  {result.appliedTransforms.slice(0, 2).join(" · ")}
                </p>
              )}

              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {REFINEMENTS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => refine(r.format)}
                      disabled={loadingRewrite}
                      className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </Bubble>
          )}
        </div>

        {/* Format picker — compact pills above the input. */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              title={f.description}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                format === f.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-background text-muted hover:border-accent/50"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {format === "professional-email" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Recipient name"
              className="rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              className="rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        )}

        <Composer
          value={sourceText}
          onChange={setSourceText}
          onSubmit={() => handleRewrite()}
          placeholder="What do you want to say?"
          submitLabel={loadingRewrite ? "Writing…" : "Make it sound like me"}
          disabled={loadingRewrite || sourceText.trim().length < 3}
          rows={2}
          secondary={
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={useKnowledge}
                onChange={(e) => setUseKnowledge(e.target.checked)}
                className="h-3 w-3 accent-accent"
              />
              Ground with knowledge
            </label>
          }
        />

        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </ChatPanel>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-2 py-6">
      {stage === "landing" && renderLanding()}
      {stage === "teach" && renderTeach()}
      {stage === "compose" && renderCompose()}

      {copied && (
        <div className="toast-in fixed bottom-8 left-1/2 z-50 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg">
          Copied to clipboard
        </div>
      )}
    </div>
  );
}

/* ============================ Presentational ============================= */

function ChatPanel({
  title,
  subtitle,
  children,
  onRestart,
  header,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onRestart: () => void;
  header?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col overflow-hidden rounded-[2rem] border border-border bg-card/80 shadow-xl shadow-slate-950/10 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="dna-strand h-9 w-9 rounded-2xl" aria-hidden />
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
            <p className="text-[11px] text-muted">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onRestart}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:border-accent"
        >
          Start over
        </button>
      </div>
      {header && <div className="border-b border-border px-5 py-3">{header}</div>}
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Bubble({
  role,
  children,
  className = "",
  style,
}: {
  role: "user" | "assistant";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const tone =
    role === "user"
      ? "ml-auto rounded-br-md bg-accent text-white"
      : "mr-auto rounded-bl-md border border-border bg-background text-foreground";
  return (
    <div
      className={`bubble-in max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${tone} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-muted"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  disabled,
  rows = 2,
  secondary,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  disabled: boolean;
  rows?: number;
  secondary?: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-border bg-background p-3 shadow-sm focus-within:border-accent">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !disabled) onSubmit();
        }}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">{secondary}</div>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/** The landing hero — a self-playing chat that demos the core loop (CSS-only). */
function HeroChat() {
  return (
    <div className="w-full overflow-hidden rounded-[2rem] border border-border bg-card/80 shadow-xl shadow-slate-950/10 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-border bg-card/60 px-5 py-3">
        <span className="dna-strand h-8 w-8 rounded-2xl" aria-hidden />
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">Your voice assistant</p>
          <p className="text-[11px] text-muted">ready</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 py-6 text-left">
        <div
          className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-accent px-4 py-3 text-sm text-white shadow-sm"
          style={{ animation: "bubbleIn 0.45s cubic-bezier(0.22,1,0.36,1) both 0.3s" }}
        >
          Can you send me the launch details?
        </div>

        <div
          className="mr-auto flex max-w-[60%] items-center gap-1 rounded-3xl rounded-bl-md border border-border bg-background px-4 py-3 shadow-sm"
          style={{
            animation:
              "bubbleIn 0.4s cubic-bezier(0.22,1,0.36,1) both 0.9s, typingExit 0.4s ease-in both 2.1s",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot h-1.5 w-1.5 rounded-full bg-muted"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>

        <div
          className="mr-auto max-w-[85%] rounded-3xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm"
          style={{ animation: "bubbleIn 0.45s cubic-bezier(0.22,1,0.36,1) both 2.4s" }}
        >
          hey! could you send over the launch details when you get a sec? would love to take a look 🙏
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-background px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3 rounded-full border border-border bg-slate-950/5 px-3 py-2">
            <input
              disabled
              placeholder="Type a rough thought…"
              className="w-full bg-transparent text-sm text-muted outline-none placeholder:text-muted"
            />
            <button
              type="button"
              disabled
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white opacity-80"
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
