import type { IntentResult } from "../agents/types";
import type { OutputFormat } from "../dna/types";

export interface AzureProviderInput {
  voiceSummary: string;
  /** The user's actual writing sample — the strongest style anchor we can give the model. */
  styleSample: string;
  /** Recurring openers / phrases detected in the sample. */
  signaturePhrases?: string[];
  /** Short tone tags (warm, playful, …) from the extracted DNA. */
  toneTags?: string[];
  usesEmoji?: boolean;
  /** Grounded style/safety guidance retrieved by the Knowledge Grounding Agent. */
  groundedGuidance?: string[];
  sourceText: string;
  format: OutputFormat;
  intent: IntentResult;
  refinement?: string;
  safetyInstruction: string;
}

export interface AzureProviderMetadata {
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

export interface AzureProviderResult {
  output: string;
  metadata: AzureProviderMetadata | null;
  fallback: boolean;
  error?: string;
}

export interface GuidanceExtractionInput {
  /** The trusted (synthetic) knowledge source to ground against. */
  knowledgeText: string;
  format: OutputFormat;
  intent: IntentResult;
  refinement?: string;
  safetyInstruction: string;
}

export interface GuidanceExtractionResult {
  guidance: string[];
  metadata: AzureProviderMetadata | null;
  fallback: boolean;
  error?: string;
}

const MAX_TEXT_LENGTH = 2000;
const MAX_KNOWLEDGE_LENGTH = 6000;
// Reasoning models count internal reasoning against this budget, so keep it
// generous or the visible completion can come back empty.
const MAX_GUIDANCE_TOKENS = 1200;
// A single rewritten message is short — keep the output budget small so the
// model returns fast. The fast-path (short drafts) trims it further.
const REWRITE_MAX_TOKENS = 800;
const REWRITE_FAST_MAX_TOKENS = 500;
// Compact-prompt caps.
const SAMPLE_MAX_CHARS = 500;
const SAMPLE_FAST_MAX_CHARS = 300;
const MAX_GUIDANCE_BULLETS = 3;
const FAST_PATH_DRAFT_CHARS = 300;
// Per-call ceilings before we fall back to the local engine.
const DEFAULT_REWRITE_TIMEOUT_MS = 15000;
const GROUNDING_TIMEOUT_MS = 8000;
// Cap internal reasoning for the rewrite — this is the main speed lever for
// gpt-5 reasoning deployments. Override with AZURE_REWRITE_REASONING_EFFORT.
const DEFAULT_REASONING_EFFORT = "minimal";

/** Configurable rewrite timeout (AZURE_REWRITE_TIMEOUT_MS), default 15000ms. */
function getRewriteTimeoutMs(): number {
  const raw = Number(process.env.AZURE_REWRITE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REWRITE_TIMEOUT_MS;
}

function safeText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function redactUrlHost(endpoint: string) {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return endpoint.replace(/https?:\/\//, "").split(/[/?#]/)[0];
  }
}

function parseAzureError(response: Response, bodyText: string) {
  try {
    const json = JSON.parse(bodyText);
    const code = json.error?.code ?? json.code;
    const message = json.error?.message ?? json.message ?? bodyText;
    return `Azure response ${response.status}${code ? ` ${code}` : ""}: ${String(message).split("\n")[0]}`;
  } catch {
    return `Azure response ${response.status}: ${bodyText.slice(0, 300)}`;
  }
}

// Normalizes whatever the user pasted from the Azure portal (which may be a full
// target URI like ".../openai/v1/responses" or just the resource origin) into the
// v1 chat-completions endpoint used by Azure AI Foundry resources.
function buildAzureChatUrl(endpoint: string, apiVersion: string) {
  let origin: string;
  try {
    origin = new URL(endpoint).origin;
  } catch {
    origin = endpoint.replace(/\/+$/, "").replace(/(\/openai)(\/.*)?$/, "");
  }
  // services.ai.azure.com (and the unified v1 surface) use "preview" for preview
  // features; a dated "*-preview" value is only valid on the legacy deployments path.
  const version = apiVersion && !apiVersion.includes("-preview") ? apiVersion : "preview";
  return `${origin}/openai/v1/chat/completions?api-version=${encodeURIComponent(version)}`;
}

function getAzureConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim();
  const enabled = process.env.AZURE_FOUNDRY_ENABLED === "true";

  const diagnostics = {
    enabled,
    endpointHost: endpoint ? redactUrlHost(endpoint) : "unset",
    deployment: deployment ?? "unset",
    apiVersion: apiVersion ?? "unset",
    apiKey: Boolean(apiKey),
  };

  console.info("Azure Foundry diagnostics:", diagnostics);

  if (!enabled || !endpoint || !apiKey || !deployment || !apiVersion) {
    const missing = [];
    if (!enabled) missing.push("AZURE_FOUNDRY_ENABLED");
    if (!endpoint) missing.push("AZURE_OPENAI_ENDPOINT");
    if (!apiKey) missing.push("AZURE_OPENAI_API_KEY");
    if (!deployment) missing.push("AZURE_OPENAI_DEPLOYMENT");
    if (!apiVersion) missing.push("AZURE_OPENAI_API_VERSION");
    console.warn(`Azure Foundry is not configured. Missing: ${missing.join(", ")}`);
    return null;
  }

  return { endpoint, apiKey, deployment, apiVersion };
}

type AzureMessage = { role: "system" | "user"; content: string };

/**
 * Shared Azure AI Foundry chat call. Wraps config lookup, URL building, an 8s
 * AbortController timeout, and uniform error handling. Every caller falls back
 * to the local engine on `fallback: true`.
 */
interface AzureCallOptions {
  maxTokens: number;
  label: string;
  timeoutMs: number;
  /** gpt-5 reasoning cap — "minimal" keeps short rewrites fast. */
  reasoningEffort?: string;
  /** For logging only — how many guidance bullets were folded into the prompt. */
  guidanceCount?: number;
}

async function callAzureChat(
  messages: AzureMessage[],
  options: AzureCallOptions,
): Promise<AzureProviderResult> {
  const { maxTokens, label, timeoutMs, reasoningEffort, guidanceCount } = options;
  const config = getAzureConfig();
  if (!config) {
    return {
      output: "",
      metadata: null,
      fallback: true,
      error: "Azure provider not configured; missing env vars or disabled.",
    };
  }

  const metadata: AzureProviderMetadata = {
    endpoint: config.endpoint,
    deployment: config.deployment,
    apiVersion: config.apiVersion,
  };
  const url = buildAzureChatUrl(config.endpoint, config.apiVersion);

  // Safe metadata only — never the API key or the user's full text. Inlined into
  // the message string so it survives structured loggers that drop extra args.
  const promptChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  console.info(
    `Azure Foundry request (${label}): host=${redactUrlHost(config.endpoint)} ` +
      `deployment=${config.deployment} apiVersion=${config.apiVersion} ` +
      `promptChars=${promptChars} guidance=${guidanceCount ?? 0} ` +
      `maxOutputTokens=${maxTokens} reasoningEffort=${reasoningEffort ?? "default"} ` +
      `timeoutMs=${timeoutMs}`,
  );

  const requestBody: Record<string, unknown> = {
    // The v1 API selects the deployment via the `model` field in the body.
    model: config.deployment,
    messages,
    // gpt-5 / reasoning deployments require max_completion_tokens and reject
    // custom temperature / top_p (only the default values are supported).
    max_completion_tokens: maxTokens,
    n: 1,
  };
  // Cap internal reasoning so a short rewrite doesn't burn seconds (and tokens)
  // thinking. "minimal" is dramatically faster for this style-transfer task.
  if (reasoningEffort) requestBody.reasoning_effort = reasoningEffort;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const error = parseAzureError(response, bodyText);
      console.warn(`Azure Foundry response failed (${label}):`, error);
      return { output: "", metadata, fallback: true, error };
    }

    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const output = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) {
      return { output: "", metadata, fallback: true, error: "Azure response returned no text." };
    }
    return { output, metadata, fallback: false };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const message = aborted
      ? `Azure request timed out after ${timeoutMs}ms.`
      : error instanceof Error
      ? error.message
      : "Unknown Azure error.";
    console.warn(`Azure Foundry request errored (${label}):`, message);
    return { output: "", metadata, fallback: true, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Knowledge Grounding step (Microsoft Foundry / Azure-backed).
 * Asks the model to retrieve the 3–5 rules from the trusted (synthetic) style
 * guide that are most relevant to the current request. The model is constrained
 * to the provided text — it must not invent rules.
 */
export async function extractGuidanceWithAzureFoundry(
  input: GuidanceExtractionInput,
): Promise<GuidanceExtractionResult> {
  const safeGuide = safeText(input.knowledgeText, MAX_KNOWLEDGE_LENGTH);
  const messages: AzureMessage[] = [
    {
      role: "system",
      content:
        "You are a knowledge-grounding assistant. From the TRUSTED STYLE GUIDE provided, select the " +
        "3 to 5 rules MOST relevant to the user's current writing request. Condense each into one short, " +
        "actionable line. Use ONLY rules that appear in the guide — never invent new rules. " +
        "Output ONLY the rules, one per line, no numbering, no preamble, no commentary.",
    },
    {
      role: "user",
      content: `TRUSTED STYLE GUIDE:
"""
${safeGuide}
"""

Current writing request:
- output format: ${input.format}
- user goal: ${input.intent.userGoal}; recommended tone: ${input.intent.recommendedTone}
- refinement requested: ${input.refinement ?? "none"}
- safety requirement: ${input.safetyInstruction}

Return the 3–5 most relevant guidance rules, one per line.`,
    },
  ];

  const result = await callAzureChat(messages, {
    maxTokens: MAX_GUIDANCE_TOKENS,
    label: "grounding",
    timeoutMs: GROUNDING_TIMEOUT_MS,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
  });
  if (result.fallback) {
    return { guidance: [], metadata: result.metadata, fallback: true, error: result.error };
  }

  const guidance = result.output
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 5);

  if (guidance.length === 0) {
    return { guidance: [], metadata: result.metadata, fallback: true, error: "Grounding returned no usable rules." };
  }

  return { guidance, metadata: result.metadata, fallback: false };
}

