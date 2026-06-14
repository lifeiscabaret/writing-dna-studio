import type { DemoProfile } from "./types";

/**
 * Synthetic demo *styles* (not characters).
 *
 * These exist only so the studio can be tried safely without pasting real
 * personal writing. Each one is a descriptive writing-style label with a
 * fictional, hand-authored sample.
 *
 * ⚠️ SYNTHETIC DATA: every sample below is invented for this demo. None
 * represents a real person or any real private text. The product's primary
 * path is extracting a profile from the user's *own* consented samples.
 * See the README's "Synthetic data disclaimer" section.
 */
export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "friendly-creator",
    name: "Friendly Creator",
    blurb: "Warm and upbeat, with emoji and exclamation marks.",
    emoji: "💖",
    sample:
      "okay I just tried the new ramen place and oh my gosh it's SO good!! you have to come with me next time, seriously. the broth is unreal 🤤 we're def going back this weekend, I already can't stop thinking about it. bring your appetite!!",
  },
  {
    id: "data-analyst",
    name: "Data-Driven Analyst",
    blurb: "Precise, structured, and measured — reads like a brief.",
    emoji: "📊",
    sample:
      "Following our discussion, I would like to outline the proposed next steps. First, we will consolidate the requirements and circulate them for review. Second, the team will assess feasibility against the current timeline. Please let me know if this approach aligns with your expectations, and I will proceed accordingly.",
  },
  {
    id: "calm-editor",
    name: "Calm Editor",
    blurb: "Reflective and flowing, with longer, considered sentences.",
    emoji: "🌿",
    sample:
      "There's something about early mornings that I keep coming back to — the way the light spills slowly across the kitchen, the quiet before anyone else is awake, the sense that the day hasn't decided what it wants to be yet. I think that's when I do my best thinking, honestly, before the noise arrives and everything starts pulling at me.",
  },
  {
    id: "high-energy-founder",
    name: "High-Energy Founder",
    blurb: "Direct, punchy, and fast-moving. Gets to the point.",
    emoji: "⚡",
    sample:
      "Shipping Friday. Two blockers left. I need design sign-off by Wednesday and the API key from infra. If either slips, we slip. Flag risks early — no surprises. Let's keep it tight and move fast. We've got this!",
  },
  {
    id: "casual-messenger",
    name: "Casual Messenger",
    blurb: "Relaxed everyday texting — short, friendly, low-stakes.",
    emoji: "💬",
    sample:
      "hey! yeah that works for me. lemme know what time and i'll be there. no worries if plans change, just text me 👍 sounds good, see you then!",
  },
];

export function getProfile(id: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === id);
}
