import type { CandidateContext, JobContext } from "./types";
import type { EvidenceLevel, Gap, SkillFinding } from "./schemas";

/**
 * Deterministic job-analysis heuristics.
 *
 * These power the mock provider, so the entire application works with no API
 * key and no network. They are also the fallback shape a real provider is
 * validated against, and they are pure functions, which makes the scoring
 * testable without mocking a model.
 *
 * The heuristics are honest about being heuristics: they match language, not
 * meaning. A real provider does better on nuance. What they get right is the
 * part that matters most — never claiming evidence the profile does not
 * contain.
 */

/** Common technology and competency terms worth recognising in a posting. */
const SKILL_LEXICON = [
  "go",
  "golang",
  "rust",
  "python",
  "java",
  "kotlin",
  "scala",
  "ruby",
  "php",
  "c#",
  "c++",
  "swift",
  "typescript",
  "javascript",
  "elixir",
  "clojure",
  "react",
  "vue",
  "angular",
  "svelte",
  "next.js",
  "node.js",
  "deno",
  "django",
  "rails",
  "spring",
  "flask",
  "fastapi",
  ".net",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "cassandra",
  "dynamodb",
  "clickhouse",
  "snowflake",
  "bigquery",
  "elasticsearch",
  "kafka",
  "rabbitmq",
  "kinesis",
  "pubsub",
  "sqs",
  "grpc",
  "graphql",
  "rest",
  "protocol buffers",
  "websockets",
  "kubernetes",
  "docker",
  "terraform",
  "pulumi",
  "ansible",
  "helm",
  "aws",
  "gcp",
  "azure",
  "serverless",
  "lambda",
  "ci/cd",
  "github actions",
  "jenkins",
  "circleci",
  "argocd",
  "observability",
  "prometheus",
  "grafana",
  "datadog",
  "opentelemetry",
  "distributed systems",
  "microservices",
  "event streaming",
  "etl",
  "machine learning",
  "data engineering",
  "data modelling",
  "data modeling",
  "security",
  "authentication",
  "authorization",
  "oauth",
  "encryption",
  "payments",
  "billing",
  "ledger",
  "settlement",
  "fintech",
  "compliance",
  "hipaa",
  "soc 2",
  "fedramp",
  "pci",
  "gdpr",
  "hl7",
  "fhir",
  "testing",
  "unit testing",
  "integration testing",
  "property-based testing",
  "formal verification",
  "performance tuning",
  "query optimisation",
  "query optimization",
  "scalability",
  "reliability",
  "incident response",
  "on-call",
  "sre",
  "platform engineering",
  "developer tooling",
  "mentoring",
  "technical leadership",
  "architecture",
  "code review",
  "agile",
  "scrum",
  "product sense",
  "stakeholder management",
  "accessibility",
  "design systems",
  "figma",
  "sql",
  "nosql",
  "linux",
  "git",
  "multi-tenant",
  "saas",
  "api design",
  "schema design",
] as const;

/**
 * How lexicon terms should be written when shown to a person. Terms the
 * candidate typed themselves are already cased the way they want them; these
 * are only for the ones we recognised generically.
 */
