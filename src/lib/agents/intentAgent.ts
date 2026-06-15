import type { OutputFormat } from "../dna/types";
import type { AgentTraceStep, IntentResult } from "./types";

const GOAL_PATTERNS: Array<{ goal: IntentResult["userGoal"]; regex: RegExp }> = [
  { goal: "thanks", regex: /\b(thanks|thank you|appreciate)\b/i },
  { goal: "apology", regex: /\b(sorry|apolog(?:y|ise)|regret)\b/i },
  { goal: "announcement", regex: /\b(announce|launch|release|introduce|sharing)\b/i },
  { goal: "follow-up", regex: /\b(follow up|following up|touching base|check in|remind)\b/i },
  { goal: "request", regex: /\b(can you|could you|please|would you|help me|let me know)\b/i },
];

const TONE_BY_FORMAT: Record<OutputFormat, IntentResult["recommendedTone"]> = {
  "casual-message": "casual",
  "sns-post": "warm",
  "professional-email": "polished",
  "blog-paragraph": "concise",
};

export interface IntentAgentResult {
  intent: IntentResult;
  trace: AgentTraceStep;
}

export function runIntentAgent({
  sourceText,
  format,
}: {
  sourceText: string;
  format: OutputFormat;
}): IntentAgentResult {
  const normalized = sourceText.trim();
  const lower = normalized.toLowerCase();

  const matchedGoal = GOAL_PATTERNS.find((entry) => entry.regex.test(normalized));
  const userGoal = matchedGoal?.goal ?? "general";
  let confidence = userGoal === "general" ? 0.65 : 0.9;
  if (format === "professional-email" && userGoal === "general") confidence = 0.75;
  if (userGoal === "thanks" || userGoal === "apology") confidence = 0.92;
  if (lower.includes("please") || lower.includes("would you")) confidence = Math.max(confidence, 0.8);

  let recommendedTone = TONE_BY_FORMAT[format];
  if (userGoal === "thanks") recommendedTone = "warm";
  if (userGoal === "apology") recommendedTone = "polished";
  if (userGoal === "request" && format === "blog-paragraph") recommendedTone = "concise";

  const rationale = `Detected ${userGoal} intent and selected ${recommendedTone} tone for the ${format} format.`;

  const trace: AgentTraceStep = {
    name: "Intent Agent",
    status: "completed",
    detail: "Inferred the user's writing intention from the draft and selected format.",
    result: `Goal: ${userGoal}; tone: ${recommendedTone}; confidence: ${Math.round(confidence * 100)}%`,
    timestamp: new Date().toISOString(),
  };

  return {
    intent: {
      taskType: format,
      userGoal,
      recommendedTone,
      confidence: Math.round(confidence * 100),
      rationale,
    },
    trace,
  };
}
