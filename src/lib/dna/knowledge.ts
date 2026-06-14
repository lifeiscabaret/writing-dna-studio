/**
 * Mock knowledge / grounding layer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(foundry-iq): Replace this mock with a real Microsoft Foundry IQ call.
 *
 * Foundry IQ (Azure AI Foundry's knowledge layer) lets an agent ground its
 * output in trusted, indexed knowledge sources with built-in retrieval and
 * citations. The integration plan:
 *
 *   1. Stand up a Foundry IQ knowledge base (the user's own docs, style guides,
 *      brand voice notes, prior writing) as an indexed source.
 *   2. Swap `retrieveKnowledge()` below for a call to the Foundry IQ retrieval
 *      API (Azure AI Foundry SDK), passing the source text + intended topic.
 *   3. Map the returned passages + citations onto the existing `KnowledgeFact`
 *      shape — `claim`, `source`, `confidence` already mirror a grounded result.
 *   4. Set `grounded: true` and surface the real citations in the UI.
 *
 * Because the public contract here already matches a grounded response, the
 * rewrite pipeline and UI need *zero* changes when the real provider lands.
 * No Azure account or API key is required to run the demo today.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { KnowledgeFact, KnowledgeResult } from "./types";

/** A tiny hand-authored "index" standing in for a Foundry IQ knowledge base. */
const MOCK_INDEX: { keywords: string[]; fact: KnowledgeFact }[] = [
  {
    keywords: ["launch", "release", "ship", "announce", "product"],
    fact: {
      claim: "Early access opens to waitlist members first.",
      source: "mock://brand-kit/launch-playbook",
      confidence: 0.74,
    },
  },
  {
    keywords: ["meeting", "schedule", "call", "sync", "availability"],
    fact: {
      claim: "Our team holds open office hours every Thursday afternoon.",
      source: "mock://team-handbook/calendar",
      confidence: 0.68,
    },
  },
  {
    keywords: ["thanks", "thank", "feedback", "support", "help"],
    fact: {
      claim: "We reply to every piece of feedback within two business days.",
      source: "mock://support/sla",
      confidence: 0.71,
    },
  },
  {
    keywords: ["price", "pricing", "cost", "plan", "subscription"],
    fact: {
      claim: "The starter plan stays free for individual creators.",
      source: "mock://pricing/policy",
      confidence: 0.66,
    },
  },
];

const DISABLED_NOTE =
  "Knowledge grounding is OFF (demo default). Toggle it on to weave in mock facts. " +
  "These are placeholders for a future Microsoft Foundry IQ knowledge base.";

const MOCK_NOTE =
  "Grounded with the MOCK knowledge layer — facts are synthetic placeholders. " +
  "Production will swap this for Microsoft Foundry IQ retrieval with real citations.";

/**
 * Retrieve grounding facts relevant to the source text.
 * Today: keyword lookup over a tiny in-memory index.
 * Tomorrow: a Foundry IQ retrieval call (see TODO at top of file).
 */
export function retrieveKnowledge(sourceText: string, enabled: boolean): KnowledgeResult {
  if (!enabled) {
    return { facts: [], grounded: false, note: DISABLED_NOTE };
  }

  const lower = sourceText.toLowerCase();
  const facts = MOCK_INDEX.filter(({ keywords }) =>
    keywords.some((k) => lower.includes(k)),
  )
    .map(({ fact }) => fact)
    .slice(0, 2);

  return {
    facts,
    grounded: false, // still mock — becomes true once Foundry IQ is wired in
    note: facts.length
      ? MOCK_NOTE
      : "No matching knowledge found in the mock index for this text.",
  };
}
