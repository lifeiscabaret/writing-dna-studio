import type { WritingDNA } from "@/lib/dna";
import { DnaBars } from "./DnaBars";

function rhythmLabel(avgSentenceLength: number): string {
  if (avgSentenceLength <= 9) return `Short & punchy (~${avgSentenceLength} words/sentence)`;
  if (avgSentenceLength <= 18) return `Balanced (~${avgSentenceLength} words/sentence)`;
  return `Long & flowing (~${avgSentenceLength} words/sentence)`;
}

function emojiLabel(dna: WritingDNA): string {
  if (!dna.usesEmoji || dna.metrics.emojiRate < 0.3) return "Rarely uses emoji";
  if (dna.metrics.emojiRate < 1.5) return "Occasional emoji";
  return "Frequent emoji";
}

function Trait({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {icon} {label}
      </div>
      <div className="mt-1 text-xs font-medium leading-snug">{value}</div>
    </div>
  );
}

export function DnaProfileCard({
  dna,
  title = "Your Writing DNA",
  badge,
}: {
  dna: WritingDNA;
  title?: string;
  badge?: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className="dna-strand inline-block h-4 w-4 rounded-full" />
          {title}
        </h3>
        {badge ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            {badge}
          </span>
        ) : (
          <span className="text-xs text-muted">{dna.sampleWordCount} words analyzed</span>
        )}
      </div>

      <p className="mb-4 text-sm italic text-muted">“{dna.summary}”</p>

      {/* Quick traits: tone, rhythm, emoji */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Trait icon="🎭" label="Tone" value={dna.toneTags.slice(0, 3).join(", ") || "balanced"} />
        <Trait icon="🎵" label="Rhythm" value={rhythmLabel(dna.metrics.avgSentenceLength)} />
        <Trait icon="😊" label="Emoji" value={emojiLabel(dna)} />
      </div>

      {/* The five style axes (includes formality, warmth, directness) */}
      <DnaBars axes={dna.axes} />

      {/* Tone tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {dna.toneTags.map((t) => (
          <span key={t} className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
            {t}
          </span>
        ))}
      </div>

      {/* Signature expressions */}
      {dna.signaturePhrases.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          <span className="font-medium text-foreground">Signature expressions:</span>{" "}
          {dna.signaturePhrases.map((p) => `“${p}…”`).join(", ")}
        </p>
      ) : (
        dna.favoriteConnectors.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            <span className="font-medium text-foreground">Favorite connectors:</span>{" "}
            {dna.favoriteConnectors.join(", ")}
          </p>
        )
      )}
    </section>
  );
}
