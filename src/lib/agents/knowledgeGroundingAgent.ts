/**
 * Knowledge Grounding Agent.
 *
 * Grounds the rewrite in a trusted (synthetic) style guide. For demo stability
 * the DEFAULT path is **local synthetic guidance**: the relevant rules are
 * selected deterministically from `docs/knowledge/writing-dna-style-guide.md`
 * with no network call. A real, provider-backed Foundry grounding path stays
 * available behind `AZURE_GROUNDING_ENABLED=true`, and always falls back to the
 * local synthetic guidance if it fails or times out.
 *
 * In production the synthetic guide would be replaced by a Microsoft Foundry IQ
 * knowledge base over the user's consented sources (see README).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeResult, OutputFormat } from "../dna/types";
import { extractGuidanceWithAzureFoundry } from "../providers/azureFoundryProvider";
import type { AgentTraceStep, IntentResult } from "./types";

const STYLE_GUIDE_PATH = path.join(
  process.cwd(),
  "docs",
  "knowledge",
  "writing-dna-style-guide.md",
);

/** Maps each output format to its section title in the synthetic style guide. */
const FORMAT_SECTION: Record<OutputFormat, string> = {
  "casual-message": "Casual message guidance",
  "professional-email": "Professional email guidance",
  "sns-post": "SNS / social post guidance",
  "blog-paragraph": "Blog paragraph guidance",
};

/** Used only if the style-guide file cannot be read. */
const DEFAULT_GUIDANCE = [
  "Preserve the user's original meaning — change the voice and form, not the facts.",
  "Mirror the user's punctuation, casing, and emoji habits from their sample.",
  "Do not impersonate real, named people — keep the user's own voice only.",
];

let cachedGuide: string | null | undefined;

/** Read the synthetic style guide once and cache it. Returns null if missing. */
async function loadStyleGuide(): Promise<string | null> {
  if (cachedGuide !== undefined) return cachedGuide;
  try {
    cachedGuide = (await readFile(STYLE_GUIDE_PATH, "utf8")).trim() || null;
  } catch (error) {
    console.warn(
      "Knowledge Grounding Agent: could not read style guide —",
      error instanceof Error ? error.message : error,
    );
    cachedGuide = null;
  }
  return cachedGuide;
}

/** Parse the markdown guide into `section title -> bullet lines`. */
function parseGuideSections(guide: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = "";
  for (const raw of guide.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{2,}\s+(.*)$/);
    if (heading) {
      current = heading[1].replace(/^\d+\.\s*/, "").trim();
      sections.set(current, []);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet && current) sections.get(current)!.push(bullet[1].trim());
  }
  return sections;
}

/** Deterministically select the 3–5 rules most relevant to this request. */
function selectLocalGuidance(
  guide: string,
  format: OutputFormat,
  refinement?: string,
): string[] {
  const sections = parseGuideSections(guide);
  const picks: string[] = [];

  const consent = sections.get("Consent-based writing principles");
  if (consent?.length) picks.push(consent[0]);

  const formatRules = sections.get(FORMAT_SECTION[format]);
  if (formatRules?.length) picks.push(...formatRules.slice(0, 2));

  if (refinement) {
    const refinementRules = sections.get("Refinement rules") ?? [];
    const match = refinementRules.find((rule) =>
      rule.toLowerCase().includes(`**${refinement.toLowerCase()}**`),
    );
    if (match) picks.push(match);
  }

  const safety = sections.get("Safety rules");
  if (safety?.length) picks.push(safety[0]);

  const cleaned = picks
    .map((rule) => rule.replace(/\*\*/g, "").trim())
    .filter(Boolean);
  const unique = Array.from(new Set(cleaned)).slice(0, 5);
  return unique.length ? unique : DEFAULT_GUIDANCE;
}

function localKnowledge(guidance: string[]): KnowledgeResult {
  return {
    facts: guidance.map((claim) => ({
      claim,
      source: "synthetic://writing-dna-style-guide",
      confidence: 0.6,
    })),
    grounded: false,
    engine: "local",
    note:
      "Matched synthetic style guidance from the local Writing DNA style guide " +
      "(deterministic, no network call).",
  };
}

function trace(
  status: AgentTraceStep["status"],
  detail: string,
  result: string,
): AgentTraceStep {
  return {
    name: "Knowledge Grounding Agent",
    status,
    detail,
    result,
    timestamp: new Date().toISOString(),
  };
}

export interface KnowledgeGroundingInput {
  sourceText: string;
  format: OutputFormat;
  intent: IntentResult;
  refinement?: string;
  safetyInstruction: string;
  enabled: boolean;
}

export interface KnowledgeGroundingResult {
  knowledge: KnowledgeResult;
  /** Grounded guidance lines to pass into the rewrite prompt. */
  guidance: string[];
  trace: AgentTraceStep;
}

export async function runKnowledgeGroundingAgent(
  input: KnowledgeGroundingInput,
): Promise<KnowledgeGroundingResult> {
  // Disabled — no grounding for this request.
  if (!input.enabled) {
    return {
      knowledge: { facts: [], grounded: false, engine: "disabled", note: "Knowledge grounding disabled." },
      guidance: [],
      trace: trace("skipped", "Knowledge grounding was disabled for this request.", "disabled"),
    };
  }

  const guide = await loadStyleGuide();
  // Local synthetic guidance is both the default and the universal fallback.
  const localGuidance = guide
    ? selectLocalGuidance(guide, input.format, input.refinement)
    : DEFAULT_GUIDANCE;

  // Opt-in: real Foundry / Azure-backed grounding behind an explicit flag.
  const azureGroundingEnabled = process.env.AZURE_GROUNDING_ENABLED === "true";
  if (azureGroundingEnabled && guide) {
    const grounded = await extractGuidanceWithAzureFoundry({
      knowledgeText: guide,
      format: input.format,
      intent: input.intent,
      refinement: input.refinement,
      safetyInstruction: input.safetyInstruction,
    });

    if (!grounded.fallback && grounded.guidance.length > 0) {
      return {
        knowledge: {
          facts: grounded.guidance.map((claim) => ({
            claim,
            source: "foundry://writing-dna-style-guide",
            confidence: 0.9,
          })),
          grounded: true,
          engine: "foundry",
          note:
            "Grounded via Microsoft Foundry / Azure against the synthetic Writing DNA style guide. " +
            "Production would point this at a Foundry IQ knowledge base over consented sources.",
        },
        guidance: grounded.guidance,
        trace: trace(
          "connected",
          `Microsoft Foundry grounding connected — retrieved ${grounded.guidance.length} style rule(s).`,
          "Microsoft Foundry grounding connected",
        ),
      };
    }

    // Foundry attempted but failed/timed out → local synthetic guidance.
    return {
      knowledge: localKnowledge(localGuidance),
      guidance: localGuidance,
      trace: trace(
        "fallback",
        `Foundry grounding unavailable; using local synthetic guidance.${
          grounded.error ? ` (${grounded.error})` : ""
        }`,
        "Foundry grounding fallback",
      ),
    };
  }

  // Default path: local synthetic guidance, no Azure call.
  return {
    knowledge: localKnowledge(localGuidance),
    guidance: localGuidance,
    trace: trace(
      "completed",
      "Matched synthetic style guidance from the local style guide.",
      "local synthetic guidance",
    ),
  };
}
