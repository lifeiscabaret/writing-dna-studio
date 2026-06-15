import type { WritingDNA } from "../dna/types";
import { extractWritingDNA } from "../dna/extract";
import type { AgentTraceStep } from "./types";

export interface VoiceProfileAgentResult {
  dna: WritingDNA;
  traits: string[];
  trace: AgentTraceStep;
}

export function runVoiceProfileAgent(styleSample: string): VoiceProfileAgentResult {
  const dna = extractWritingDNA(styleSample);
  const traits: string[] = [];
  traits.push(dna.axes.formality >= 60 ? "polished" : "casual");
  traits.push(dna.axes.warmth >= 55 ? "warm" : "measured");
  traits.push(dna.axes.energy >= 60 ? "energetic" : "steady");
  if (dna.usesEmoji) traits.push("emoji-friendly");
  if (traits.length > 4) traits.splice(4);

  const trace: AgentTraceStep = {
    name: "Voice Profile Agent",
    status: "completed",
    detail: `Analyzed ${dna.sampleWordCount} words to extract a writing fingerprint.`,
    result: traits.join(" · "),
    timestamp: new Date().toISOString(),
  };

  return { dna, traits, trace };
}