const DISPLAY_NAME: Record<string, string> = {
  go: "Go",
  golang: "Go",
  rust: "Rust",
  python: "Python",
  java: "Java",
  kotlin: "Kotlin",
  scala: "Scala",
  ruby: "Ruby",
  php: "PHP",
  "c#": "C#",
  "c++": "C++",
  swift: "Swift",
  typescript: "TypeScript",
  javascript: "JavaScript",
  elixir: "Elixir",
  clojure: "Clojure",
  react: "React",
  vue: "Vue",
  angular: "Angular",
  svelte: "Svelte",
  "next.js": "Next.js",
  "node.js": "Node.js",
  deno: "Deno",
  django: "Django",
  rails: "Rails",
  spring: "Spring",
  flask: "Flask",
  fastapi: "FastAPI",
  ".net": ".NET",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  cassandra: "Cassandra",
  dynamodb: "DynamoDB",
  clickhouse: "ClickHouse",
  snowflake: "Snowflake",
  bigquery: "BigQuery",
  elasticsearch: "Elasticsearch",
  kafka: "Kafka",
  rabbitmq: "RabbitMQ",
  kinesis: "Kinesis",
  pubsub: "Pub/Sub",
  sqs: "SQS",
  grpc: "gRPC",
  graphql: "GraphQL",
  rest: "REST",
  "protocol buffers": "Protocol Buffers",
  websockets: "WebSockets",
  kubernetes: "Kubernetes",
  docker: "Docker",
  terraform: "Terraform",
  pulumi: "Pulumi",
  ansible: "Ansible",
  helm: "Helm",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  lambda: "Lambda",
  "ci/cd": "CI/CD",
  "github actions": "GitHub Actions",
  jenkins: "Jenkins",
  circleci: "CircleCI",
  argocd: "Argo CD",
  prometheus: "Prometheus",
  grafana: "Grafana",
  datadog: "Datadog",
  opentelemetry: "OpenTelemetry",
  etl: "ETL",
  hipaa: "HIPAA",
  "soc 2": "SOC 2",
  fedramp: "FedRAMP",
  pci: "PCI",
  gdpr: "GDPR",
  hl7: "HL7",
  fhir: "FHIR",
  sre: "SRE",
  sql: "SQL",
  nosql: "NoSQL",
  linux: "Linux",
  git: "Git",
  saas: "SaaS",
  figma: "Figma",
};

/** Sentence-cases anything without an explicit override. */
function displayName(term: string): string {
  const override = DISPLAY_NAME[term.toLowerCase()];
  if (override) return override;
  // A term the candidate typed keeps their casing.
  if (term !== term.toLowerCase()) return term;
  return term.charAt(0).toUpperCase() + term.slice(1);
}

