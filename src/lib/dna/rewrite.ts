/**
 * Style-transfer rewrite engine.
 *
 * Takes a source text and rewrites it to match a target `WritingDNA` in a chosen
 * output format. Like the extractor, this is deterministic and offline — it
 * applies a transparent pipeline of transforms (lexical swaps, contraction
 * handling, emphasis, emoji, and format scaffolding) and reports each step it
 * took. An LLM-backed rewrite would slot in behind the same function signature.
 */

import type { KnowledgeResult, OutputFormat, WritingDNA } from "./types";
import {
  CASUAL_TO_FORMAL,
  CONTRACTIONS,
  EXPANSIONS,
  FORMAL_TO_CASUAL,
  INTENSIFIERS,
} from "./lexicon";
import { detectLanguage, splitSentences } from "./extract";

type Lang = "ko" | "en";

/** Korean labels for the tone tags, used when building Korean SNS hashtags. */
const TONE_KO: Record<string, string> = {
  polished: "정중한",
  casual: "캐주얼",
  conversational: "대화체",
  warm: "따뜻한",
  punchy: "간결한",
  reflective: "사색적인",
  "high-energy": "활기찬",
  playful: "유쾌한",
  measured: "차분한",
};

interface RewriteContext {
  dna: WritingDNA;
  format: OutputFormat;
  knowledge?: KnowledgeResult;
  recipientName?: string;
  senderName?: string;
}

export interface RawRewrite {
  output: string;
  appliedTransforms: string[];
}

const POSITIVE_EMOJI = ["✨", "🙌", "🚀", "🔥", "💡", "🎉"];

function applyMap(text: string, map: Record<string, string>, log: () => void): string {
  let changed = false;
  let out = text;
  for (const [from, to] of Object.entries(map)) {
    const re = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(out)) {
      changed = true;
      out = out.replace(re, (match) =>
        match[0] === match[0]?.toUpperCase() ? capitalize(to) : to,
      );
    }
  }
  if (changed) log();
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripGreetingsAndSignoffs(text: string, lang: Lang): string {
  if (lang === "ko") {
    return text
      .replace(/^\s*안녕하세요[^\n.]*[.,]?\s*/, "")
      .replace(/\s*(감사합니다|고맙습니다)[.!]*\s*\S*\s*(드림|올림)?\.?\s*$/, "")
      .trim();
  }
  return text
    .replace(/^\s*(hi|hey|hello|dear)[^,\n]*,?\s*/i, "")
    .replace(/\b(best regards|kind regards|regards|sincerely|cheers|best|talk soon)[,!.]*\s*[A-Z][a-z]*\.?\s*$/i, "")
    .trim();
}

/** Make sentences shorter/longer to approach the target average length. */
function adjustPacing(sentences: string[], targetAvg: number, transforms: string[]): string[] {
  const currentAvg =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  // Target is much shorter → split long sentences on conjunctions.
  if (targetAvg < currentAvg - 4) {
    const split = sentences.flatMap((s) => {
      const parts = s.split(/,?\s+(?:and|but|so|because|which)\s+/i);
      if (parts.length > 1 && s.split(/\s+/).length > 16) {
        return parts.map((p, i) => {
          const t = p.trim().replace(/[.,]$/, "");
          return i === 0 ? `${capitalize(t)}.` : `${capitalize(t)}.`;
        });
      }
      return [s];
    });
    transforms.push("Split long sentences to match a punchier rhythm");
    return split;
  }
  return sentences;
}

function addEmphasis(text: string, transforms: string[]): string {
  // Sprinkle a single intensifier in front of an adjective-ish word if none present.
  if (INTENSIFIERS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text))) return text;
  const out = text.replace(/\b(good|great|nice|important|helpful|excited|happy)\b/i, (m) => `really ${m}`);
  if (out !== text) transforms.push("Added emphasis to match higher energy");
  return out;
}

function addEmoji(sentences: string[], dna: WritingDNA, transforms: string[]): string[] {
  if (!dna.usesEmoji || dna.metrics.emojiRate < 0.5) return sentences;
  const emoji = POSITIVE_EMOJI[Math.min(POSITIVE_EMOJI.length - 1, Math.floor(dna.axes.playfulness / 20))];
  // Add to the last sentence only — restrained, not spammy.
  const out = [...sentences];
  const last = out.length - 1;
  out[last] = `${out[last].replace(/\s*$/, "")} ${emoji}`;
  transforms.push("Added an emoji to echo the writer's habit");
  return out;
}

function weaveKnowledge(body: string, knowledge: KnowledgeResult | undefined, transforms: string[]): string {
  if (!knowledge || knowledge.facts.length === 0) return body;
  const top = knowledge.facts[0];
  transforms.push("Grounded a claim with the knowledge layer");
  return `${body} ${top.claim}`;
}

