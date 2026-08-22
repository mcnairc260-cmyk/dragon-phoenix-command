import { describe, expect, it } from "vitest";

import {
  analyzeHeuristically,
  classifyEvidence,
  computeScore,
  coverage,
  detectRequirements,
  priorityForScore,
  requiredYears,
  SCORE_WEIGHTS,
  seniorityRank,
  splitSections,
  totalExperienceYears,
} from "./heuristics";
import type { CandidateContext, JobContext } from "./types";

function candidate(
  overrides: Partial<CandidateContext> = {},
): CandidateContext {
  return {
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
    masterResume: "",
    skills: [
      {
        name: "Go",
        category: "Languages",
        level: "EXPERT",
        yearsExperience: 6,
      },
      {
        name: "PostgreSQL",
        category: "Data",
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
        summary: "Owns the billing service.",
      },
    ],
    educations: [],
    accomplishments: [],
    ...overrides,
  };
}

function job(overrides: Partial<JobContext> = {}): JobContext {
  return {
    title: "Senior Backend Engineer",
    company: "Example Co",
    location: "Remote (US)",
    workMode: "REMOTE",
    salaryText: "$160,000 - $190,000",
    salaryMin: 160_000,
    salaryMax: 190_000,
    description: "Requirements:\n- Go\n- PostgreSQL",
    ...overrides,
  };
}

describe("splitSections", () => {
  it("routes lines into required, preferred, and other by heading", () => {
    const sections = splitSections(
      [
        "About the role:",
        "We build things.",
        "Requirements:",
        "- Go",
        "- PostgreSQL",
        "Nice to have:",
        "- Kubernetes",
      ].join("\n"),
    );

    expect(sections.other).toEqual(["We build things."]);
    expect(sections.required).toEqual(["- Go", "- PostgreSQL"]);
    expect(sections.preferred).toEqual(["- Kubernetes"]);
  });

  it("puts everything in other when the posting has no headings", () => {
    const sections = splitSections("We want someone who knows Go and Kafka.");
    expect(sections.required).toEqual([]);
    expect(sections.other).toHaveLength(1);
  });
});

describe("detectRequirements", () => {
  it("groups an alternation into one requirement", () => {
    const requirements = detectRequirements(
      "7+ years building services in Go, Java, or a similar systems language",
      [],
    );

    const grouped = requirements.find((r) => r.alternatives.length > 1);
    expect(grouped?.alternatives.map((a) => a.toLowerCase()).sort()).toEqual([
      "go",
      "java",
    ]);
  });

  it("handles an alternation without the Oxford comma", () => {
    const requirements = detectRequirements(
      "Experience with Kafka or Kinesis is required",
      [],
    );
    const grouped = requirements.find((r) => r.alternatives.length > 1);
    expect(grouped?.alternatives).toHaveLength(2);
  });

  it("picks up a candidate's own skill even when it is not in the lexicon", () => {
    const requirements = detectRequirements(
      "You will work daily with Fizzbuzz Framework.",
      ["Fizzbuzz Framework"],
    );
    expect(
      requirements.some((r) => r.alternatives.includes("Fizzbuzz Framework")),
    ).toBe(true);
  });

  it("detects a term at the end of a sentence", () => {
    // The trailing full stop must not suppress the match.
    const requirements = detectRequirements("You will need PostgreSQL.", []);
    expect(requirements.flatMap((r) => r.alternatives)).toContain("postgresql");
  });

  it("does not match a bare term inside a dotted one", () => {
    const requirements = detectRequirements("We use Node.js everywhere.", []);
    const names = requirements.flatMap((r) => r.alternatives);
    expect(names).toContain("node.js");
    expect(names).not.toContain("go");
  });

  it("keeps the longer of two overlapping terms", () => {
    const requirements = detectRequirements("Deep PostgreSQL experience", []);
    const names = requirements.flatMap((r) => r.alternatives);
    expect(names).toContain("postgresql");
    expect(names).not.toContain("postgres");
  });
});

