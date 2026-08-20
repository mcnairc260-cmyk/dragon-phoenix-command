import type { MaterialKind } from "@prisma/client";

import { rankAccomplishments } from "./heuristics";
import type { AnalysisResult } from "./schemas";
import type { CandidateContext, JobContext } from "./types";

/**
 * Deterministic drafts assembled from the candidate's own record.
 *
 * Every sentence here either comes from a fixed template or quotes a field the
 * user entered. No employer, date, metric, certification, or skill is
 * introduced that is not already in `candidate`. That is enforced structurally
 * — these functions have no source of facts other than their arguments.
 */

type Ctx = {
  candidate: CandidateContext;
  job: JobContext;
  analysis: AnalysisResult | null;
};

function confirmedSkillsFor(ctx: Ctx, limit: number): string[] {
  const fromAnalysis = (ctx.analysis?.matchedSkills ?? [])
    .filter((s) => s.evidence === "CONFIRMED")
    .map((s) => s.name);

  if (fromAnalysis.length > 0) return fromAnalysis.slice(0, limit);

  // Without an analysis, fall back to the candidate's strongest declared
  // skills rather than guessing what the posting wants.
  return ctx.candidate.skills
    .filter((s) => s.level === "EXPERT" || s.level === "ADVANCED")
    .slice(0, limit)
    .map((s) => s.name);
}

function targetTerms(ctx: Ctx): string[] {
  return [
    ...(ctx.analysis?.requiredSkills ?? []).map((s) => s.name),
    ...(ctx.analysis?.preferredSkills ?? []).map((s) => s.name),
  ];
}

function relevant(ctx: Ctx, limit: number) {
  const terms = targetTerms(ctx);
  const ranked = rankAccomplishments(ctx.candidate, terms, limit);
  // With no analysis and no term overlap, most-recent is a better default
  // than nothing at all.
  return ranked.length > 0
    ? ranked
    : ctx.candidate.accomplishments.slice(0, limit);
}

function currentRole(ctx: Ctx) {
  return (
    ctx.candidate.employments.find((e) => e.isCurrent) ??
    ctx.candidate.employments[0] ??
    null
  );
}

/** "over eight years" style phrasing, or nothing when the profile is silent. */
function yearsPhrase(ctx: Ctx): string {
  const top = [...ctx.candidate.skills]
    .filter((s) => s.yearsExperience !== null)
    .sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0))[0];
  return top?.yearsExperience
    ? ` over roughly ${top.yearsExperience} years`
    : "";
}

/**
 * Joins a template sentence to user-entered text without doubling the
 * punctuation. The profile fields are written by a human who may or may not
 * have ended a sentence, and "design..".  reads like a bug because it is one.
 */
function sentence(...parts: (string | null | undefined)[]): string {
  const body = parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .map((part) => part.replace(/[.!?]+$/, ""))
    .join(". ");
  return body ? `${body}.` : "";
}

