import { extractWritingDNA } from "@/lib/dna";

/**
 * POST /api/extract
 * Body: { sample: string }
 * Returns: { dna: WritingDNA }
 *
 * This is the server-side seam where an LLM-backed extractor (e.g. Claude) or a
 * Foundry-IQ-grounded extractor would live. Today it runs the offline heuristic
 * engine — no API key required.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sample = (body as { sample?: unknown })?.sample;
  if (typeof sample !== "string" || sample.trim().length < 20) {
    return Response.json(
      { error: "Please provide a writing sample of at least 20 characters." },
      { status: 400 },
    );
  }

  const dna = extractWritingDNA(sample);
  return Response.json({ dna });
}
