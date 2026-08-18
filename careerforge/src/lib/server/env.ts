import "server-only";

import { z } from "zod";

/**
 * Server-side environment. Parsed once, at first import, so a misconfigured
 * deployment fails loudly at boot rather than mysteriously at request time.
 *
 * Nothing in here may be imported from a client component — the `server-only`
 * import above turns any such attempt into a build error.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_URL: z.string().url().optional(),

  AI_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),

  DEMO_EMAIL: z.string().email().default("demo@careerforge.app"),
  DEMO_PASSWORD: z.string().min(8).default("demo-password-1234"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nSee .env.example for the full list.`,
    );
  }

  // Selecting the real provider without a key would fail at the first call
  // with an opaque 401. Catch it here instead.
  if (parsed.data.AI_PROVIDER === "anthropic" && !parsed.data.ANTHROPIC_API_KEY) {
    throw new Error(
      'AI_PROVIDER is "anthropic" but ANTHROPIC_API_KEY is empty. Set the key, or use AI_PROVIDER="mock".',
    );
  }

  return parsed.data;
}

export const env = loadEnv();
