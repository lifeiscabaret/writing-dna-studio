# 🧬 Writing DNA Studio

> Extract the **DNA of your writing voice**, then rewrite any message so it sounds
> unmistakably like *you* — across casual texts, social posts, professional emails,
> and blog paragraphs.

A **Microsoft Agents League Hackathon** entry in the **Creative Apps** category.
Built with **Next.js 16 + TypeScript + Tailwind v4**. Runs fully **offline** — no
Azure account, no API keys, no network calls required for the demo.

Writing DNA Studio is **consent-based personal writing-style extraction**: you bring
*your own* writing, the app builds a **temporary** style profile from it, and then
rewrites new text in that voice. Nothing is stored server-side, and no real personal
or confidential data is required.

---

## 🧭 Guided 3-step flow

The studio walks you through a clear onboarding path:

1. **Paste your writing samples** — a few of your own messages, emails, or posts.
2. **Generate your Writing DNA** — creates a **"Your Writing DNA"** profile card.
3. **Rewrite anything in your voice** — pick a format and rewrite any text.

Your own samples are the **primary path**. Synthetic demo *styles* sit in a clearly
secondary area ("No sample ready? Try a synthetic demo style") for safe testing only.

## ✨ What it does

1. **Writing sample input** — paste a few sentences in your *own* natural voice (English or 한국어).
2. **Writing DNA extraction** — builds a **"Your Writing DNA"** card with tone, rhythm, emoji usage, formality, warmth, directness, and signature expressions.
3. **Style transfer rewrite** — any source text is rewritten to match that DNA.
4. **Output format selector** — Casual message · SNS post · Professional email · Blog paragraph.
5. **Style match score** — the rewritten output is re-fingerprinted and scored against your DNA, with a per-axis breakdown.
6. **Language preservation** — output stays in the input language; Korean text keeps Korean conventions (e.g. `안녕하세요, …님` / `감사합니다 … 드림`, Korean hashtags) and never gets English greetings or sign-offs.
7. **Synthetic demo styles** — five descriptive style presets (*Friendly Creator, Data-Driven Analyst, Calm Editor, High-Energy Founder, Casual Messenger*) for safe testing only.
8. **Mock knowledge layer** — optional grounding with a clearly-marked `TODO` placeholder for **Microsoft Foundry IQ**.

### The five style axes (Writing DNA)

| Axis | 0 ⟶ 100 |
|------|---------|
| **Formality** | Casual ⟶ Formal |
| **Warmth** | Reserved ⟶ Warm |
| **Directness** | Elaborate ⟶ Direct |
| **Energy** | Calm ⟶ Energetic |
| **Playfulness** | Serious ⟶ Playful |