function signature(ctx: Ctx): string {
  const lines = [ctx.candidate.fullName];
  if (ctx.candidate.email) lines.push(ctx.candidate.email);
  if (ctx.candidate.phone) lines.push(ctx.candidate.phone);
  for (const link of ctx.candidate.links)
    lines.push(`${link.label}: ${link.url}`);
  return lines.join("\n");
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

function summary(ctx: Ctx): string {
  const role = currentRole(ctx);
  const skills = confirmedSkillsFor(ctx, 4);
  const best = relevant(ctx, 1)[0];

  const opener = role
    ? `${ctx.candidate.headline ?? `${role.title} at ${role.company}`}.`
    : `${ctx.candidate.headline ?? ctx.candidate.fullName}.`;

  const skillLine = skills.length
    ? ` Strongest on ${skills.slice(0, -1).join(", ")}${skills.length > 1 ? ` and ${skills[skills.length - 1]}` : skills[0]}.`
    : "";

  const proofLine = best
    ? ` Most recently: ${(best.result || best.title).replace(/[.!?]+$/, "")}${best.metric ? ` (${best.metric})` : ""}.`
    : "";

  const fitLine = ` Applying to ${ctx.job.title} at ${ctx.job.company}.`;

  return `${opener}${skillLine}${proofLine}${fitLine}`;
}

function resumeBullets(ctx: Ctx): string {
  const items = relevant(ctx, 5);

  if (items.length === 0) {
    return "No accomplishments in your bank yet, so there is nothing to rewrite. Add three to the accomplishment bank and regenerate — every bullet here is a rewrite of something you entered, never an invention.";
  }

  const lines = items.map((item) => {
    const action = (item.action || item.task || item.title).replace(
      /[.!?]+$/,
      "",
    );
    const result = item.result
      ? ` — ${item.result.replace(/[.!?]+$/, "")}`
      : "";
    const metric = item.metric ? ` (${item.metric})` : "";
    return `${action}${result}${metric}`;
  });

  return [
    `Rewrites of your own accomplishments, ordered by relevance to ${ctx.job.title}:`,
    "",
    bullets(lines),
    "",
    "Each line above is drawn from your accomplishment bank. Edit the wording freely — but if you change a number, change it in the bank too so the next draft stays true.",
  ].join("\n");
}

function coverLetter(ctx: Ctx): string {
  const items = relevant(ctx, 2);
  const skills = confirmedSkillsFor(ctx, 3);
  const role = currentRole(ctx);

  const body: string[] = [];

  body.push(`Dear ${ctx.job.company} hiring team,`);
  body.push("");
  body.push(
    role
      ? sentence(
          `I am writing about the ${ctx.job.title} role`,
          `I am currently ${role.title} at ${role.company}`,
          role.summary || "where I own a production service end to end",
        )
      : sentence(
          `I am writing about the ${ctx.job.title} role`,
          `${ctx.candidate.headline ?? "My background"} is what brings me to this posting`,
        ),
  );
  body.push("");

  if (skills.length > 0) {
    body.push(
      sentence(
        `The posting leans on ${skills.join(", ")}, which is where my work has concentrated${yearsPhrase(ctx)}`,
      ),
    );
    body.push("");
  }

  for (const item of items) {
    body.push(
      sentence(
        item.situation || item.title,
        item.action || item.task,
        item.result
          ? `The result: ${item.result}${item.metric ? ` (${item.metric})` : ""}`
          : null,
      ),
    );
    body.push("");
  }

  const gaps = (ctx.analysis?.missingQualifications ?? []).filter(
    (g) => g.severity === "MAJOR",
  );
  if (gaps.length > 0) {
    body.push(
      `I will be straight about one thing: the posting asks for ${gaps
        .slice(0, 2)
        .map((g) => g.item)
        .join(
          " and ",
        )}, which my record does not cover directly. I would rather say so than imply otherwise.`,
    );
    body.push("");
  }

  body.push(
    `I would welcome a conversation about whether this is the right fit.`,
  );
  body.push("");
  body.push("Best regards,");
  body.push(signature(ctx));

  return body.join("\n");
}

function recruiterOutreach(ctx: Ctx): string {
  const skills = confirmedSkillsFor(ctx, 3);
  const best = relevant(ctx, 1)[0];

  return [
    `Subject: ${ctx.job.title} — ${ctx.candidate.fullName}`,
    "",
    `Hi,`,
    "",
    `I applied for the ${ctx.job.title} role at ${ctx.job.company} and wanted to put a name to the application.`,
    "",
    skills.length
      ? `Short version: ${ctx.candidate.headline ?? "my background"}, with ${skills.join(", ")} at the centre of it.${
          best
            ? ` Most relevant recent work: ${best.title}${best.metric ? ` (${best.metric})` : ""}.`
            : ""
        }`
      : `Short version: ${ctx.candidate.headline ?? "my background"} lines up with what the posting describes.`,
    "",
    `Happy to send anything that would help, or to answer questions by email if that is easier than a call.`,
    "",
    "Thanks,",
    signature(ctx),
  ].join("\n");
}

function hiringManagerOutreach(ctx: Ctx): string {
  const items = relevant(ctx, 1);
  const best = items[0];

  return [
    `Subject: ${ctx.job.title} — a note from an applicant`,
    "",
    `Hi,`,
    "",
    `I applied for the ${ctx.job.title} role on your team. Rather than repeat the resume, one thing that seemed relevant:`,
    "",
    best
      ? sentence(
          best.situation || best.title,
          best.action,
          best.result
            ? `${best.result}${best.metric ? ` (${best.metric})` : ""}`
            : null,
        )
      : sentence(
          `${ctx.candidate.headline ?? "My background"} is closest to what the posting describes; the specifics are in the resume`,
        ),
    "",
    `If the problem behind this role is something different from what the posting says, I would genuinely like to know — it changes whether I am the right person for it.`,
    "",
    "Best,",
    signature(ctx),
  ].join("\n");
}

function interviewQuestions(ctx: Ctx): string {
  const required = (ctx.analysis?.requiredSkills ?? []).slice(0, 5);
  const gaps = (ctx.analysis?.missingQualifications ?? []).slice(0, 3);

  const technical = required.length
    ? required.map(
        (skill) =>
          `Walk me through a time ${skill.name} was the hard part of a problem you owned.`,
      )
    : [
        `Walk me through a system you owned end to end.`,
        `What is the hardest technical decision you have had to defend?`,
      ];

  const gapQuestions = gaps.map(
    (gap) =>
      `We rely heavily on ${gap.item}. How would you get up to speed?` +
      ` (Your profile has no direct evidence here — prepare an honest answer, not a bluff.)`,
  );

  const behavioural = [
    `Tell me about a time you were wrong about a technical decision.`,
    `How do you decide what not to work on?`,
    `Describe a time you had to deliver something you disagreed with.`,
    `What does a good week look like for you?`,
  ];

  const yours = [
    `What does the first ninety days look like for whoever takes this role?`,
    `What is the thing about this team that people only find out after joining?`,
    `How does this team decide something is done?`,
    `What would make you glad you hired for this role a year from now?`,
  ];

  return [
    `## Likely questions — ${ctx.job.title} at ${ctx.job.company}`,
    "",
    "### Technical, from the posting",
    bullets(technical),
    "",
    ...(gapQuestions.length
      ? ["### Where your profile is thin", bullets(gapQuestions), ""]
      : []),
    "### Behavioural",
    bullets(behavioural),
    "",
    "### Questions worth asking them",
    bullets(yours),
  ].join("\n");
}

function starPrompts(ctx: Ctx): string {
  const items = relevant(ctx, 4);

  if (items.length === 0) {
    return [
      "## STAR preparation",
      "",
      "Your accomplishment bank is empty, so there is nothing to build prompts from yet.",
      "",
      "Add three accomplishments — situation, task, action, result — and regenerate. Prompts here are built from your own entries so you rehearse things that actually happened.",
    ].join("\n");
  }

  const blocks = items.map((item) => {
    const lines = [
      `### ${item.title}`,
      "",
      `**Situation.** ${item.situation || "Fill this in — what was going wrong?"}`,
      `**Task.** ${item.task || "Fill this in — what were you responsible for?"}`,
      `**Action.** ${item.action || "Fill this in — what did you actually do?"}`,
      `**Result.** ${item.result || "Fill this in — what changed?"}${item.metric ? ` (${item.metric})` : ""}`,
      "",
      `Rehearse: what would you have done differently, and what did this cost that the summary hides?`,
    ];
    return lines.join("\n");
  });

  return [
    `## STAR preparation — ${ctx.job.title}`,
    "",
    "Built from your accomplishment bank, ordered by relevance to this posting.",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}

function companyResearch(ctx: Ctx): string {
  return [
    `## Research checklist — ${ctx.job.company}`,
    "",
    "### Before you apply",
    bullets([
      `What does ${ctx.job.company} actually sell, and to whom?`,
      `How do they make money, and is that trend up or down?`,
      `Who are their two closest competitors, and what do they do differently?`,
      `Any funding, acquisition, or layoff news in the last twelve months?`,
    ]),
    "",
    "### Before you interview",
    bullets([
      `Who runs the team this role sits in, and what have they written or spoken about?`,
      `What does their engineering blog or changelog say about how they work?`,
      `What do recent reviews say about the specific team, not just the company?`,
      `What is their stated position on ${(ctx.job.workMode ?? "remote").toLowerCase()} work, and does the posting match it?`,
    ]),
    "",
    "### Questions this posting raises",
    bullets([
      ctx.job.salaryText
        ? `The posted range is ${ctx.job.salaryText}. What determines where in it an offer lands?`
        : `No range was posted. Ask for it early.`,
      `Is this role new, or a backfill? If a backfill, why did the last person leave?`,
      `What does on-call look like in practice?`,
    ]),
    "",
    "Record what you find in the notes on this opportunity so the next conversation starts from it.",
  ].join("\n");
}

const BUILDERS: Record<MaterialKind, (ctx: Ctx) => string> = {
  SUMMARY: summary,
  RESUME_BULLETS: resumeBullets,
  COVER_LETTER: coverLetter,
  RECRUITER_OUTREACH: recruiterOutreach,
  HIRING_MANAGER_OUTREACH: hiringManagerOutreach,
  INTERVIEW_QUESTIONS: interviewQuestions,
  STAR_PROMPTS: starPrompts,
  COMPANY_RESEARCH: companyResearch,
};

export function buildMaterial(
  kind: MaterialKind,
  ctx: Ctx,
): { content: string; sourceAccomplishmentIds: string[] } {
  const content = BUILDERS[kind](ctx);

  // Only the kinds that actually quote the bank claim provenance.
  const quotesBank: MaterialKind[] = [
    "SUMMARY",
    "RESUME_BULLETS",
    "COVER_LETTER",
    "RECRUITER_OUTREACH",
    "HIRING_MANAGER_OUTREACH",
    "STAR_PROMPTS",
  ];

  const sourceAccomplishmentIds = quotesBank.includes(kind)
    ? relevant(
        ctx,
        kind === "STAR_PROMPTS" || kind === "RESUME_BULLETS" ? 5 : 2,
      ).map((a) => a.id)
    : [];

  return { content, sourceAccomplishmentIds };
}
