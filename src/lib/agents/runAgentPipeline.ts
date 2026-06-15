import { rewriteInStyle } from "../dna/rewrite";
import { scoreStyleMatch } from "../dna";
import { CASUAL_TO_FORMAL, CONTRACTIONS, EXPANSIONS } from "../dna/lexicon";
import type { OutputFormat, WritingDNA } from "../dna/types";
import type { AgentPipelineResult, AgentTraceStep, Refinement } from "./types";
import { runVoiceProfileAgent } from "./voiceProfileAgent";
import { runIntentAgent } from "./intentAgent";
import { runKnowledgeGroundingAgent } from "./knowledgeGroundingAgent";
import { runEvaluationHarness } from "./evaluationHarnessAgent";
import { generateWithAzureFoundry } from "../providers/azureFoundryProvider";

const SAFETY_INSTRUCTION =
  "Avoid impersonation, celebrity references, or unauthorized persona mimicry. " +
  "Keep the rewrite consistent with the user's own writing style.";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyLexicalMap(text: string, map: Record<string, string>) {
  return Object.entries(map).reduce((acc, [from, to]) => {
    const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi");
    return acc.replace(re, (match) => (match[0] === match[0].toUpperCase() ? capitalize(to) : to));
  }, text);
}

function trimFillerWords(text: string, words: string[]) {
  return text
    .replace(new RegExp(`\\b(${words.map(escapeRegExp).join("|")})\\b`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyRefinement(sourceText: string, refinement?: Refinement) {
  if (!refinement) return sourceText;
  const trimmed = sourceText.trim();

  switch (refinement) {
    case "warmer": {
      if (/^(can you|could you|would you|please)\b/i.test(trimmed)) {
        return trimmed.replace(/^(can you|could you|would you|please)\b/i, "I’d love your help with");
      }
      return `I’m excited to share ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    }
    case "shorter": {
      return trimFillerWords(trimmed, [
        "just",
        "really",
        "very",
        "actually",
        "basically",
        "kind of",
        "sort of",
        "I think",
        "I feel",
        "a little",
        "a bit",
      ]);
    }
    case "more confident": {
      return trimFillerWords(trimmed, [
        "maybe",
        "perhaps",
        "probably",
        "I think",
        "I feel",
        "kind of",
        "sort of",
        "just",
        "a little",
        "a bit",
      ]).replace(/\bI am\s+not sure\b/i, "I am");
    }
    case "more casual": {
      const casual = applyLexicalMap(trimmed, CONTRACTIONS);
      if (!/^(hi|hey|hello|dear)\b/i.test(casual)) {
        return `Hey, ${casual.charAt(0).toLowerCase()}${casual.slice(1)}`;
      }
      return casual;
    }
    case "more polished": {
      const polished = applyLexicalMap(applyLexicalMap(trimmed, CASUAL_TO_FORMAL), EXPANSIONS);
      if (!/^(dear|hi|hello|good)\b/i.test(polished)) {
        return `Dear team, ${polished.charAt(0).toLowerCase()}${polished.slice(1)}`;
      }
      return polished;
    }
    default:
      return sourceText;
  }
}

export interface AgentPipelineInput {
  styleSample: string;
  sourceText: string;
  format: OutputFormat;
  useKnowledge?: boolean;
  recipientName?: string;
  senderName?: string;
  refinement?: Refinement;
  dna?: WritingDNA;
}

export async function runAgentPipeline(input: AgentPipelineInput): Promise<AgentPipelineResult> {
  const voiceProfile = runVoiceProfileAgent(input.styleSample);
  const intent = runIntentAgent({ sourceText: input.sourceText, format: input.format });

  // Knowledge grounding runs *before* the rewrite so its guidance can constrain it.
  const grounding = await runKnowledgeGroundingAgent({
    sourceText: input.sourceText,
    format: input.format,
    intent: intent.intent,
    refinement: input.refinement,
    safetyInstruction: SAFETY_INSTRUCTION,
    enabled: Boolean(input.useKnowledge),
  });
  const knowledge = grounding.knowledge;

  const refinedSource = applyRefinement(input.sourceText, input.refinement);
  const azureResult = await generateWithAzureFoundry({
    voiceSummary: voiceProfile.dna.summary,
    styleSample: input.styleSample,
    signaturePhrases: voiceProfile.dna.signaturePhrases,
    toneTags: voiceProfile.dna.toneTags,
    usesEmoji: voiceProfile.dna.usesEmoji,
    groundedGuidance: grounding.guidance,
    sourceText: refinedSource,
    format: input.format,
    intent: intent.intent,
    refinement: input.refinement,
    safetyInstruction: SAFETY_INSTRUCTION,
  });

  const azureTrace: AgentTraceStep = {
    name: "Azure Foundry Provider",
    status: azureResult.fallback ? "fallback" : "connected",
    detail: azureResult.fallback
      ? `Azure rewrite timed out or failed; local deterministic fallback used.${azureResult.error ? ` (${azureResult.error})` : ""}`
      : `Microsoft Foundry rewrite connected — generated with deployment ${azureResult.metadata?.deployment}.`,
    result: azureResult.fallback
      ? "Azure rewrite timed out; local fallback used"
      : "Microsoft Foundry rewrite connected",
    timestamp: new Date().toISOString(),
  };

  const localRewrite = rewriteInStyle(refinedSource, {
    dna: voiceProfile.dna,
    format: input.format,
    // Grounding now yields style *rules*, not draft *facts*, so they are fed to
    // the rewrite prompt as constraints — never woven into the offline body.
    recipientName: input.recipientName,
    senderName: input.senderName,
  });

  const output = azureResult.fallback ? localRewrite.output : azureResult.output;
  const appliedTransforms = azureResult.fallback
    ? localRewrite.appliedTransforms
    : ["Azure Foundry provider generation"];

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
    detail: `Generated output with ${appliedTransforms.length} transform step(s).${
      input.refinement ? ` Applied refinement: ${input.refinement}.` : ""
    }`,
    result: output.slice(0, 60),
    timestamp: new Date().toISOString(),
  };

  const agentTrace: AgentTraceStep[] = [
    voiceProfile.trace,
    intent.trace,
    grounding.trace,
    azureTrace,
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
    provider: {
      engine: azureResult.fallback ? "local" : "azure",
      model: azureResult.fallback ? undefined : azureResult.metadata?.deployment,
      error: azureResult.fallback ? azureResult.error : undefined,
    },
  };
}
