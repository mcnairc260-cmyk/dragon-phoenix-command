import { z } from "zod";

/**
 * The contract between CareerForge and whichever model is behind the provider
 * interface. Everything a provider returns is parsed through these before it
 * reaches the database, so a model that drifts, hallucinates a field, or
 * returns prose instead of JSON fails loudly at one place.
 */

export const evidenceLevelSchema = z.enum(["CONFIRMED", "INFERRED", "MISSING"]);
export type EvidenceLevel = z.infer<typeof evidenceLevelSchema>;

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  CONFIRMED: "Confirmed",
  INFERRED: "Inferred",
  MISSING: "No evidence",
};

export const EVIDENCE_EXPLANATION: Record<EvidenceLevel, string> = {
  CONFIRMED: "Stated outright in your profile — safe to claim.",
  INFERRED:
    "Implied by your profile but not stated. Check you can defend it before claiming it.",
  MISSING: "Nothing in your profile supports this. Treat it as a gap.",
};

export const skillFindingSchema = z.object({
  name: z.string().min(1).max(120),
  evidence: evidenceLevelSchema,
  /** Why the provider placed it at that evidence level. */
  note: z.string().max(400).default(""),
});

export const gapSchema = z.object({
  item: z.string().min(1).max(200),
  severity: z.enum(["MINOR", "MODERATE", "MAJOR"]),
  note: z.string().max(400).default(""),
});

export const analysisResultSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  recommendedPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  explanation: z.string().min(1).max(1500),
  requiredSkills: z.array(skillFindingSchema).max(40),
  preferredSkills: z.array(skillFindingSchema).max(40),
  matchedSkills: z.array(skillFindingSchema).max(40),
  missingQualifications: z.array(gapSchema).max(30),
  strengths: z.array(z.string().min(1).max(400)).max(10),
  concerns: z.array(z.string().min(1).max(400)).max(10),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type SkillFinding = z.infer<typeof skillFindingSchema>;
export type Gap = z.infer<typeof gapSchema>;

export const materialResultSchema = z.object({
  content: z.string().min(1).max(20_000),
  /**
   * Accomplishment ids the generator drew on. Validated against the user's own
   * accomplishments before storage, so a hallucinated id is dropped rather
   * than displayed as provenance.
   */
  sourceAccomplishmentIds: z
    .array(z.string().min(1).max(60))
    .max(20)
    .default([]),
});

export type MaterialResult = z.infer<typeof materialResultSchema>;

/** Parses JSON that may arrive wrapped in prose or a fenced code block. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost braces, which handles a model that prefixed
    // its JSON with a sentence of commentary.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("Provider returned no parseable JSON object");
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}