describe("classifyEvidence", () => {
  const person = candidate();

  it("marks a declared skill as confirmed", () => {
    expect(classifyEvidence("Go", person, "")).toBe("CONFIRMED");
  });

  it("marks something only in the wider history as inferred", () => {
    expect(classifyEvidence("Terraform", person, "used terraform daily")).toBe(
      "INFERRED",
    );
  });

  it("infers an implied skill from a declared related one", () => {
    const withKafka = candidate({
      skills: [
        {
          name: "Kafka",
          category: null,
          level: "ADVANCED",
          yearsExperience: 4,
        },
      ],
    });
    // Declaring Kafka means the candidate has event-streaming experience.
    // Reporting it as missing would send them to fix a gap they do not have.
    expect(classifyEvidence("event streaming", withKafka, "")).toBe("INFERRED");
  });

  it("never promotes an implied skill to confirmed", () => {
    const withKafka = candidate({
      skills: [
        {
          name: "Kafka",
          category: null,
          level: "ADVANCED",
          yearsExperience: 4,
        },
      ],
    });
    expect(classifyEvidence("event streaming", withKafka, "")).not.toBe(
      "CONFIRMED",
    );
  });

  it("marks an unsupported skill as missing", () => {
    expect(classifyEvidence("COBOL", person, "")).toBe("MISSING");
  });
});

describe("coverage", () => {
  it("returns the neutral prior when nothing was detected", () => {
    expect(coverage([])).toBeCloseTo(0.55, 5);
  });

  it("shrinks a short perfect match toward the prior", () => {
    const twoPerfect = coverage([
      { name: "a", evidence: "CONFIRMED", note: "" },
      { name: "b", evidence: "CONFIRMED", note: "" },
    ]);
    expect(twoPerfect).toBeLessThan(1);
    expect(twoPerfect).toBeGreaterThan(0.7);
  });

  it("moves a long list barely at all", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `skill-${i}`,
      evidence: "CONFIRMED" as const,
      note: "",
    }));
    expect(coverage(many)).toBeGreaterThan(0.95);
  });

  it("counts an inferred match as half a confirmed one", () => {
    const inferred = coverage([{ name: "a", evidence: "INFERRED", note: "" }]);
    const confirmed = coverage([
      { name: "a", evidence: "CONFIRMED", note: "" },
    ]);
    const missing = coverage([{ name: "a", evidence: "MISSING", note: "" }]);
    expect(inferred).toBeGreaterThan(missing);
    expect(inferred).toBeLessThan(confirmed);
  });
});

describe("computeScore", () => {
  it("weights sum to one, so a perfect breakdown scores 100", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);

    expect(
      computeScore({
        requiredCoverage: 1,
        preferredCoverage: 1,
        experience: 1,
        seniority: 1,
        location: 1,
        salary: 1,
      }),
    ).toBe(100);
  });

  it("clamps to the 0-100 range", () => {
    expect(
      computeScore({
        requiredCoverage: 0,
        preferredCoverage: 0,
        experience: 0,
        seniority: 0,
        location: 0,
        salary: 0,
      }),
    ).toBe(0);
  });
});

describe("requiredYears", () => {
  it("takes the highest figure mentioned", () => {
    expect(requiredYears("3+ years here, 7 years there")).toBe(7);
  });

  it("returns null when no figure is given", () => {
    expect(requiredYears("Experience with backend systems")).toBeNull();
  });
});

describe("totalExperienceYears", () => {
  it("merges overlapping roles instead of double counting", () => {
    const person = candidate({
      employments: [
        {
          company: "A",
          title: "Engineer",
          location: null,
          startDate: "2015-01-01",
          endDate: "2020-01-01",
          isCurrent: false,
          summary: "",
        },
        {
          company: "B",
          title: "Consultant",
          location: null,
          startDate: "2017-01-01",
          endDate: "2019-01-01",
          isCurrent: false,
          summary: "",
        },
      ],
    });

    // Five years of span, not seven.
    expect(totalExperienceYears(person)).toBeCloseTo(5, 0);
  });

  it("returns zero with no employment history", () => {
    expect(totalExperienceYears(candidate({ employments: [] }))).toBe(0);
  });
});

