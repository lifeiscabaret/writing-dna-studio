import { retrieveKnowledge } from "../dna";
import { rewriteInStyle } from "../dna/rewrite";
import { scoreStyleMatch } from "../dna";
import type { OutputFormat, WritingDNA } from "../dna/types";
import type { AgentPipelineResult, AgentTraceStep } from "./types";
import { runVoiceProfileAgent } from "./voiceProfileAgent";
import { runIntentAgent } from "./intentAgent";
import { runEvaluationHarness } from "./evaluationHarnessAgent";

export interface AgentPipelineInput {
  styleSample: string;
  sourceText: string;
  format: OutputFormat;
  useKnowledge?: boolean;
  recipientName?: string;
  senderName?: string;
  dna?: WritingDNA;
}

export function runAgentPipeline(input: AgentPipelineInput): AgentPipelineResult {
  const voiceProfile = runVoiceProfileAgent(input.styleSample);
  const intent = runIntentAgent({ sourceText: input.sourceText, format: input.format });

  const knowledge = retrieveKnowledge(input.sourceText, Boolean(input.useKnowledge));
  const knowledgeTrace: AgentTraceStep = {
    name: "Knowledge Grounding Agent",
    status: input.useKnowledge ? "completed" : "skipped",
    detail: input.useKnowledge
      ? `Retrieved ${knowledge.facts.length} grounding fact(s) for the draft.`
      : "Knowledge grounding was disabled for this request.",
    result: input.useKnowledge ? `${knowledge.facts.length} fact(s)` : "disabled",
    timestamp: new Date().toISOString(),
  };

  const { output, appliedTransforms } = rewriteInStyle(input.sourceText, {
    dna: voiceProfile.dna,
    format: input.format,
    knowledge,
    recipientName: input.recipientName,
    senderName: input.senderName,
  });

  const score = scoreStyleMatch(output, voiceProfile.dna);

  const evaluationResult = runEvaluationHarness({
    sourceText: input.sourceText,
    output,
    format: input.format,
    dna: voiceProfile.dna,
  });

  const rewriteTrace: AgentTraceStep = {
    name: "Rewrite Agent",
    status: "completed",
    detail: `Generated output with ${appliedTransforms.length} transform step(s).`,
    result: output.slice(0, 60),
    timestamp: new Date().toISOString(),
  };

  const agentTrace: AgentTraceStep[] = [
    voiceProfile.trace,
    intent.trace,
    knowledgeTrace,
    rewriteTrace,
    evaluationResult.trace,
  ];

  return {
    output,
    format: input.format,
    dna: voiceProfile.dna,
    score,
    knowledge,
    appliedTransforms,
    intent: intent.intent,
    evaluation: evaluationResult.evaluation,
    agentTrace,
  };
}
