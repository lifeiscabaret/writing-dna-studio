/**
 * Writing DNA engine — public entry point.
 *
 * `runRewrite` is the single orchestrator the API layer calls: extract DNA →
 * retrieve knowledge → rewrite in style → score the result. Keeping it in one
 * place means the deterministic engine and a future LLM/Foundry-IQ engine share
 * the exact same contract.
 */

import { extractWritingDNA } from "./extract";
import { retrieveKnowledge } from "./knowledge";
import { rewriteInStyle } from "./rewrite";
import { scoreStyleMatch } from "./score";
import { isOutputFormat } from "./formats";
import type { OutputFormat, RewriteResult, WritingDNA } from "./types";

export * from "./types";
export { extractWritingDNA, detectLanguage } from "./extract";
export { scoreStyleMatch } from "./score";
export { retrieveKnowledge } from "./knowledge";
export { FORMATS, getFormat, isOutputFormat } from "./formats";
export { DEMO_PROFILES, getProfile } from "./profiles";

export interface RunRewriteInput {
  /** The writer's sample (defines the target voice). */
  styleSample: string;
  /** The text to rewrite into that voice. */
  sourceText: string;
  format: OutputFormat;
  useKnowledge?: boolean;
  recipientName?: string;
  senderName?: string;
  /** Optional pre-computed DNA to skip re-extraction. */
  dna?: WritingDNA;
}

export function runRewrite(input: RunRewriteInput): RewriteResult {
  const format: OutputFormat = isOutputFormat(input.format) ? input.format : "casual-message";
  const dna = input.dna ?? extractWritingDNA(input.styleSample);
  const knowledge = retrieveKnowledge(input.sourceText, Boolean(input.useKnowledge));

  const { output, appliedTransforms } = rewriteInStyle(input.sourceText, {
    dna,
    format,
    knowledge,
    recipientName: input.recipientName,
    senderName: input.senderName,
  });

  const score = scoreStyleMatch(output, dna);

  return { output, format, dna, score, knowledge, appliedTransforms };
}
