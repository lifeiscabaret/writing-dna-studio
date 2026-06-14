/**
 * Style-match scoring.
 *
 * Re-extracts the DNA of the rewritten output and compares it, axis by axis,
 * against the target DNA. Produces an overall score plus a per-dimension
 * breakdown so the user can see *where* the voice matched and where it drifted.
 */

import { extractWritingDNA } from "./extract";
import type { ScoreDimension, StyleMatchScore, WritingDNA } from "./types";

const AXIS_LABELS: { key: keyof WritingDNA["axes"]; label: string; weight: number }[] = [
  { key: "formality", label: "Formality", weight: 1.3 },
  { key: "warmth", label: "Warmth", weight: 1.1 },
  { key: "directness", label: "Directness", weight: 1.0 },
  { key: "energy", label: "Energy", weight: 1.0 },
  { key: "playfulness", label: "Playfulness", weight: 0.9 },
];

/** Convert an absolute axis gap (0–100) into a closeness score (0–100). */
function closeness(gap: number): number {
  // A 0 gap → 100; a 50-point gap → ~30; full opposite → low.
  return Math.round(Math.max(0, 100 - gap * 1.4));
}

function detailFor(label: string, gap: number): string {
  if (gap <= 6) return `Spot on — ${label.toLowerCase()} matches the writer's voice.`;
  if (gap <= 18) return `Close — ${label.toLowerCase()} is nearly there.`;
  if (gap <= 32) return `Slight drift on ${label.toLowerCase()}.`;
  return `Noticeable gap on ${label.toLowerCase()} — worth a tweak.`;
}

function verdictFor(overall: number): string {
  if (overall >= 88) return "Reads unmistakably like you.";
  if (overall >= 75) return "Strong match — sounds like your voice.";
  if (overall >= 60) return "Good match with a little drift.";
  if (overall >= 45) return "Recognizable, but the voice wandered.";
  return "Off-voice — try a longer or clearer sample.";
}

export function scoreStyleMatch(output: string, target: WritingDNA): StyleMatchScore {
  const outputDNA = extractWritingDNA(output);

  let weightedSum = 0;
  let weightTotal = 0;
  const dimensions: ScoreDimension[] = AXIS_LABELS.map(({ key, label, weight }) => {
    const gap = Math.abs(outputDNA.axes[key] - target.axes[key]);
    const score = closeness(gap);
    weightedSum += score * weight;
    weightTotal += weight;
    return { label, score, detail: detailFor(label, gap) };
  });

  const overall = Math.round(weightedSum / weightTotal);

  return {
    overall,
    dimensions,
    verdict: verdictFor(overall),
  };
}
