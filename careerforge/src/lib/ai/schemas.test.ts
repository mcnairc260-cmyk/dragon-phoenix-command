import { describe, expect, it } from "vitest";

import {
  analysisResultSchema,
  extractJson,
  materialResultSchema,
} from "./schemas";
import { MockAiProvider } from "./providers/mock";
import type { CandidateContext, JobContext } from "./types";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON inside a fenced block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON inside an unlabelled fence", () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("recovers JSON that a model prefixed with commentary", () => {
    expect(extractJson('Sure! Here you go:\n{"a":1}')).toEqual({ a: 1 });
  });

  it("throws when there is no object at all", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow();
  });
});

describe("analysisResultSchema", () => {
  const valid = {
    fitScore: 72,
    recommendedPriority: "HIGH",
    explanation: "Good match on the required skills.",
    requiredSkills: [{ name: "Go", evidence: "CONFIRMED", note: "" }],
    preferredSkills: [],
    matchedSkills: [{ name: "Go", evidence: "CONFIRMED", note: "" }],
    missingQualifications: [{ item: "Kafka", severity: "MAJOR", note: "" }],
    strengths: ["Strong Go background."],
    concerns: [],
  };

  it("accepts a well-formed result", () => {
    expect(analysisResultSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    expect(
      analysisResultSchema.safeParse({ ...valid, fitScore: 140 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer score", () => {
    expect(
      analysisResultSchema.safeParse({ ...valid, fitScore: 72.5 }).success,
    ).toBe(false);
  });

  it("rejects an invented evidence level", () => {
    const drifted = {
      ...valid,
      requiredSkills: [{ name: "Go", evidence: "PROBABLY", note: "" }],
    };
    expect(analysisResultSchema.safeParse(drifted).success).toBe(false);
  });

  it("rejects an invented priority", () => {
    expect(
      analysisResultSchema.safeParse({ ...valid, recommendedPriority: "ASAP" })
        .success,
    ).toBe(false);
  });

  it("rejects a missing explanation", () => {
    expect(
      analysisResultSchema.safeParse({ ...valid, explanation: "" }).success,
    ).toBe(false);
  });
});

describe("materialResultSchema", () => {
  it("defaults the source list to empty", () => {
    const parsed = materialResultSchema.parse({ content: "Hello." });
    expect(parsed.sourceAccomplishmentIds).toEqual([]);
  });

  it("rejects empty content", () => {
    expect(materialResultSchema.safeParse({ content: "" }).success).toBe(false);
  });
});

describe("MockAiProvider", () => {
  const provider = new MockAiProvider();

  const candidate: CandidateContext = {
    fullName: "Test Candidate",
    headline: "Backend engineer",
    email: "test@example.com",
    phone: null,
    location: "Remote",
    links: [],
    targetRoles: ["Senior Backend Engineer"],
    preferredLocations: ["Remote (US)"],
    workMode: "REMOTE",
    desiredSalaryMin: 150_000,
    desiredSalaryMax: 190_000,
    salaryCurrency: "USD",
    masterResume: "Backend engineer with Go and PostgreSQL experience.",
    skills: [
      { name: "Go", category: null, level: "EXPERT", yearsExperience: 6 },
      {
        name: "PostgreSQL",
        category: null,
        level: "ADVANCED",
        yearsExperience: 8,
      },
    ],
    employments: [
      {
        company: "Acme",
        title: "Senior Backend Engineer",
        location: "Remote",
        startDate: "2019-01-01",
        endDate: null,
        isCurrent: true,
        summary: "Owns the billing service",
      },
    ],
    educations: [],
    accomplishments: [
      {
        id: "acc-1",
        title: "Cut settlement runtime",
        situation: "Settlement was saturating the writer",
        task: "Remove the bottleneck",
        action: "Partitioned the write path",
        result: "Runs finished in a fraction of the time",
        metric: "4h to 40m",
        skillTags: ["PostgreSQL", "Go"],
        categories: ["Backend"],
        company: "Acme",
      },
    ],
  };

  const job: JobContext = {
    title: "Senior Backend Engineer",
    company: "Example Co",
    location: "Remote (US)",
    workMode: "REMOTE",
    salaryText: "$170,000",
    salaryMin: 170_000,
    salaryMax: 190_000,
    description: "Requirements:\n- Go\n- PostgreSQL\n- Kafka",
  };

  it("returns schema-valid analysis", async () => {
    const result = await provider.analyzeJob({ candidate, job });
    expect(analysisResultSchema.safeParse(result).success).toBe(true);
  });

  it("returns the same analysis for the same input", async () => {
    const a = await provider.analyzeJob({ candidate, job });
    const b = await provider.analyzeJob({ candidate, job });
    expect(a).toEqual(b);
  });

  it("generates every material kind without throwing", async () => {
    const kinds = [
      "SUMMARY",
      "RESUME_BULLETS",
      "COVER_LETTER",
      "RECRUITER_OUTREACH",
      "HIRING_MANAGER_OUTREACH",
      "INTERVIEW_QUESTIONS",
      "STAR_PROMPTS",
      "COMPANY_RESEARCH",
    ] as const;

    for (const kind of kinds) {
      const result = await provider.generateMaterial({
        candidate,
        job,
        kind,
        analysis: null,
      });
      expect(result.content.length).toBeGreaterThan(0);
    }
  });

  it("only ever cites the candidate's own accomplishment ids", async () => {
    const ownIds = new Set(candidate.accomplishments.map((a) => a.id));

    const result = await provider.generateMaterial({
      candidate,
      job,
      kind: "COVER_LETTER",
      analysis: null,
    });

    for (const id of result.sourceAccomplishmentIds) {
      expect(ownIds.has(id)).toBe(true);
    }
  });

  it("never puts an employer the candidate did not list into a cover letter", async () => {
    const result = await provider.generateMaterial({
      candidate,
      job,
      kind: "COVER_LETTER",
      analysis: null,
    });

    // The only company names that may appear are the candidate's own employers
    // and the company being applied to.
    expect(result.content).not.toMatch(/Northwind|Cobalt|Tidewater/);
    expect(result.content).toContain("Acme");
  });

  it("says the bank is empty rather than inventing content", async () => {
    const bare = { ...candidate, accomplishments: [] };
    const result = await provider.generateMaterial({
      candidate: bare,
      job,
      kind: "RESUME_BULLETS",
      analysis: null,
    });

    expect(result.content).toContain("accomplishment bank");
    expect(result.sourceAccomplishmentIds).toEqual([]);
  });
});
