import type { StyleAxes } from "@/lib/dna";

const AXES: { key: keyof StyleAxes; label: string; lo: string; hi: string }[] = [
  { key: "formality", label: "Formality", lo: "Casual", hi: "Formal" },
  { key: "warmth", label: "Warmth", lo: "Reserved", hi: "Warm" },
  { key: "directness", label: "Directness", lo: "Elaborate", hi: "Direct" },
  { key: "energy", label: "Energy", lo: "Calm", hi: "Energetic" },
  { key: "playfulness", label: "Playfulness", lo: "Serious", hi: "Playful" },
];

export function DnaBars({ axes }: { axes: StyleAxes }) {
  return (
    <div className="flex flex-col gap-3.5">
      {AXES.map(({ key, label, lo, hi }) => {
        const value = axes[key];
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-foreground">{label}</span>
              <span className="font-mono text-muted">{value}</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-accent-soft">
              <div
                className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-700 ease-out"
                style={{ width: `${value}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted">
              <span>{lo}</span>
              <span>{hi}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
