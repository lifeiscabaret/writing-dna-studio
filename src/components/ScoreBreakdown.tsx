import type { StyleMatchScore } from "@/lib/dna";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

/**
 * Voice match presented as a small, unobtrusive trust badge. The full
 * dimension breakdown stays collapsed behind "Details" so the rewrite — not the
 * scoring — is the focus.
 */
export function ScoreBreakdown({ score }: { score: StyleMatchScore }) {
  return (
    <details className="group inline-block">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Voice match {score.overall}%
        </span>
        <span className="text-[11px] font-medium text-muted underline-offset-2 group-open:underline">
          Details
        </span>
      </summary>

      <div className="mt-3 w-72 max-w-full rounded-2xl border border-border bg-background p-4">
        <p className="mb-3 text-[11px] leading-5 text-muted">
          How closely this rewrite follows your Writing DNA.
        </p>
        <div className="flex flex-col gap-3">
          {score.dimensions.map((d) => (
            <div key={d.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{d.label}</span>
                <span className={`font-mono font-semibold ${scoreColor(d.score)}`}>{d.score}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft">
                <div
                  className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-700"
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">{d.detail}</p>
            </div>
          ))}
        </div>
        {score.verdict && <p className="mt-3 text-[11px] italic text-muted">{score.verdict}</p>}
      </div>
    </details>
  );
}
