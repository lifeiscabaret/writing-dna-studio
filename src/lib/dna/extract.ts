/**
 * Writing DNA extraction.
 *
 * Given a writing sample, produce a `WritingDNA` fingerprint using deterministic,
 * fully-offline heuristics. No network, no API keys. The output shape matches
 * what an LLM-backed extractor would return, so the rest of the app is agnostic
 * to how the DNA was produced.
 */

import type { StyleAxes, StyleMetrics, WritingDNA } from "./types";
import {
  CASUAL_WORDS,
  CONNECTORS,
  EMOJI_REGEX,
  EMOJI_REGEX_GLOBAL,
  FORMAL_WORDS,
  HEDGE_WORDS,
  INTENSIFIERS,
  PLAYFUL_MARKERS,
  WARM_WORDS,
} from "./lexicon";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    // Split after . ! ? (and Korean sentence enders) when the next char begins a
    // new sentence — Latin caps/digits/quotes OR a Hangul syllable.
    .split(/(?<=[.!?。！？])\s+(?=[A-Z0-9"'“가-힣])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tokenize(text: string): string[] {
  // Capture Latin words AND Hangul runs so Korean samples produce real metrics.
  return text.toLowerCase().match(/[a-z']+|[가-힣]+/g) ?? [];
}

/** Detect the dominant script so the rewrite can preserve the input language. */
export function detectLanguage(text: string): "ko" | "en" {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return hangul > latin ? "ko" : "en";
}

/** Count how many entries from `list` appear in the lowercased text. */
function countMatches(lowerText: string, list: string[]): number {
  let total = 0;
  for (const term of list) {
    // word-boundary match for single words, substring for phrases
    if (term.includes(" ")) {
      if (lowerText.includes(term)) total += 1;
    } else {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      total += (lowerText.match(re) ?? []).length;
    }
  }
  return total;
}

function computeMetrics(text: string): StyleMetrics {
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const wordCount = Math.max(words.length, 1);
  const sentenceCount = Math.max(sentences.length, 1);

  const contractionCount = (text.match(/\b\w+'\w+\b/g) ?? []).length;
  const emojiCount = (text.match(EMOJI_REGEX_GLOBAL) ?? []).length;
  const exclamations = (text.match(/!/g) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  const uniqueWords = new Set(words).size;
  const totalWordChars = words.reduce((sum, w) => sum + w.length, 0);

  return {
    avgSentenceLength: round((wordCount / sentenceCount) * 10) / 10,
    contractionRate: round((contractionCount / wordCount) * 1000) / 10,
    emojiRate: round((emojiCount / wordCount) * 1000) / 10,
    exclamationRate: round((exclamations / sentenceCount) * 100) / 100,
    questionRate: round((questions / sentenceCount) * 100) / 100,
    lexicalDiversity: round((uniqueWords / wordCount) * 100) / 100,
    avgWordLength: round((totalWordChars / wordCount) * 10) / 10,
  };
}

function computeAxes(text: string, metrics: StyleMetrics): StyleAxes {
  const lower = text.toLowerCase();
  const words = tokenize(text);
  const per100 = (count: number) => (count / Math.max(words.length, 1)) * 100;

  const formalHits = per100(countMatches(lower, FORMAL_WORDS));
  const casualHits = per100(countMatches(lower, CASUAL_WORDS));
  const warmHits = per100(countMatches(lower, WARM_WORDS));
  const hedgeHits = per100(countMatches(lower, HEDGE_WORDS));
  const intensifierHits = per100(countMatches(lower, INTENSIFIERS));
  const playfulHits = per100(countMatches(lower, PLAYFUL_MARKERS));

  // Formality: long words + formal vocab push up; contractions, emoji, casual slang pull down.
  const formality = clamp(
    50 +
      (metrics.avgWordLength - 4.4) * 14 +
      formalHits * 9 -
      casualHits * 8 -
      metrics.contractionRate * 1.6 -
      metrics.emojiRate * 3,
  );

  // Warmth: warm vocab, exclamation, second person, emoji push up.
  const youCount = per100((lower.match(/\byou\b|\byour\b/g) ?? []).length);
  const warmth = clamp(
    38 +
      warmHits * 10 +
      metrics.exclamationRate * 18 +
      youCount * 1.5 +
      metrics.emojiRate * 4,
  );

  // Directness: short sentences + low hedging => direct.
  const directness = clamp(
    70 - (metrics.avgSentenceLength - 14) * 2.4 - hedgeHits * 7,
  );

  // Energy: exclamation, intensifiers, emoji, ALL CAPS bursts.
  const capsBursts = (text.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  const energy = clamp(
    34 +
      metrics.exclamationRate * 24 +
      intensifierHits * 6 +
      metrics.emojiRate * 3 +
      capsBursts * 4,
  );

  // Playfulness: playful markers, emoji, casual slang, ellipses.
  const ellipses = (text.match(/\.\.\.|…/g) ?? []).length;
  const playfulness = clamp(
    26 +
      playfulHits * 11 +
      metrics.emojiRate * 5 +
      casualHits * 5 +
      ellipses * 3,
  );

  return {
    formality: round(formality),
    warmth: round(warmth),
    directness: round(directness),
    energy: round(energy),
    playfulness: round(playfulness),
  };
}

function deriveToneTags(axes: StyleAxes): string[] {
  const tags: string[] = [];
  tags.push(axes.formality >= 60 ? "polished" : axes.formality <= 35 ? "casual" : "conversational");
  if (axes.warmth >= 60) tags.push("warm");
  if (axes.directness >= 65) tags.push("punchy");
  else if (axes.directness <= 40) tags.push("reflective");
  if (axes.energy >= 65) tags.push("high-energy");
  if (axes.playfulness >= 55) tags.push("playful");
  if (tags.length < 3 && axes.warmth < 60) tags.push("measured");
  return Array.from(new Set(tags)).slice(0, 4);
}

/** Detect recurring 2–3 word openers / phrases as "signature" markers. */
function detectSignaturePhrases(sentences: string[]): string[] {
  const openers = new Map<string, number>();
  for (const s of sentences) {
    const opener = tokenize(s).slice(0, 3).join(" ");
    if (opener.split(" ").length >= 2) {
      openers.set(opener, (openers.get(opener) ?? 0) + 1);
    }
  }
  return [...openers.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase]) => phrase);
}

function detectConnectors(lowerText: string): string[] {
  return CONNECTORS.filter((c) => {
    const re = new RegExp(`\\b${c}\\b`, "g");
    return (lowerText.match(re) ?? []).length >= 1;
  }).slice(0, 5);
}

function buildSummary(axes: StyleAxes, tags: string[]): string {
  const formalityWord =
    axes.formality >= 60 ? "polished and professional" : axes.formality <= 35 ? "relaxed and casual" : "easygoing but clear";
  const lead = tags.slice(0, 2).join(", ");
  const energyWord = axes.energy >= 60 ? "with plenty of energy" : "with a calm, even pace";
  return `A ${formalityWord} voice — ${lead || "balanced"} — that lands ${energyWord}.`;
}

export function extractWritingDNA(sample: string): WritingDNA {
  const text = (sample ?? "").trim();
  const metrics = computeMetrics(text);
  const axes = computeAxes(text, metrics);
  const sentences = splitSentences(text);
  const toneTags = deriveToneTags(axes);

  return {
    axes,
    metrics,
    toneTags,
    signaturePhrases: detectSignaturePhrases(sentences),
    favoriteConnectors: detectConnectors(text.toLowerCase()),
    usesEmoji: EMOJI_REGEX.test(text),
    summary: buildSummary(axes, toneTags),
    sampleWordCount: tokenize(text).length,
  };
}
