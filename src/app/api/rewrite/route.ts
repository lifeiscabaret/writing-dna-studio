import { isOutputFormat } from "@/lib/dna";
import { runAgentPipeline } from "@/lib/agents";
import type { Refinement } from "@/lib/agents/types";

/**
 * POST /api/rewrite
 * Body: {
 *   styleSample: string,
 *   sourceText: string,
 *   format: OutputFormat,
 *   useKnowledge?: boolean,
 *   recipientName?: string,
 *   senderName?: string,
 * }
 * Returns: RewriteResult with agent tracing metadata.
 *
 * The whole extract → ground → rewrite → score pipeline runs here on the server,
 * which is exactly where a Foundry IQ retrieval call and/or an LLM rewrite would
 * be wired in without changing the client.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    styleSample,
    sourceText,
    format,
    useKnowledge,
    recipientName,
    senderName,
    refinement,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof styleSample !== "string" || styleSample.trim().length < 20) {
    return Response.json(
      { error: "Style sample must be at least 20 characters." },
      { status: 400 },
    );
  }
  if (typeof sourceText !== "string" || sourceText.trim().length < 3) {
    return Response.json({ error: "Source text is required." }, { status: 400 });
  }
  if (!isOutputFormat(format)) {
    return Response.json({ error: "Unknown output format." }, { status: 400 });
  }

  const refinementValue =
    typeof refinement === "string" &&
    ["warmer", "shorter", "more confident", "more casual", "more polished"].includes(refinement)
      ? (refinement as Refinement)
      : undefined;

  const result = await runAgentPipeline({
    styleSample,
    sourceText,
    format,
    useKnowledge: Boolean(useKnowledge),
    recipientName: typeof recipientName === "string" ? recipientName : undefined,
    senderName: typeof senderName === "string" ? senderName : undefined,
    refinement: refinementValue,
  });

  return Response.json(result);
}