const REQUIRED_HEADINGS =
  /^\s*(?:what\s+we(?:'|’)?re\s+looking\s+for|requirements?|required|must[- ]haves?|qualifications?|you\s+(?:will\s+)?(?:have|bring)|minimum\s+qualifications?|basic\s+qualifications?|who\s+you\s+are)\b/i;

const PREFERRED_HEADINGS =
  /^\s*(?:preferred|nice\s+to\s+have|bonus|plus(?:es)?|desirable|preferred\s+qualifications?|great\s+to\s+have|even\s+better)\b/i;

const OTHER_HEADINGS =
  /^\s*(?:responsibilities|what\s+you\s+(?:will\s+)?(?:do|will\s+be\s+doing)|about\s+(?:us|the\s+role|the\s+team)|benefits?|perks?|compensation|the\s+role|overview|what\s+you(?:'|’)?ll\s+do)\b/i;

type Section = "required" | "preferred" | "other";

/**
 * Splits a posting into required / preferred / other buckets by walking its
 * headings. Postings that use no headings fall entirely into "other", and the
 * caller then treats the whole description as weakly required — which is the
 * honest reading of an unstructured posting.
 */
export function splitSections(description: string): Record<Section, string[]> {
  const out: Record<Section, string[]> = {
    required: [],
    preferred: [],
    other: [],
  };

  let current: Section = "other";

  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.replace(/[:\-–—]\s*$/, "");

    if (PREFERRED_HEADINGS.test(heading)) {
      current = "preferred";
      continue;
    }
    if (REQUIRED_HEADINGS.test(heading)) {
      current = "required";
      continue;
    }
    if (OTHER_HEADINGS.test(heading)) {
      current = "other";
      continue;
    }

    out[current].push(line);
  }

  return out;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/** Word-boundary match that survives punctuation like "Node.js" and "C++". */
function mentions(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#.])`, "i").test(
    haystack,
  );
}

/**
 * Terms a posting asks for, drawn from the lexicon plus anything the candidate
 * already lists — so a skill unique to this candidate is still detected when
 * the posting names it.
 */
export function detectSkills(
  text: string,
  candidateSkills: string[],
): string[] {
  return detectRequirements(text, candidateSkills).map(
    (r) => r.alternatives[0] ?? "",
  );
}

/**
 * One thing a posting asks for. `alternatives` holds the interchangeable ways
 * of satisfying it: "Go, Java, or a similar systems language" is a single
 * requirement with two named options, not two requirements. Treating it as two
 * would report Java as a gap for a Go engineer, which is simply wrong.
 */
export type Requirement = { alternatives: string[] };

/**
 * Lines of the form "X, Y, or Z" — the options are interchangeable.
 * The comma before "or" is optional because both the Oxford comma and its
 * absence are common in postings, and missing that variant silently turns one
 * requirement back into several.
 */
const ALTERNATION =
  /\b([a-z0-9+#.\- ]+(?:,\s*[a-z0-9+#.\- ]+)*?)\s*,?\s*\bor\b\s+([a-z0-9+#.\- ]+)/gi;

function alternationGroups(text: string, known: Set<string>): string[][] {
  const groups: string[][] = [];

  for (const match of text.matchAll(ALTERNATION)) {
    const candidates = [...(match[1] ?? "").split(","), match[2] ?? ""]
      .map((part) => normalize(part))
      .flatMap((part) =>
        // "a similar systems language" is filler, not an option; keep only
        // parts that name something we actually recognise.
        [...known].filter((term) => part === term || mentions(part, term)),
      );

    const unique = [...new Set(candidates)];
    if (unique.length > 1) groups.push(unique);
  }

  return groups;
}

export function detectRequirements(
  text: string,
  candidateSkills: string[],
): Requirement[] {
  const haystack = normalize(text);
  const found = new Map<string, string>();

  for (const term of SKILL_LEXICON) {
    if (mentions(haystack, term)) found.set(term, term);
  }

  for (const skill of candidateSkills) {
    const term = normalize(skill);
    if (term.length >= 2 && mentions(haystack, term)) found.set(term, skill);
  }

  // "postgres" and "postgresql" are the same requirement; keep the longer one.
  const values = [...found.values()];
  const deduped = values
    .filter(
      (value) =>
        !values.some(
          (other) =>
            other !== value &&
            normalize(other).includes(normalize(value)) &&
            normalize(other).length > normalize(value).length,
        ),
    )
    .sort((a, b) => a.localeCompare(b));

  const byNormalized = new Map(deduped.map((v) => [normalize(v), v]));
  const groups = alternationGroups(haystack, new Set(byNormalized.keys()));

  const claimed = new Set<string>();
  const requirements: Requirement[] = [];

  for (const group of groups) {
    const members = group
      .map((term) => byNormalized.get(term))
      .filter((v): v is string => Boolean(v) && !claimed.has(normalize(v!)));
    if (members.length < 2) continue;
    for (const member of members) claimed.add(normalize(member));
    requirements.push({ alternatives: members });
  }

  for (const value of deduped) {
    if (claimed.has(normalize(value))) continue;
    requirements.push({ alternatives: [value] });
  }

  return requirements;
}

/** Free text from the profile that can support an inferred match. */
function inferenceCorpus(candidate: CandidateContext): string {
  return normalize(
    [
      candidate.masterResume,
      candidate.headline ?? "",
      ...candidate.employments.map(
        (e) => `${e.title} ${e.company} ${e.summary}`,
      ),
      ...candidate.educations.map(
        (e) => `${e.credential} ${e.field ?? ""} ${e.notes}`,
      ),
      ...candidate.accomplishments.map(
        (a) =>
          `${a.title} ${a.situation} ${a.task} ${a.action} ${a.result} ${a.skillTags.join(" ")} ${a.categories.join(" ")}`,
      ),
    ].join("\n"),
  );
}

/**
 * Terms that imply one another. A candidate who lists Kafka plainly has event
 * streaming experience; reporting that as "no evidence" is not caution, it is
 * a wrong answer that sends them off to fix a gap they do not have.
 *
 * Implication only ever produces INFERRED, never CONFIRMED — the candidate did
 * not claim the posting's exact term, so they should still check they can
 * defend it in those words.
 */
const IMPLIED_BY: Record<string, string[]> = {
  "event streaming": ["kafka", "kinesis", "rabbitmq", "pubsub", "sqs"],
  "distributed systems": ["kubernetes", "kafka", "microservices", "grpc"],
  microservices: ["grpc", "kubernetes", "distributed systems"],
  "query optimisation": [
    "postgresql",
    "postgres",
    "mysql",
    "sql",
    "performance tuning",
  ],
  "query optimization": [
    "postgresql",
    "postgres",
    "mysql",
    "sql",
    "performance tuning",
  ],
  "performance tuning": [
    "query optimisation",
    "query optimization",
    "observability",
  ],
  "schema design": [
    "postgresql",
    "postgres",
    "mysql",
    "data modelling",
    "data modeling",
  ],
  "api design": ["grpc", "graphql", "rest"],
  "technical leadership": ["mentoring", "architecture", "code review"],
  mentoring: ["technical leadership"],
  "incident response": ["on-call", "sre", "observability"],
  "on-call": ["incident response", "sre"],
  sre: ["incident response", "observability", "on-call"],
  observability: ["prometheus", "grafana", "datadog", "opentelemetry"],
  "platform engineering": ["kubernetes", "terraform", "developer tooling"],
  "developer tooling": ["platform engineering", "ci/cd"],
  "ci/cd": ["github actions", "jenkins", "circleci", "argocd"],
  scalability: ["distributed systems", "performance tuning"],
  reliability: ["incident response", "observability", "sre"],
  sql: ["postgresql", "postgres", "mysql"],
  nosql: ["mongodb", "dynamodb", "cassandra", "redis"],
  payments: ["billing", "ledger", "settlement", "fintech"],
  ledger: ["payments", "settlement"],
  compliance: ["soc 2", "hipaa", "pci", "gdpr", "fedramp"],
  testing: ["unit testing", "integration testing", "property-based testing"],
  golang: ["go"],
  go: ["golang"],
  postgres: ["postgresql"],
  postgresql: ["postgres"],
};

/**
 * Where the evidence for a skill sits.
 *
 * CONFIRMED means the candidate listed it as a skill outright. INFERRED means
 * it appears somewhere in their written record but they did not claim it as a
 * skill. MISSING means nothing supports it. Keeping these apart is the whole
 * point — it is what lets the UI tell you which claims you can defend.
 */
export function classifyEvidence(
  skill: string,
  candidate: CandidateContext,
  corpus: string,
): EvidenceLevel {
  const term = normalize(skill);

  const declaredNames = candidate.skills.map((s) => normalize(s.name));

  const declared = declaredNames.some(
    (name) => name === term || mentions(name, term) || mentions(term, name),
  );
  if (declared) return "CONFIRMED";

  if (mentions(corpus, term)) return "INFERRED";

  // Nothing names the term directly — but a declared skill may imply it.
  const implications = IMPLIED_BY[term] ?? [];
  const impliedByDeclared = implications.some((related) =>
    declaredNames.some((name) => name === related || mentions(name, related)),
  );
  if (impliedByDeclared) return "INFERRED";

  // Or the wider history may. Weaker, but still not "no evidence".
  if (implications.some((related) => mentions(corpus, related)))
    return "INFERRED";

  return "MISSING";
}

function evidenceNote(
  skill: string,
  evidence: EvidenceLevel,
  candidate: CandidateContext,
): string {
  if (evidence === "CONFIRMED") {
    const match = candidate.skills.find(
      (s) => normalize(s.name) === normalize(skill),
    );
    if (match?.yearsExperience) {
      return `Listed in your skills at ${match.level.toLowerCase()} level, ${match.yearsExperience} years.`;
    }
    return "Listed in your skills.";
  }
  if (evidence === "INFERRED") {
    const term = normalize(skill);
    const related = (IMPLIED_BY[term] ?? []).find((r) =>
      candidate.skills.some((s) => mentions(normalize(s.name), r)),
    );
    if (related) {
      return `Not listed by name, but implied by your ${displayName(related)} experience. Check you would describe it this way yourself.`;
    }
    return "Appears in your history but is not one of your listed skills. Add it if you can defend it.";
  }
  return "Nothing in your profile mentions this.";
}

const EVIDENCE_STRENGTH: Record<EvidenceLevel, number> = {
  CONFIRMED: 2,
  INFERRED: 1,
  MISSING: 0,
};

/**
 * Resolves each requirement to one finding. For an alternation the strongest
 * evidence wins, because satisfying any one option satisfies the requirement.
 */
function toFindings(
  requirements: Requirement[],
  candidate: CandidateContext,
  corpus: string,
): SkillFinding[] {
  return requirements.map((requirement) => {
    const graded = requirement.alternatives.map((name) => ({
      name,
      evidence: classifyEvidence(name, candidate, corpus),
    }));

    const best = graded.reduce((a, b) =>
      EVIDENCE_STRENGTH[b.evidence] > EVIDENCE_STRENGTH[a.evidence] ? b : a,
    );

    const label =
      requirement.alternatives.length > 1
        ? requirement.alternatives.map(displayName).join(" or ")
        : displayName(best.name);

    const note =
      requirement.alternatives.length > 1 && best.evidence !== "MISSING"
        ? `Satisfied by ${displayName(best.name)}. ${evidenceNote(best.name, best.evidence, candidate)}`
        : evidenceNote(best.name, best.evidence, candidate);

    return { name: label, evidence: best.evidence, note };
  });
}

/** Highest "N+ years" figure a posting asks for. */
export function requiredYears(text: string): number | null {
  const matches = [
    ...text.matchAll(/(\d{1,2})\s*\+?\s*(?:or\s+more\s+)?years?/gi),
  ];
  const years = matches
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 40);
  return years.length ? Math.max(...years) : null;
}

/** Approximate total professional experience from employment dates. */
export function totalExperienceYears(candidate: CandidateContext): number {
  if (candidate.employments.length === 0) return 0;

  const spans = candidate.employments
    .map((e) => {
      const start = Date.parse(e.startDate);
      const end =
        e.isCurrent || !e.endDate ? Date.now() : Date.parse(e.endDate);
      return Number.isNaN(start) || Number.isNaN(end)
        ? null
        : { start, end: Math.max(start, end) };
    })
    .filter((s): s is { start: number; end: number } => s !== null)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping roles so concurrent positions are not double-counted.
  let total = 0;
  let cursorStart = 0;
  let cursorEnd = 0;

  for (const span of spans) {
    if (cursorEnd === 0) {
      cursorStart = span.start;
      cursorEnd = span.end;
      continue;
    }
    if (span.start <= cursorEnd) {
      cursorEnd = Math.max(cursorEnd, span.end);
    } else {
      total += cursorEnd - cursorStart;
      cursorStart = span.start;
      cursorEnd = span.end;
    }
  }
  total += cursorEnd - cursorStart;

  return Math.round((total / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

const SENIORITY_RANK: Array<[RegExp, number]> = [
  [/\b(intern|junior|entry[- ]level|associate)\b/i, 1],
  // An unqualified "Engineer" is a mid-level title. Reading it as "unknown"
  // would let a plain engineering role score as a lateral move for someone
  // whose profile is senior or above, which is exactly the judgement call the
  // score exists to make.
  [/\b(engineer|developer|programmer)\b/i, 2],
  [/\b(mid[- ]level|intermediate)\b/i, 2],
  [/\bsenior\b/i, 3],
  [/\b(staff|lead|principal engineer)\b/i, 4],
  [/\b(principal|architect|director|head of|vp)\b/i, 5],
];

export function seniorityRank(title: string): number | null {
  for (const [pattern, rank] of [...SENIORITY_RANK].reverse()) {
    if (pattern.test(title)) return rank;
  }
  return null;
}

function locationFit(candidate: CandidateContext, job: JobContext): number {
  const jobMode = job.workMode;
  const wanted = candidate.workMode;

  // Location is only a real constraint when both sides state something.
  if (!jobMode) return 0.75;
  if (wanted === "FLEXIBLE" || jobMode === wanted) return 1;
  if (jobMode === "HYBRID" && wanted === "ONSITE") return 0.8;
  if (jobMode === "HYBRID" && wanted === "REMOTE") return 0.45;
  if (jobMode === "ONSITE" && wanted === "REMOTE") return 0.15;
  if (jobMode === "REMOTE" && wanted === "ONSITE") return 0.6;

  const place = normalize(job.location ?? "");
  if (
    place &&
    candidate.preferredLocations.some((loc) => mentions(place, normalize(loc)))
  ) {
    return 0.9;
  }

  return 0.5;
}

function salaryFit(candidate: CandidateContext, job: JobContext): number {
  const wantMin = candidate.desiredSalaryMin;
  const offerMax = job.salaryMax ?? job.salaryMin;
  const offerMin = job.salaryMin ?? job.salaryMax;

  // No stated figure on either side is not a negative signal.
  if (wantMin === null || offerMax === null || offerMin === null) return 0.75;

  // Compare against the midpoint, not the ceiling: offers rarely land at the
  // top of a posted band, so "the maximum clears your minimum" flatters a
  // range whose realistic outcome does not.
  const realistic = (offerMin + offerMax) / 2;
  if (realistic >= wantMin) return 1;
  if (offerMax >= wantMin) return 0.8; // reachable, but only at the top

  const shortfall = (wantMin - offerMax) / wantMin;
  if (shortfall <= 0.05) return 0.85;
  if (shortfall <= 0.15) return 0.6;
  if (shortfall <= 0.3) return 0.3;
  return 0.1;
}

export type ScoreBreakdown = {
  requiredCoverage: number;
  preferredCoverage: number;
  seniority: number;
  location: number;
  salary: number;
  experience: number;
};

/**
 * Weights are fixed and public. Required-skill coverage dominates because it
 * is what actually gets a resume past a screen; the rest adjusts around it.
 */
export const SCORE_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  requiredCoverage: 0.42,
  preferredCoverage: 0.1,
  experience: 0.16,
  seniority: 0.1,
  // Slightly above the other adjustments: a role that is on-site when you need
  // remote is a reason not to apply, not a rounding error.
  location: 0.12,
  salary: 0.1,
};

/**
 * Neutral prior for coverage, and how many phantom requirements it is worth.
 *
 * Raw coverage is unreliable on a short list: a posting that names two skills
 * you happen to have would otherwise score the same as one that names ten. The
 * prior pulls small samples toward the middle and washes out as the posting
 * gets more specific, so "matched everything it asked for" only becomes a high
 * score when it actually asked for something.
 */
const COVERAGE_PRIOR = 0.55;
const COVERAGE_PRIOR_WEIGHT = 2;

export function coverage(findings: SkillFinding[]): number {
  const points = findings.reduce((sum, f) => {
    if (f.evidence === "CONFIRMED") return sum + 1;
    if (f.evidence === "INFERRED") return sum + 0.5;
    return sum;
  }, 0);

  return (
    (points + COVERAGE_PRIOR * COVERAGE_PRIOR_WEIGHT) /
    (findings.length + COVERAGE_PRIOR_WEIGHT)
  );
}

export function computeScore(breakdown: ScoreBreakdown): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[]).reduce(
    (sum, key) => sum + breakdown[key] * SCORE_WEIGHTS[key],
    0,
  );
  return Math.max(0, Math.min(100, Math.round(total * 100)));
}

export function priorityForScore(
  score: number,
  daysToDeadline: number | null,
): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  if (daysToDeadline !== null && daysToDeadline <= 3 && score >= 60) {
    return "URGENT";
  }
  if (score >= 80) return "HIGH";
  if (score >= 65) return "MEDIUM";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

export type HeuristicAnalysis = {
  fitScore: number;
  recommendedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  explanation: string;
  requiredSkills: SkillFinding[];
  preferredSkills: SkillFinding[];
  matchedSkills: SkillFinding[];
  missingQualifications: Gap[];
  strengths: string[];
  concerns: string[];
  breakdown: ScoreBreakdown;
};

export function analyzeHeuristically(
  candidate: CandidateContext,
  job: JobContext,
): HeuristicAnalysis {
  const sections = splitSections(job.description);
  const corpus = inferenceCorpus(candidate);
  const candidateSkillNames = candidate.skills.map((s) => s.name);

  const requiredText = sections.required.join("\n");
  const preferredText = sections.preferred.join("\n");

  // Unstructured postings still deserve an analysis: treat the whole body as
  // the requirement text rather than reporting "nothing required".
  const effectiveRequired = requiredText.trim()
    ? requiredText
    : [sections.other.join("\n"), job.title].join("\n");

  const requiredReqs = detectRequirements(
    effectiveRequired,
    candidateSkillNames,
  );
  const requiredNames = requiredReqs.flatMap((r) => r.alternatives);

  const preferredReqs = detectRequirements(
    preferredText,
    candidateSkillNames,
  ).filter((r) => !r.alternatives.some((name) => requiredNames.includes(name)));
  const preferredNames = preferredReqs.flatMap((r) => r.alternatives);

  const requiredSkills = toFindings(requiredReqs, candidate, corpus);
  const preferredSkills = toFindings(preferredReqs, candidate, corpus);

  const matchedSkills = [...requiredSkills, ...preferredSkills].filter(
    (f) => f.evidence !== "MISSING",
  );

  const askedYears = requiredYears(effectiveRequired);
  const haveYears = totalExperienceYears(candidate);

  const experienceFit =
    askedYears === null
      ? 0.8
      : haveYears >= askedYears
        ? 1
        : Math.max(0.1, haveYears / askedYears);

  const jobRank = seniorityRank(job.title);
  const candidateRank =
    candidate.targetRoles
      .map(seniorityRank)
      .filter((r): r is number => r !== null)
      .sort((a, b) => b - a)[0] ??
    candidate.employments
      .map((e) => seniorityRank(e.title))
      .find((r) => r !== null) ??
    null;

  const seniorityFit =
    jobRank === null || candidateRank === null
      ? 0.8
      : jobRank === candidateRank
        ? 1
        : jobRank === candidateRank + 1
          ? 0.75 // a reach, but a reasonable one
          : jobRank > candidateRank
            ? 0.4
            : 0.65; // a step down is a fit question, not a skills question

  const breakdown: ScoreBreakdown = {
    requiredCoverage: coverage(requiredSkills),
    preferredCoverage: coverage(preferredSkills),
    experience: experienceFit,
    seniority: seniorityFit,
    location: locationFit(candidate, job),
    salary: salaryFit(candidate, job),
  };

  const fitScore = computeScore(breakdown);

  // ------------------------------------------------------------- narrative

  const missingRequired = requiredSkills.filter(
    (f) => f.evidence === "MISSING",
  );
  const inferredRequired = requiredSkills.filter(
    (f) => f.evidence === "INFERRED",
  );
  const confirmedRequired = requiredSkills.filter(
    (f) => f.evidence === "CONFIRMED",
  );

  const missingQualifications: Gap[] = [
    ...missingRequired.map<Gap>((f) => ({
      item: f.name,
      severity: "MAJOR" as const,
      note: "Listed as required and nothing in your profile mentions it.",
    })),
    ...inferredRequired.map<Gap>((f) => ({
      item: f.name,
      severity: "MINOR" as const,
      note: "Implied by your history but not listed as a skill. Add it or be ready to evidence it.",
    })),
    ...preferredSkills
      .filter((f) => f.evidence === "MISSING")
      .map<Gap>((f) => ({
        item: f.name,
        severity: "MINOR" as const,
        note: "Preferred rather than required — worth naming if you have adjacent experience.",
      })),
  ];

  if (askedYears !== null && haveYears < askedYears) {
    missingQualifications.unshift({
      item: `${askedYears} years of experience`,
      severity: askedYears - haveYears > 3 ? "MAJOR" : "MODERATE",
      note: `Your recorded history covers about ${haveYears} years.`,
    });
  }

  const strengths: string[] = [];

  if (confirmedRequired.length > 0) {
    strengths.push(
      `You list ${confirmedRequired.length} of the ${requiredSkills.length} required skills outright: ${confirmedRequired
        .slice(0, 6)
        .map((f) => f.name)
        .join(", ")}.`,
    );
  }

  const relevantAccomplishments = rankAccomplishments(
    candidate,
    [...requiredNames, ...preferredNames],
    3,
  );
  for (const item of relevantAccomplishments) {
    strengths.push(
      item.metric
        ? `"${item.title}" gives you a concrete number to lead with (${item.metric}).`
        : `"${item.title}" is directly relevant to what this posting asks for.`,
    );
  }

  if (breakdown.salary === 1 && job.salaryText) {
    strengths.push(`The posted range (${job.salaryText}) clears your minimum.`);
  }

  if (strengths.length === 0) {
    strengths.push(
      "Nothing in your profile lines up with this posting yet — that is a profile gap as much as a fit problem.",
    );
  }

  const concerns: string[] = [];

  if (missingRequired.length > 0) {
    concerns.push(
      `${missingRequired.length} required item${missingRequired.length === 1 ? " has" : "s have"} no supporting evidence: ${missingRequired
        .slice(0, 5)
        .map((f) => f.name)
        .join(", ")}.`,
    );
  }
  if (askedYears !== null && haveYears < askedYears) {
    concerns.push(
      `The posting asks for ${askedYears} years; your recorded history covers about ${haveYears}.`,
    );
  }
  if (breakdown.location < 0.5) {
    concerns.push(
      `Work mode is a real mismatch: the role is ${(job.workMode ?? "unspecified").toLowerCase()} and you want ${candidate.workMode.toLowerCase()}.`,
    );
  }
  if (breakdown.salary < 0.6) {
    concerns.push(
      "The posted range sits below the minimum on your profile. Worth resolving before investing time.",
    );
  }
  if (
    jobRank !== null &&
    candidateRank !== null &&
    jobRank > candidateRank + 1
  ) {
    concerns.push(
      "This is more than one level above the seniority your profile shows.",
    );
  }
  if (candidate.accomplishments.length < 3) {
    concerns.push(
      "Your accomplishment bank is thin, which limits how specific any generated material can be.",
    );
  }

  const explanation = buildExplanation(fitScore, breakdown, {
    requiredCount: requiredSkills.length,
    confirmedCount: confirmedRequired.length,
    inferredCount: inferredRequired.length,
    missingCount: missingRequired.length,
  });

  return {
    fitScore,
    recommendedPriority: priorityForScore(fitScore, null),
    explanation,
    requiredSkills,
    preferredSkills,
    matchedSkills,
    missingQualifications: missingQualifications.slice(0, 30),
    strengths: strengths.slice(0, 10),
    concerns: concerns.slice(0, 10),
    breakdown,
  };
}

function buildExplanation(
  score: number,
  breakdown: ScoreBreakdown,
  counts: {
    requiredCount: number;
    confirmedCount: number;
    inferredCount: number;
    missingCount: number;
  },
): string {
  const parts: string[] = [];

  parts.push(
    counts.requiredCount === 0
      ? `Scored ${score}. The posting does not spell out its requirements, so this leans on the description as a whole.`
      : `Scored ${score}, driven mainly by required-skill coverage: ${counts.confirmedCount} of ${counts.requiredCount} confirmed, ${counts.inferredCount} inferred, ${counts.missingCount} with no evidence.`,
  );

  // When required coverage is itself the problem, the counts above already say
  // so; naming a secondary weak factor on top of that just buries the lede.
  const weakest =
    breakdown.requiredCoverage < 0.6
      ? undefined
      : (Object.keys(breakdown) as (keyof ScoreBreakdown)[])
          .filter((k) => k !== "requiredCoverage")
          .sort((a, b) => breakdown[a] - breakdown[b])[0];

  const weakestLabel: Record<keyof ScoreBreakdown, string> = {
    requiredCoverage: "required skills",
    preferredCoverage: "preferred skills",
    experience: "years of experience",
    seniority: "seniority level",
    location: "work mode and location",
    salary: "salary alignment",
  };

  if (weakest && breakdown[weakest] < 0.7) {
    parts.push(
      `The weakest factor is ${weakestLabel[weakest]}. That is the thing to address or to accept before applying.`,
    );
  }

  parts.push(
    "Confirmed items are stated in your profile; inferred items appear in your history but are not claimed as skills — check those before repeating them in an interview.",
  );

  return parts.join(" ");
}

/**
 * Picks the accomplishments most relevant to a set of skill terms. Used both
 * for the analysis narrative and to choose what generated material may quote.
 */
export function rankAccomplishments(
  candidate: CandidateContext,
  terms: string[],
  limit: number,
): CandidateContext["accomplishments"] {
  const normalizedTerms = terms.map(normalize).filter(Boolean);

  const scored = candidate.accomplishments.map((item) => {
    const text = normalize(
      [
        item.title,
        item.situation,
        item.task,
        item.action,
        item.result,
        item.skillTags.join(" "),
        item.categories.join(" "),
      ].join(" "),
    );

    let score = 0;
    for (const term of normalizedTerms) {
      if (item.skillTags.some((tag) => normalize(tag) === term)) score += 3;
      else if (mentions(text, term)) score += 1;
    }

    // A defensible number is worth something on its own.
    if (item.metric) score += 0.5;

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
