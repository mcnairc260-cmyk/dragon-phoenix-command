import { MATERIAL_LABEL } from "@/lib/domain/constants";

import { rankAccomplishments } from "../heuristics";
import {
  analysisResultSchema,
  extractJson,
  materialResultSchema,
} from "../schemas";
import type {
  AiProvider,
  AnalyzeRequest,
  CandidateContext,
  JobContext,
  MaterialRequest,
} from "../types";
import { AiProviderError } from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const TIMEOUT_MS = 60_000;

/**
 * The Claude-backed provider.
 *
 * Two things here are load-bearing:
 *
 * 1. The model is given the candidate's record as structured data and told, in
 *    the system prompt, that it may not introduce facts. It is a real
 *    constraint on a real model, which means it can be violated — so the
 *    application never trusts it alone: accomplishment ids are checked against
 *    the user's own rows before being stored as provenance, and the UI shows
 *    the sources so the user can audit any draft.
 * 2. Everything returned is parsed by the same Zod schemas the mock provider
 *    satisfies. A model that returns prose, drifts on field names, or invents
 *    an enum value fails at the boundary rather than reaching the database.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  private async call(
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
          // Deterministic-ish: this is analysis, not brainstorming.
          temperature: 0.2,
        }),
      });
    } catch (error) {
      throw new AiProviderError(
        error instanceof Error && error.name === "AbortError"
          ? "The AI provider took too long to respond."
          : "Could not reach the AI provider.",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // The body may echo the prompt, which contains resume text, so it is
      // never logged or surfaced — only the status shapes the message.
      const retryable = response.status === 429 || response.status >= 500;
      throw new AiProviderError(
        retryable
          ? "The AI provider is busy. Try again in a moment."
          : "The AI provider rejected the request. Check the API key and model in your environment.",
        retryable,
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = (payload.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    if (!text) throw new AiProviderError("The AI provider returned nothing.");
    return text;
  }

  async analyzeJob(request: AnalyzeRequest) {
    const raw = await this.call(
      ANALYSIS_SYSTEM_PROMPT,
      analysisUserPrompt(request.candidate, request.job),
      4000,
    );

    const parsed = analysisResultSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
      throw new AiProviderError(
        "The AI provider returned data in an unexpected shape. The analysis was discarded rather than saved.",
        true,
      );
    }
    return parsed.data;
  }

  async generateMaterial(request: MaterialRequest) {
    const raw = await this.call(
      MATERIAL_SYSTEM_PROMPT,
      materialUserPrompt(request),
      4000,
    );

    const parsed = materialResultSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
      throw new AiProviderError(
        "The AI provider returned data in an unexpected shape. Nothing was saved.",
        true,
      );
    }
    return parsed.data;
  }
}

// --------------------------------------------------------------- prompts

const NO_FABRICATION = `
Absolute constraint: you may not introduce any fact that is not in CANDIDATE.
Never invent or embellish an employer, job title, date, duration, metric,
percentage, dollar figure, certification, degree, tool, or skill. If something
would strengthen the case but is not in CANDIDATE, leave it out and say the
evidence is missing. A weaker honest answer is correct; a stronger invented one
is a defect.
`.trim();

const ANALYSIS_SYSTEM_PROMPT = `
You analyse a job posting against a candidate's own record and return JSON.

${NO_FABRICATION}

Classify every skill you report with an evidence level:
- "CONFIRMED": the candidate explicitly lists it in CANDIDATE.skills.
- "INFERRED": it appears somewhere in their history (resume text, role
  summaries, accomplishments) but they do not claim it as a skill.
- "MISSING": nothing in CANDIDATE supports it.

Never mark something CONFIRMED to be encouraging. The distinction is the point:
the candidate uses it to decide what they can defend in an interview.

Scoring guidance: fitScore is 0-100 and should be dominated by coverage of the
posting's required skills, adjusted for years of experience, seniority, work
mode, and salary alignment. Be calibrated, not kind — an inflated score wastes
the candidate's time.

Return ONLY a JSON object, no prose and no code fence, with exactly these keys:
{
  "fitScore": number 0-100,
  "recommendedPriority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "explanation": string, at most 3 sentences explaining the score,
  "requiredSkills": [{ "name": string, "evidence": "CONFIRMED"|"INFERRED"|"MISSING", "note": string }],
  "preferredSkills": [same shape],
  "matchedSkills": [same shape, only CONFIRMED or INFERRED entries],
  "missingQualifications": [{ "item": string, "severity": "MINOR"|"MODERATE"|"MAJOR", "note": string }],
  "strengths": [string],
  "concerns": [string]
}
`.trim();

const MATERIAL_SYSTEM_PROMPT = `
You draft one piece of job-application material from a candidate's own record
and return JSON.

${NO_FABRICATION}

Write in the candidate's voice: plain, specific, and free of filler. No
superlatives the record does not earn, no "passionate about", no "proven track
record". Short sentences. If the record is thin, the draft should be short —
padding it with generic claims is worse than brevity.

Where the posting asks for something the candidate cannot evidence, either omit
it or name the gap plainly. Never paper over it.

Return ONLY a JSON object, no prose and no code fence:
{
  "content": string, the draft itself, Markdown where structure helps,
  "sourceAccomplishmentIds": [string], the ids from CANDIDATE.accomplishments
    that you actually drew on. Use the exact ids given. Empty array if none.
}
`.trim();

function candidateBlock(candidate: CandidateContext): string {
  // Sent as JSON so the model sees structure rather than prose it might
  // paraphrase loosely.
  return JSON.stringify(
    {
      fullName: candidate.fullName,
      headline: candidate.headline,
      contact: {
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        links: candidate.links,
      },
      preferences: {
        targetRoles: candidate.targetRoles,
        preferredLocations: candidate.preferredLocations,
        workMode: candidate.workMode,
        desiredSalaryMin: candidate.desiredSalaryMin,
        desiredSalaryMax: candidate.desiredSalaryMax,
        currency: candidate.salaryCurrency,
      },
      skills: candidate.skills,
      employments: candidate.employments,
      educations: candidate.educations,
      accomplishments: candidate.accomplishments,
      masterResume: candidate.masterResume,
    },
    null,
    2,
  );
}

function jobBlock(job: JobContext): string {
  return JSON.stringify(
    {
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      salary: job.salaryText,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      description: job.description,
    },
    null,
    2,
  );
}

function analysisUserPrompt(
  candidate: CandidateContext,
  job: JobContext,
): string {
  return [
    "CANDIDATE:",
    candidateBlock(candidate),
    "",
    "JOB:",
    jobBlock(job),
    "",
    "Analyse the fit and return the JSON object described in your instructions.",
  ].join("\n");
}

function materialUserPrompt(request: MaterialRequest): string {
  const { candidate, job, kind, analysis } = request;

  // Narrow the accomplishment set to what is plausibly relevant. A shorter,
  // sharper context produces better drafts and costs less per call.
  const terms = [
    ...(analysis?.requiredSkills ?? []).map((s) => s.name),
    ...(analysis?.preferredSkills ?? []).map((s) => s.name),
  ];
  const ranked = rankAccomplishments(candidate, terms, 8);
  const focused =
    ranked.length > 0 ? ranked : candidate.accomplishments.slice(0, 8);

  return [
    "CANDIDATE:",
    candidateBlock({ ...candidate, accomplishments: focused }),
    "",
    "JOB:",
    jobBlock(job),
    "",
    analysis
      ? `EXISTING_ANALYSIS:\n${JSON.stringify(analysis, null, 2)}`
      : "EXISTING_ANALYSIS: none — no fit analysis has been run for this job.",
    "",
    `TASK: Write the "${MATERIAL_LABEL[kind]}" for this application.`,
    MATERIAL_BRIEF[kind],
  ].join("\n");
}

const MATERIAL_BRIEF: Record<MaterialRequest["kind"], string> = {
  SUMMARY:
    "Three sentences at most. Who they are, what they are strongest at, and the single most relevant proof point.",
  RESUME_BULLETS:
    "Rewrite the candidate's existing accomplishments in this posting's vocabulary. One bullet per accomplishment, at most six. Do not merge two accomplishments into one claim.",
  COVER_LETTER:
    "Under 300 words. Open with the role, give two concrete proof points from the accomplishments, name any major gap honestly, close briefly. Sign with the candidate's real contact details.",
  RECRUITER_OUTREACH:
    "A short email with a subject line. Under 150 words. One proof point.",
  HIRING_MANAGER_OUTREACH:
    "A short email with a subject line. Under 150 words. Lead with a single specific piece of work, not a summary of the resume.",
  INTERVIEW_QUESTIONS:
    "Questions this specific posting makes likely, grouped as technical, behavioural, and questions the candidate should ask. Flag any question that targets a gap the analysis found.",
  STAR_PROMPTS:
    "For each of the most relevant accomplishments, lay out Situation / Task / Action / Result using only what the candidate wrote, and add one rehearsal prompt per item.",
  COMPANY_RESEARCH:
    "A checklist of what to find out before applying and before interviewing, plus the questions this specific posting raises. No invented facts about the company.",
};
