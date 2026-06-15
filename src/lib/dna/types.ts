/**
 * Core type definitions for the Writing DNA engine.
 *
 * The engine is intentionally provider-agnostic: today it runs on deterministic
 * heuristics (see `extract.ts`), but every type here is shaped so it can be
 * produced by an LLM (e.g. Claude) or grounded by Microsoft Foundry IQ later
 * without changing the UI contract.
 */

/** The five qualitative axes that make up a writing fingerprint. Each is 0–100. */
export interface StyleAxes {
  /** 0 = breezy/casual, 100 = buttoned-up/formal. */
  formality: number;
  /** 0 = reserved, 100 = warm and personal. */
  warmth: number;
  /** 0 = elaborate/qualified, 100 = blunt and concise. */
  directness: number;
  /** 0 = calm, 100 = high-energy. */
  energy: number;
  /** 0 = serious, 100 = playful. */
  playfulness: number;
}

/** Raw measured signals extracted from the sample. Useful for the score breakdown. */
export interface StyleMetrics {
  avgSentenceLength: number;
  /** Contractions per 100 words (don't, we're, ...). */
  contractionRate: number;
  /** Emoji per 100 words. */
  emojiRate: number;
  /** Exclamation marks per sentence. */
  exclamationRate: number;
  /** Questions per sentence. */
  questionRate: number;
  /** Type/token ratio — a rough proxy for vocabulary richness (0–1). */
  lexicalDiversity: number;
  /** Average word length in characters. */
  avgWordLength: number;
}

/** The full extracted fingerprint of a writer. */
export interface WritingDNA {
  axes: StyleAxes;
  metrics: StyleMetrics;
  /** Human-readable tone labels, e.g. "warm", "punchy". */
  toneTags: string[];
  /** Recurring openers / connective tissue detected in the sample. */
  signaturePhrases: string[];
  /** Connectors the writer leans on (so, but, honestly, ...). */
  favoriteConnectors: string[];
  /** Whether the writer reaches for emoji at all. */
  usesEmoji: boolean;
  /** A one-line plain-English summary of the voice. */
  summary: string;
  /** Number of words the fingerprint was built from (confidence signal). */
  sampleWordCount: number;
}

/** Supported output formats for a rewrite. */
export type OutputFormat =
  | "casual-message"
  | "sns-post"
  | "professional-email"
  | "blog-paragraph";

export interface FormatDefinition {
  id: OutputFormat;
  label: string;
  description: string;
  icon: string;
}

/** A single dimension of the style-match score. */
export interface ScoreDimension {
  label: string;
  /** 0–100, how closely the output matches the target DNA on this axis. */
  score: number;
  detail: string;
}

export interface StyleMatchScore {
  /** Weighted overall match, 0–100. */
  overall: number;
  dimensions: ScoreDimension[];
  verdict: string;
}

/** A grounding fact returned by the (mock) knowledge layer. */
export interface KnowledgeFact {
  claim: string;
  source: string;
  confidence: number;
}

export interface KnowledgeResult {
  facts: KnowledgeFact[];
  /** True when a provider-backed grounding step (Foundry / Azure) produced these facts. */
  grounded: boolean;
  /** Which path produced this result — distinguishes Foundry grounding from the local fallback. */
  engine: "foundry" | "local" | "disabled";
  note: string;
}

/** Result of a full rewrite request. */
export interface RewriteResult {
  output: string;
  format: OutputFormat;
  dna: WritingDNA;
  score: StyleMatchScore;
  knowledge: KnowledgeResult;
  /** Ordered list of transformations applied — shown in the UI for transparency. */
  appliedTransforms: string[];
}

/** A synthetic, fictional persona used to demo the studio without real user data. */
export interface DemoProfile {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  sample: string;
}
