import type { StyleMatchScore } from "@/lib/dna";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function ScoreRing({ value }: { value: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-accent-soft" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="url(#scoreGrad)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none">{value}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted">match</span>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ score }: { score: StyleMatchScore }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <ScoreRing value={score.overall} />
        <div>
          <p className="text-sm font-semibold">Style match score</p>
          <p className="mt-1 text-sm text-muted">{score.verdict}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
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
    </div>
  );
}
