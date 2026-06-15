# Writing DNA — Synthetic Style & Safety Guide

> ⚠️ **SYNTHETIC KNOWLEDGE SOURCE.** Every rule below is hand-authored for this
> hackathon demo. It contains **no real private data, no real person's writing,
> and no confidential material**. It is the grounding source the Knowledge
> Grounding Agent retrieves from. In production this synthetic guide would be
> replaced by a Microsoft Foundry IQ knowledge base connected to the user's own
> consented writing history, saved preferences, or an organization style guide.

This guide is the **trusted knowledge** the rewrite step must respect. The
Knowledge Grounding Agent extracts the 3–5 rules most relevant to the current
request (format + intent + refinement + safety) and passes them to the rewrite
model as hard constraints.

---

## 1. Consent-based writing principles

- Only ever reproduce the **voice of the consenting user** who provided the
  writing sample in this session. Never invent a persona.
- The voice profile is **temporary** and session-scoped. Treat it as borrowed,
  not owned.
- Preserve the **original meaning** of the user's rough draft. Rewriting changes
  the *voice and form*, never the *intent or facts*.
- Never add claims, commitments, numbers, names, or promises that are not present
  in the user's draft or in this trusted guide.
- When unsure, prefer the user's own words over invented phrasing.

## 2. Casual message guidance

- Keep it short, warm, and conversational — the way a real text or DM reads.
- Mirror the user's punctuation habits: lowercase starts, `~`, `;)`, `!!`,
  trailing emoji if the sample shows them.
- Contractions are welcome (don't, I'll, gonna) when the sample is casual.
- One or two sentences is usually enough. Do not pad with filler.
- No formal greetings or sign-offs ("Dear", "Best regards") in casual messages.

## 3. Professional email guidance

- Open with an appropriate greeting and close with a sign-off that matches the
  user's formality level.
- Keep paragraphs short and skimmable; lead with the ask or the key point.
- Stay polite and clear; avoid slang unless the user's own voice is informal.
- Preserve any names, dates, or requests from the draft exactly.
- Match warmth to the user's sample — warm writers can keep "Thanks so much",
  reserved writers stay neutral.

## 4. SNS / social post guidance

- Punchy and scannable. Front-load the hook; keep it under ~280 characters.
- Hashtags and emoji are fine **only if** the user's sample uses them.
- One clear idea per post. Avoid multi-paragraph structure.
- Keep the energy consistent with the user's measured Energy/Playfulness axes.

## 5. Blog paragraph guidance

- A flowing, self-contained paragraph — no greeting, no sign-off, no hashtags.
- Two or more connected sentences that develop a single thought.
- Match the user's rhythm: reflective writers get longer, considered sentences;
  punchy writers get tighter ones.
- Keep a consistent narrative voice throughout.

## 6. Refinement rules

- **warmer** — add genuine warmth and friendliness without changing the request
  or the facts. Soften commands into invitations. Do not become saccharine.
- **shorter** — cut filler ("just", "really", "actually", "kind of") and
  redundancy. Preserve every essential point. Never drop the core ask.
- **more confident** — remove hedges ("maybe", "I think", "perhaps", "sort of")
  and use direct, assertive phrasing. Do not become arrogant or overpromise.
- **more casual** — relax register: contractions, lighter punctuation, a friendly
  opener. Do not add slang the user never uses.
- **more polished** — elevate register: expand contractions, tidy grammar, formal
  vocabulary. Keep it natural — polished, not stiff.

## 7. Safety rules

- **Do not impersonate real, named people** (public figures, celebrities,
  colleagues). The voice belongs only to the consenting user in this session.
- **Do not mimic any non-consented third party.** If the draft references
  speaking *as* someone else, decline that framing and keep the user's own voice.
- No claims of identity, authority, or endorsement that the user did not make.
- Do not generate content that is deceptive, harassing, or that fabricates facts
  about real people or organizations.
- Keep the rewrite consistent with the user's *own* writing style only.

## 8. Short-sample confidence rules

- A reliable voice profile needs roughly **40+ words** of sample. Below that, the
  extracted axes are **low confidence** and should be treated as a soft hint.
- With a short sample, lean conservative: reproduce the obvious surface habits
  (emoji, casing, contractions) but do not over-fit invented mannerisms.
- Never present a low-confidence profile as a definitive match. Prefer phrasing
  that the user can easily recognize and correct.
- When confidence is low, prioritize meaning preservation over stylistic flourish.
