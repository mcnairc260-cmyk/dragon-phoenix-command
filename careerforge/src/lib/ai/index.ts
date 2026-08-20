import "server-only";

import { env } from "@/lib/server/env";

import { AnthropicProvider } from "./providers/anthropic";
import { MockAiProvider } from "./providers/mock";
import type { AiProvider } from "./types";

/**
 * Provider selection. Adding a vendor means writing one class that satisfies
 * `AiProvider` and adding a branch here — nothing above this line knows which
 * model is behind the interface.
 */
let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;

  cached =
    env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY
      ? new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL)
      : new MockAiProvider();

  return cached;
}

/** Exposed to the UI so it can say plainly which provider produced a result. */
export function describeProvider(): {
  name: string;
  model: string;
  isMock: boolean;
} {
  const provider = getAiProvider();
  return {
    name: provider.name,
    model: provider.model,
    isMock: provider.name === "mock",
  };
}

export type { AiProvider } from "./types";
export { AiProviderError } from "./types";
