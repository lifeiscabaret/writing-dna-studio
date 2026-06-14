/**
 * Word lists and substitution tables that power the deterministic style engine.
 *
 * These are deliberately small and hand-tuned so the demo is fast, offline, and
 * explainable. When the LLM-backed path is enabled, these tables become a
 * fallback / guardrail rather than the primary signal.
 */

export const FORMAL_WORDS = [
  "therefore",
  "however",
  "furthermore",
  "regarding",
  "accordingly",
  "consequently",
  "additionally",
  "nevertheless",
  "purchase",
  "require",
  "request",
  "assist",
  "obtain",
  "utilize",
  "commence",
  "regards",
  "sincerely",
  "kindly",
  "pursuant",
];

export const CASUAL_WORDS = [
  "yeah",
  "yep",
  "nope",
  "gonna",
  "wanna",
  "kinda",
  "stuff",
  "cool",
  "awesome",
  "super",
  "lol",
  "haha",
  "ok",
  "okay",
  "hey",
  "guys",
  "totally",
  "vibe",
  "bummer",
];

export const WARM_WORDS = [
  "thanks",
  "thank",
  "appreciate",
  "love",
  "hope",
  "glad",
  "happy",
  "excited",
  "welcome",
  "care",
  "wonderful",
  "grateful",
  "cheers",
];

export const HEDGE_WORDS = [
  "maybe",
  "perhaps",
  "possibly",
  "probably",
  "i think",
  "i guess",
  "sort of",
  "kind of",
  "somewhat",
  "might",
  "could",
  "seems",
];

export const INTENSIFIERS = [
  "really",
  "very",
  "so",
  "super",
  "totally",
  "absolutely",
  "incredibly",
  "seriously",
];

export const PLAYFUL_MARKERS = [
  "lol",
  "haha",
  "hehe",
  "omg",
  "yay",
  "woohoo",
  "😄",
  "😅",
  "🎉",
  "🔥",
  "✨",
];

export const CONNECTORS = [
  "so",
  "but",
  "and",
  "honestly",
  "anyway",
  "basically",
  "actually",
  "plus",
  "though",
  "meanwhile",
  "however",
  "therefore",
  "still",
];

/** formal → casual lexical swaps applied when lowering formality. */
export const FORMAL_TO_CASUAL: Record<string, string> = {
  therefore: "so",
  however: "but",
  furthermore: "plus",
  additionally: "also",
  regarding: "about",
  purchase: "buy",
  require: "need",
  requires: "needs",
  assist: "help",
  obtain: "get",
  utilize: "use",
  commence: "start",
  approximately: "about",
  numerous: "lots of",
  inquire: "ask",
  "as well as": "and",
};

/** casual → formal lexical swaps applied when raising formality. */
export const CASUAL_TO_FORMAL: Record<string, string> = {
  "a lot of": "numerous",
  lots: "many",
  buy: "purchase",
  need: "require",
  help: "assist",
  get: "obtain",
  use: "utilize",
  start: "commence",
  about: "regarding",
  ask: "inquire",
  kids: "children",
  ok: "acceptable",
  okay: "acceptable",
};

/** Contraction expansion table (used when raising formality). */
export const EXPANSIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "won't": "will not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "couldn't": "could not",
  "i'm": "I am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "it's": "it is",
  "that's": "that is",
  "i'll": "I will",
  "we'll": "we will",
  "i've": "I have",
  "we've": "we have",
  "let's": "let us",
};

/** Contraction table (used when lowering formality). Reverse of EXPANSIONS-ish. */
export const CONTRACTIONS: Record<string, string> = {
  "do not": "don't",
  "does not": "doesn't",
  "did not": "didn't",
  cannot: "can't",
  "can not": "can't",
  "will not": "won't",
  "would not": "wouldn't",
  "should not": "shouldn't",
  "could not": "couldn't",
  "i am": "I'm",
  "you are": "you're",
  "we are": "we're",
  "they are": "they're",
  "it is": "it's",
  "that is": "that's",
  "i will": "I'll",
  "we will": "we'll",
  "i have": "I've",
  "we have": "we've",
};

/** Common closers we strip before applying a format-appropriate sign-off. */
export const COMMON_SIGNOFFS = [
  "best regards",
  "kind regards",
  "regards",
  "sincerely",
  "best",
  "cheers",
  "thanks",
  "thank you",
  "talk soon",
];

/** A rough emoji detector covering the common ranges people actually type. */
export const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

export const EMOJI_REGEX_GLOBAL = new RegExp(EMOJI_REGEX, "gu");
