import type { MaterialKind } from "@prisma/client";

import type { AnalysisResult, MaterialResult } from "./schemas";

/**
 * The candidate facts a provider is allowed to see and quote. Assembling this
 * explicitly — rather than handing a provider the raw database rows — is what
 * bounds what generated material can contain.
 */
export type CandidateContext = {
  fullName: string;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: { label: string; url: string }[];
  targetRoles: string[];
  preferredLocations: string[];
  workMode: string;
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
  salaryCurrency: string;
  masterResume: string;
  skills: {
    name: string;
    category: string | null;
    level: string;
    yearsExperience: number | null;
  }[];
  employments: {
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    summary: string;
  }[];
  educations: {
    institution: string;
    credential: string;
    field: string | null;
    endDate: string | null;
    notes: string;
  }[];
  accomplishments: {
    id: string;
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    metric: string | null;
    skillTags: string[];
    categories: string[];
    company: string | null;
  }[];
};

export type JobContext = {
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
};

export type AnalyzeRequest = {
  candidate: CandidateContext;
  job: JobContext;
};

export type MaterialRequest = {
  candidate: CandidateContext;
  job: JobContext;
  kind: MaterialKind;
  /** The stored analysis, when one exists. Materials read better with it. */
  analysis: AnalysisResult | null;
};

/**
 * The seam that makes the AI provider swappable.
 *
 * Implementations must return schema-valid data or throw. They must never
 * write to the database, and they must never be called from a client
 * component — every call site is a server action or route handler.
 */
export interface AiProvider {
  /** Stable id stored alongside output so cached results stay attributable. */
  readonly name: string;
  /** Model identifier, or a sentinel for providers without one. */
  readonly model: string;

  analyzeJob(request: AnalyzeRequest): Promise<AnalysisResult>;
  generateMaterial(request: MaterialRequest): Promise<MaterialResult>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
