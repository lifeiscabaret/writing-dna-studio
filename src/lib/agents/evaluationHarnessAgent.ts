import { scoreStyleMatch } from "../dna";
import { splitSentences, tokenize } from "../dna/extract";
import type { OutputFormat, WritingDNA } from "../dna/types";
import type { AgentTraceStep, EvaluationResult } from "./types";

interface EvaluationHarnessInput {
  sourceText: string;
  output: string;
  format: OutputFormat;
  dna: WritingDNA;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractTokens(text: string) {
  return tokenize(text).filter((token) => token.length > 1);
}

function computeMeaningPreservation(sourceText: string, output: string): number {
  const sourceTokens = new Set(extractTokens(sourceText.toLowerCase()));
  const outputTokens = new Set(extractTokens(output.toLowerCase()));
  if (!sourceTokens.size || !outputTokens.size) return 0;

  const overlap = [...sourceTokens].filter((token) => outputTokens.has(token)).length;
  const ratio = overlap / Math.max(sourceTokens.size, 1);
  return clampScore(ratio * 100);
}

function computeFormatFit(output: string, format: OutputFormat): number {
  const sentences = splitSentences(output);
  const hasLineBreak = output.includes("\n");
  const hasHashtagOrEmoji = /[#✨🚀🙌🔥🎉💡]/.test(output);
  const tokenCount = extractTokens(output).length;

  switch (format) {
    case "professional-email":
      return clampScore(
        (hasLineBreak && /\b(dear|hi|thanks|best regards|sincerely)\b/i.test(output) ? 90 : 65) +
          (tokenCount > 12 ? 5 : 0),
      );
    case "sns-post":
      return clampScore(
        (output.length <= 160 ? 75 : 55) + (hasHashtagOrEmoji ? 20 : 0) + (sentences.length <= 2 ? 5 : 0),
      );
    case "blog-paragraph":
      return clampScore(
        (sentences.length >= 2 ? 80 : 60) + (output.length >= 80 ? 10 : 0) + (hasLineBreak ? -10 : 0),
      );
    case "casual-message":
    default:
      return clampScore(
        (output.length <= 140 ? 75 : 60) + (sentences.length <= 2 ? 15 : 0) + (hasHashtagOrEmoji ? 5 : 0),
      );
  }
}

function computeSafetyScore(output: string): number {
  const impersonationPatterns = [
    /\b(as your voice|in your voice|mimic|impersonat)/i,
    /\b(celebrity|persona|famous|elon musk|taylor swift|beyoncé|beyonce|michael jordan)\b/i,
  ];
  const flagged = impersonationPatterns.some((pattern) => pattern.test(output));
  return flagged ? 40 : 100;
}

function computeReadability(output: string): number {
  const sentences = splitSentences(output);
  const words = extractTokens(output).length;
  if (!output.trim() || !words) return 0;

  const avgSentenceLength = sentences.length ? words / sentences.length : words;
  let score = 100;
  if (avgSentenceLength > 22) score -= 20;
  if (avgSentenceLength > 30) score -= 20;
  if (sentences.length >= 6) score -= 10;
  if (output.length > 420) score -= 10;
  return clampScore(score);
}

function buildRevisionHints(dimensions: Array<{ label: string; score: number }>): string[] {
  const hints: string[] = [];

  for (const dimension of dimensions) {
    if (dimension.score >= 75) continue;
    if (dimension.label === "Voice Match") {
      hints.push("Refine the voice match by giving me a clearer sample or stronger tone cues.");
    } else if (dimension.label === "Meaning Preservation") {
      hints.push("Keep more of the original meaning by preserving key words and intent.");
    } else if (dimension.label === "Format Fit") {
      hints.push("Adjust the structure so it matches the selected format more closely.");
    } else if (dimension.label === "Safety / Consent") {
      hints.push("Avoid wording that sounds like persona mimicry or unauthorized impersonation.");
    } else if (dimension.label === "Readability") {
      hints.push("Shorten long sentences or simplify phrasing for better readability.");
    }
    if (hints.length >= 2) break;
  }

  return hints.length > 0 ? hints : ["The output is well-formed — no major revisions needed."];
}

export interface EvaluationHarnessResult {
  evaluation: EvaluationResult;
  trace: AgentTraceStep;
}

export function runEvaluationHarness({
  sourceText,
  output,
  format,
  dna,
}: EvaluationHarnessInput): EvaluationHarnessResult {
  const voiceMatch = scoreStyleMatch(output, dna).overall;
  const meaning = computeMeaningPreservation(sourceText, output);
  const formatFit = computeFormatFit(output, format);
  const safety = computeSafetyScore(output);
  const readability = computeReadability(output);

  const dimensions: EvaluationResult["dimensions"] = [
    {
      label: "Voice Match",
      score: voiceMatch,
      detail: "How closely the rewritten text reflects the extracted Writing DNA.",
    },
    {
      label: "Meaning Preservation",
      score: meaning,
      detail: "How much of the original idea and terminology were retained.",
    },
    {
      label: "Format Fit",
      score: formatFit,
      detail: "Whether the output follows the expected structure for the chosen format.",
    },
    {
      label: "Safety / Consent",
      score: safety,
      detail: "The rewrite avoids impersonation, persona mimicry, or risky wording.",
    },
    {
      label: "Readability",
      score: readability,
      detail: "How easy the output is to read and scan.",
    },
  ];

  const overall = clampScore(
    Math.round(
      voiceMatch * 0.28 +
        meaning * 0.22 +
        formatFit * 0.2 +
        safety * 0.15 +
        readability * 0.15,
    ),
  );

  const verdict =
    overall >= 85
      ? "High quality — ready to use."
      : overall >= 75
      ? "Good quality — minor polish may help."
      : overall >= 60
      ? "Needs a light revision."
      : "Needs a rewrite to improve clarity and fit.";

  const evaluation: EvaluationResult = {
    overall,
    dimensions,
    verdict,
    revisionHints: buildRevisionHints(dimensions),
    passed: overall >= 75,
  };

  const trace: AgentTraceStep = {
    name: "Evaluation Harness Agent",
    status: "completed",
    detail: "Evaluated the output for voice, meaning, format, safety, and readability.",
    result: `Overall score ${overall}`,
    timestamp: new Date().toISOString(),
  };

  return { evaluation, trace };
}
