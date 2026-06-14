import type { FormatDefinition, OutputFormat } from "./types";

export const FORMATS: FormatDefinition[] = [
  {
    id: "casual-message",
    label: "Casual message",
    description: "A quick text to a friend — short, friendly, low-stakes.",
    icon: "💬",
  },
  {
    id: "sns-post",
    label: "SNS post",
    description: "A punchy social post with a hook and a couple of hashtags.",
    icon: "📣",
  },
  {
    id: "professional-email",
    label: "Professional email",
    description: "A clear, courteous email with a greeting and sign-off.",
    icon: "✉️",
  },
  {
    id: "blog-paragraph",
    label: "Blog paragraph",
    description: "A flowing, self-contained paragraph for a blog post.",
    icon: "📝",
  },
];

export const FORMAT_IDS = FORMATS.map((f) => f.id);

export function getFormat(id: OutputFormat): FormatDefinition {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && FORMAT_IDS.includes(value as OutputFormat);
}