describe("seniorityRank", () => {
  it("reads a plain engineer title as mid-level", () => {
    expect(seniorityRank("Backend Engineer, Core Services")).toBe(2);
  });

  it("ranks senior above mid and principal above senior", () => {
    const mid = seniorityRank("Software Engineer") ?? 0;
    const senior = seniorityRank("Senior Software Engineer") ?? 0;
    const principal = seniorityRank("Principal Engineer") ?? 0;
    expect(senior).toBeGreaterThan(mid);
    expect(principal).toBeGreaterThan(senior);
  });

  it("reads 'Member of Technical Staff' as staff level", () => {
    expect(seniorityRank("Member of Technical Staff")).toBe(4);
  });

  it("returns null for a title with no seniority signal", () => {
    expect(seniorityRank("Data Analyst")).toBeNull();
  });
});

describe("priorityForScore", () => {
  it("escalates a decent fit with an imminent deadline", () => {
    expect(priorityForScore(70, 2)).toBe("URGENT");
  });

  it("does not escalate a weak fit however close the deadline", () => {
    expect(priorityForScore(40, 1)).not.toBe("URGENT");
  });

  it("calls a strong fit high priority", () => {
    expect(priorityForScore(85, null)).toBe("HIGH");
  });
});

describe("analyzeHeuristically", () => {
  it("scores a well-matched remote role above a mismatched on-site one", () => {
    const person = candidate();

    const good = analyzeHeuristically(person, job());
    const bad = analyzeHeuristically(
      person,
      job({
        title: "Backend Engineer",
        workMode: "ONSITE",
        location: "New York, NY",
        salaryMin: 90_000,
        salaryMax: 110_000,
        salaryText: "$90,000 - $110,000",
        description: "Requirements:\n- COBOL\n- Mainframe administration",
      }),
    );

    expect(good.fitScore).toBeGreaterThan(bad.fitScore);
  });

  it("never reports a skill as confirmed unless the profile lists it", () => {
    const result = analyzeHeuristically(
      candidate(),
      job({ description: "Requirements:\n- Rust\n- Elixir" }),
    );

    for (const finding of result.requiredSkills) {
      if (finding.evidence !== "CONFIRMED") continue;
      expect(["go", "postgresql"]).toContain(finding.name.toLowerCase());
    }
  });

  it("treats an unstructured posting as weakly required rather than empty", () => {
    const result = analyzeHeuristically(
      candidate(),
      job({ description: "We are looking for someone who knows Go well." }),
    );
    expect(result.requiredSkills.length).toBeGreaterThan(0);
  });

  it("flags an experience shortfall as a gap", () => {
    const junior = candidate({
      employments: [
        {
          company: "A",
          title: "Engineer",
          location: null,
          startDate: "2024-01-01",
          endDate: null,
          isCurrent: true,
          summary: "",
        },
      ],
    });

    const result = analyzeHeuristically(
      junior,
      job({ description: "Requirements:\n- 10+ years of backend experience" }),
    );

    expect(
      result.missingQualifications.some((g) => g.item.includes("10 years")),
    ).toBe(true);
  });

  it("produces a score inside the valid range for an empty profile", () => {
    const empty = candidate({
      skills: [],
      employments: [],
      accomplishments: [],
      masterResume: "",
    });
    const result = analyzeHeuristically(empty, job());

    expect(result.fitScore).toBeGreaterThanOrEqual(0);
    expect(result.fitScore).toBeLessThanOrEqual(100);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same inputs", () => {
    const person = candidate();
    const a = analyzeHeuristically(person, job());
    const b = analyzeHeuristically(person, job());
    expect(a).toEqual(b);
  });
});