function formatGreeting(format: OutputFormat, dna: WritingDNA, lang: Lang, name?: string): string {
  const who = name?.trim() || "";
  if (lang === "ko") {
    // Korean conventions: no English greetings, honorific "님" for emails.
    if (format === "professional-email") {
      return who ? `안녕하세요, ${who}님.` : "안녕하세요.";
    }
    return ""; // casual / SNS / blog: let the Korean text stand on its own
  }
  switch (format) {
    case "professional-email":
      return dna.axes.formality >= 60 ? `Dear ${who || "team"},` : `Hi ${who || "there"},`;
    case "casual-message":
      return dna.axes.playfulness >= 50 ? "Hey! 👋" : "Hey,";
    default:
      return "";
  }
}

function formatSignoff(format: OutputFormat, dna: WritingDNA, lang: Lang, name?: string): string {
  if (format !== "professional-email") return "";
  const me = name?.trim() || "";
  if (lang === "ko") {
    // Korean email closings — formal "드림", warmer "올림" is also common.
    return me ? `감사합니다.\n${me} 드림` : "감사합니다.";
  }
  if (dna.axes.formality >= 60) return `Best regards,\n${me || "—"}`;
  if (dna.axes.warmth >= 55) return `Thanks so much,\n${me || "—"}`;
  return `Thanks,\n${me || "—"}`;
}

function hashtagsFor(dna: WritingDNA, lang: Lang): string {
  if (lang === "ko") {
    const tags = dna.toneTags
      .map((t) => TONE_KO[t])
      .filter(Boolean)
      .slice(0, 2)
      .map((t) => `#${t}`);
    tags.push("#나의문체");
    return tags.join(" ");
  }
  const tags = dna.toneTags
    .map((t) => `#${t.replace(/[^a-z0-9]/gi, "")}`)
    .slice(0, 2);
  tags.push("#WritingDNA");
  return tags.join(" ");
}

export function rewriteInStyle(source: string, ctx: RewriteContext): RawRewrite {
  const transforms: string[] = [];
  const { dna, format } = ctx;
  // Output preserves the *source* language, so all scaffolding follows it.
  const lang = detectLanguage(source);
  if (lang === "ko") transforms.push("Detected Korean — preserving language and conventions");
  let body = stripGreetingsAndSignoffs(source.trim(), lang);

  // 1. Formality-driven lexical swaps.
  if (dna.axes.formality <= 45) {
    body = applyMap(body, FORMAL_TO_CASUAL, () => transforms.push("Swapped formal words for casual equivalents"));
    body = applyMap(body, CONTRACTIONS, () => transforms.push("Contracted phrases (do not → don't)"));
  } else if (dna.axes.formality >= 60) {
    body = applyMap(body, CASUAL_TO_FORMAL, () => transforms.push("Elevated casual words to a formal register"));
    body = applyMap(body, EXPANSIONS, () => transforms.push("Expanded contractions for a formal tone"));
  }

  // 2. Pacing to match sentence length.
  let sentences = splitSentences(body);
  sentences = adjustPacing(sentences, dna.metrics.avgSentenceLength, transforms);

  // 3. Energy / emphasis.
  if (dna.axes.energy >= 60) {
    sentences = sentences.map((s) => addEmphasis(s, transforms));
  }

  // 4. Exclamation to match writer's habit.
  if (dna.metrics.exclamationRate >= 0.4 && sentences.length > 0) {
    const idx = sentences.length - 1;
    sentences[idx] = sentences[idx].replace(/\.?\s*$/, "!");
    transforms.push("Ended on an exclamation to match the writer's energy");
  }

  // 5. Emoji habit.
  sentences = addEmoji(sentences, dna, transforms);

  body = sentences.join(" ");

  // 6. Knowledge grounding (mock today, Foundry IQ tomorrow).
  // The mock facts are English, so only weave them into English output to keep
  // the language consistent. They're still surfaced separately in the UI.
  if (lang === "en") {
    body = weaveKnowledge(body, ctx.knowledge, transforms);
  } else if (ctx.knowledge && ctx.knowledge.facts.length > 0) {
    transforms.push("Knowledge facts shown separately to preserve Korean output");
  }

  // 7. Format scaffolding.
  let output = body;
  const greeting = formatGreeting(format, dna, lang, ctx.recipientName);
  const signoff = formatSignoff(format, dna, lang, ctx.senderName);

  switch (format) {
    case "professional-email":
      output = [greeting, "", body, "", signoff].filter((p) => p !== undefined).join("\n");
      transforms.push("Wrapped as a professional email with greeting and sign-off");
      break;
    case "casual-message": {
      // After a comma greeting ("Hey,"), let the body flow in lowercase.
      const flowed = greeting.endsWith(",") ? body.charAt(0).toLowerCase() + body.slice(1) : body;
      output = `${greeting} ${flowed}`.trim();
      transforms.push("Framed as a short casual message");
      break;
    }
    case "sns-post":
      output = `${body}\n\n${hashtagsFor(dna, lang)}`;
      transforms.push("Tightened into an SNS post with hashtags");
      break;
    case "blog-paragraph":
      output = body;
      transforms.push("Kept as a flowing blog paragraph");
      break;
  }

  if (transforms.length === 0) transforms.push("Source already closely matched the target voice");

  return { output: output.trim(), appliedTransforms: transforms };
}