Each axis is derived from measurable signals (sentence length, contraction rate,
emoji rate, exclamation/question rates, lexical diversity, hedging, intensifiers,
formal/casual vocabulary, …), so the score is **explainable** rather than a black box.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Client Component — src/components/Studio.tsx)       │
│  Sample input · format picker · DNA bars · score · output     │
└───────────────┬──────────────────────────────────────────────┘
                │  fetch  (POST /api/rewrite, /api/extract)
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Route Handlers (BFF seam — src/app/api/*/route.ts)           │
│  Validation · the future home of LLM + Foundry IQ calls       │
└───────────────┬──────────────────────────────────────────────┘
                │  runRewrite()
                ▼
┌──────────────────────────────────────────────────────────────┐
│  Writing DNA Engine (provider-agnostic — src/lib/dna/)        │
│  extract → retrieveKnowledge → rewriteInStyle → scoreMatch    │
└──────────────────────────────────────────────────────────────┘
```

### Agentic architecture

This MVP includes a lightweight agent pipeline layer that runs alongside the
existing deterministic rewrite engine while preserving the current UI and
existing API contract.

The new agent pipeline is:

- **Voice Profile Agent** — wraps `extractWritingDNA()` to build a voice
  fingerprint and surface core traits.
- **Intent Agent** — infers task type, user goal, recommended tone, and a
  confidence score from the source draft and selected format.
- **Knowledge Grounding Agent** — optionally activates the existing mock
  grounding layer and records whether grounding facts were retrieved.
- **Rewrite Agent** — executes the deterministic rewrite pipeline and preserves
  transform metadata.
- **Evaluation Harness Agent** — scores the output on voice match, meaning
  preservation, format fit, safety/consent, and readability.

The current build is still deterministic and local, but the pipeline is
provider-ready so Microsoft Foundry IQ / Azure AI Foundry can be added later
without changing the client or API surface.

### The engine (`src/lib/dna/`)

| File | Responsibility |
|------|----------------|
| `types.ts` | Shared contracts (`WritingDNA`, `RewriteResult`, `StyleMatchScore`, …) |
| `lexicon.ts` | Hand-tuned word lists & substitution tables |
| `extract.ts` | `extractWritingDNA()` — sample → fingerprint (deterministic, offline) |
| `rewrite.ts` | `rewriteInStyle()` — transparent transform pipeline, reports every step |
| `score.ts` | `scoreStyleMatch()` — re-extracts the output and compares axis-by-axis |
| `knowledge.ts` | Mock grounding layer + **`TODO(foundry-iq)`** integration plan |
| `formats.ts` | The four output formats |
| `profiles.ts` | Five **synthetic** demo *styles* (for safe testing) |
| `index.ts` | `runRewrite()` orchestrator + public exports |

**Why a deterministic engine?** It makes the hackathon demo instant, free, and
reproducible, and it gives every score a human-readable explanation. Crucially,
each function's signature matches what an LLM- or Foundry-IQ-backed implementation
would expose — so swapping in the real providers requires **no UI or API changes**.

> ⚠️ This project targets **Next.js 16**, whose App Router / Route Handler
> conventions differ from older versions. Engine logic was written against the
> bundled docs in `node_modules/next/dist/docs/`.

---

## 🤖 GitHub Copilot usage

This project was built **with GitHub Copilot as a pair programmer**. How it was used:

- **Scaffolding the engine** — Copilot accelerated the boilerplate-heavy parts:
  the `WritingDNA` type definitions, the lexicon substitution tables, and the
  repetitive metric-counting helpers in `extract.ts`.
- **Heuristic tuning** — Copilot suggested candidate weightings for the style-axis
  formulas (e.g. how strongly contractions should pull down formality), which were
  then hand-calibrated against the synthetic demo styles.
- **React/Tailwind UI** — Copilot drafted the repetitive JSX for the DNA bar chart,
  the score ring SVG, and the format-selector cards, which were then refined for
  the violet/pink design system.
- **Route Handler patterns** — Copilot helped match the Next.js 16 Route Handler
  signature and request-validation patterns.

Every Copilot suggestion was reviewed, type-checked (`tsc --noEmit`), and verified
against a build + smoke test of the full `runRewrite` pipeline. Copilot handled the
*mechanical* surface area; the *design* of the DNA model, scoring, and the
provider-agnostic seam was author-driven.

---

## 🔌 Microsoft Foundry IQ integration plan

Today the knowledge layer is a **mock** (`src/lib/dna/knowledge.ts`) — a tiny
in-memory keyword index that returns synthetic "grounding facts." It is wired
through the real rewrite pipeline and surfaced in the UI, so the *integration
shape* is already proven end-to-end.

In production, **Microsoft Foundry IQ would serve as the grounded *style knowledge
layer*** — the durable, consented home for a user's voice. Foundry IQ (the knowledge
layer in Azure AI Foundry) provides agent-ready retrieval over trusted, indexed
knowledge sources with built-in citations. The planned swap:

1. **Index** the user's own corpus in a Foundry IQ knowledge base — their past
   writing, brand/style guides, and voice notes — as a grounded style source for
   *both* extraction and rewrite.
2. **Replace** `retrieveKnowledge()` with a Foundry IQ retrieval call (Azure AI
   Foundry SDK), passing the source text + intended topic.
3. **Map** the returned passages + citations onto the existing `KnowledgeFact`
   shape (`claim` / `source` / `confidence`) — already a 1:1 fit.
4. **Flip** `grounded: true` and render the real citations (the UI already shows them).
5. *(Stretch)* Use an **LLM rewrite** (e.g. Claude) behind the same `rewriteInStyle()`
   signature, grounded by the Foundry IQ context, with the deterministic engine
   kept as a fast offline fallback and as a guardrail/scorer.

The exact insertion point is marked with a `TODO(foundry-iq)` block at the top of
`src/lib/dna/knowledge.ts`. **No Azure resources are required to run the demo.**

---

## ⚠️ Synthetic data disclaimer & consent

**This app is consent-based by design.** The intended use is that you extract a style
profile from **your own** writing, with your knowledge, into a **temporary** profile
that lives only in the current session.

**The demo styles are synthetic and exist only for safe testing.** The five presets in
`src/lib/dna/profiles.ts` (*Friendly Creator, Data-Driven Analyst, Calm Editor,
High-Energy Founder, Casual Messenger*) are **descriptive writing styles, not
characters or people** — their samples are fictional and authored for this demo, and
do not represent any real person or any real private text. The mock knowledge "facts"
in `knowledge.ts` are likewise invented placeholders (note their `mock://` sources).

When you paste your **own** sample, it is processed **locally in your browser and
this app's own server route** — it is never stored and never sent to any third-party
service in the current build. (That changes only if/when you opt into a real provider
per the Foundry IQ plan above.)

---

## 🚀 Local setup

**Prerequisites:** Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# → open http://localhost:3000

# 3. (optional) Production build
npm run build && npm run start
```

No `.env`, no API keys, no Azure login. It just runs.

### Try it

1. **Step 1** — paste your own writing (or, just to test, pick a synthetic demo style).
2. **Step 2** — hit **🧬 Generate Writing DNA** to build your **"Your Writing DNA"** card.
3. **Step 3** — type **what you want to say**, pick an **output format**, optionally
   toggle **Ground with knowledge layer**, then hit **✨ Rewrite in my voice**.
4. Inspect the DNA profile, the rewritten output, the applied transforms, and the
   style-match score. Try Korean text to see language-preserving output.

---

## 🧪 API reference

| Endpoint | Body | Returns |
|----------|------|---------|
| `POST /api/extract` | `{ sample }` | `{ dna: WritingDNA }` |
| `POST /api/rewrite` | `{ styleSample, sourceText, format, useKnowledge?, recipientName?, senderName? }` | `RewriteResult` |

`format` ∈ `casual-message` · `sns-post` · `professional-email` · `blog-paragraph`.

---

## 📁 Project structure

```
src/
├─ app/
│  ├─ api/
│  │  ├─ extract/route.ts     # POST /api/extract
│  │  └─ rewrite/route.ts     # POST /api/rewrite
│  ├─ layout.tsx              # metadata, fonts
│  ├─ page.tsx                # hero + <Studio/> (Server Component)
│  └─ globals.css             # Tailwind v4 theme + animations
├─ components/
│  ├─ Studio.tsx              # guided 3-step client component
│  ├─ DnaProfileCard.tsx      # "Your Writing DNA" profile card
│  ├─ DnaBars.tsx             # five-axis bar chart
│  └─ ScoreBreakdown.tsx      # score ring + per-axis breakdown
└─ lib/dna/                   # the provider-agnostic engine (see table above)
```

---

## 🗺️ Roadmap

- [ ] Wire **Microsoft Foundry IQ** retrieval into `retrieveKnowledge()`.
- [ ] Optional **LLM-backed** extraction & rewrite (Claude) behind the same contracts.
- [ ] Persist a user's DNA across sessions (export / import a `.dna.json`).
- [ ] More formats (slide bullet, release note, cover letter) and tone "dials."
- [ ] Side-by-side **before/after** diff view.

---

*Built for the Microsoft Agents League Hackathon · Creative Apps.*
