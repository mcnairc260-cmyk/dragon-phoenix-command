import { analyzeHeuristically } from "../heuristics";
import { analysisResultSchema, materialResultSchema } from "../schemas";
import { buildMaterial } from "../templates";
import type { AiProvider, AnalyzeRequest, MaterialRequest } from "../types";

/**
 * The deterministic provider.
 *
 * It is not a stub. It runs the real heuristic analyser and the real template
 * builders, both of which draw only on the candidate's own record, so the
 * whole product — scoring, drafts, focus recommendations, analytics — works
 * with no API key, no network, and no spend. That makes local development,
 * CI, and the demo account behave identically, and it means an outage at a
 * model vendor degrades CareerForge rather than breaking it.
 *
 * Output is passed through the same Zod schemas as a real provider, so a bug
 * here surfaces the same way a model drift would.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly model = "deterministic-heuristics-v1";

  async analyzeJob(request: AnalyzeRequest) {
    const result = analyzeHeuristically(request.candidate, request.job);

    return analysisResultSchema.parse({
      fitScore: result.fitScore,
      recommendedPriority: result.recommendedPriority,
      explanation: result.explanation,
      requiredSkills: result.requiredSkills,
      preferredSkills: result.preferredSkills,
      matchedSkills: result.matchedSkills,
      missingQualifications: result.missingQualifications,
      strengths: result.strengths,
      concerns: result.concerns,
    });
  }

  async generateMaterial(request: MaterialRequest) {
    const built = buildMaterial(request.kind, {
      candidate: request.candidate,
      job: request.job,
      analysis: request.analysis,
    });

    return materialResultSchema.parse(built);
  }
}