/** 2–3 compact style markers (no verbose DNA object). */
function buildMarkers(input: AzureProviderInput): string {
  const parts: string[] = [];
  if (input.signaturePhrases?.length) {
    parts.push(`says "${input.signaturePhrases.slice(0, 2).join('", "')}"`);
  }
  if (input.toneTags?.length) parts.push(input.toneTags.slice(0, 3).join("/"));
  parts.push(input.usesEmoji ? "uses emoji" : "no emoji");
  return parts.slice(0, 3).join("; ");
}

const REWRITE_SYSTEM_PROMPT =
  "Rewrite the user's draft so it sounds like them: copy their tone, punctuation, casing, emoji, and slang " +
  "from their sample. Reply in the SAME LANGUAGE as the draft and keep the original meaning. " +
  "Return only the rewritten message. No explanation.";

export async function generateWithAzureFoundry(input: AzureProviderInput): Promise<AzureProviderResult> {
  const draft = input.sourceText.trim();
  const fast = draft.length < FAST_PATH_DRAFT_CHARS;

  const sample = safeText(input.styleSample, fast ? SAMPLE_FAST_MAX_CHARS : SAMPLE_MAX_CHARS);
  const markers = buildMarkers(input);
  const bullets = (input.groundedGuidance ?? []).slice(0, MAX_GUIDANCE_BULLETS);
  const guidanceLine = bullets.length ? `\nFollow: ${bullets.map((b) => `• ${b}`).join("  ")}` : "";
  // Only the selected refinement instruction — not the whole refinement ruleset.
  const refinementLine = input.refinement ? `\nMake it ${input.refinement}.` : "";

  // Fast-path (short drafts): sample + markers only, no separate voice summary.
  // Normal path: add a one-line voice summary for richer drafts.
  const voiceLine = fast ? "" : `\nVoice: ${safeText(input.voiceSummary, 200)}`;

  const userContent =
    `My writing sample: "${sample}"` +
    voiceLine +
    `\nMarkers: ${markers}` +
    `\nFormat: ${input.format}` +
    guidanceLine +
    refinementLine +
    `\n\nRewrite this as me: "${safeText(draft, MAX_TEXT_LENGTH)}"`;

  const messages: AzureMessage[] = [
    { role: "system", content: REWRITE_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  return callAzureChat(messages, {
    maxTokens: fast ? REWRITE_FAST_MAX_TOKENS : REWRITE_MAX_TOKENS,
    label: "rewrite",
    timeoutMs: getRewriteTimeoutMs(),
    reasoningEffort: process.env.AZURE_REWRITE_REASONING_EFFORT?.trim() || DEFAULT_REASONING_EFFORT,
    guidanceCount: bullets.length,
  });
}
