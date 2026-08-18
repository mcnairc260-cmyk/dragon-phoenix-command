import type {
  JobStatus,
  MaterialKind,
  Priority,
  WorkMode,
} from "@prisma/client";

/** Pipeline order. Everything that sorts, groups, or advances status uses this. */
export const JOB_STATUS_ORDER: JobStatus[] = [
  "DISCOVERED",
  "EVALUATING",
  "PREPARING",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "ARCHIVED",
];

/** Columns shown on the kanban board. Rejected/archived live in the table view. */
export const KANBAN_STATUSES: JobStatus[] = [
  "DISCOVERED",
  "EVALUATING",
  "PREPARING",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
];

/** Statuses that mean "this opportunity is still live". */
export const ACTIVE_STATUSES: JobStatus[] = [
  "DISCOVERED",
  "EVALUATING",
  "PREPARING",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
];

/** Statuses that count as "an application was actually submitted". */
export const SUBMITTED_STATUSES: JobStatus[] = [
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  DISCOVERED: "Discovered",
  EVALUATING: "Evaluating",
  PREPARING: "Preparing",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export type Tone =
  "neutral" | "accent" | "positive" | "caution" | "critical" | "info";

export const JOB_STATUS_TONE: Record<JobStatus, Tone> = {
  DISCOVERED: "neutral",
  EVALUATING: "info",
  PREPARING: "accent",
  APPLIED: "accent",
  INTERVIEWING: "positive",
  OFFER: "positive",
  REJECTED: "critical",
  ARCHIVED: "neutral",
};

export const PRIORITY_ORDER: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "accent",
  URGENT: "critical",
};

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
  FLEXIBLE: "Flexible",
};

export const MATERIAL_KINDS: MaterialKind[] = [
  "SUMMARY",
  "RESUME_BULLETS",
  "COVER_LETTER",
  "RECRUITER_OUTREACH",
  "HIRING_MANAGER_OUTREACH",
  "INTERVIEW_QUESTIONS",
  "STAR_PROMPTS",
  "COMPANY_RESEARCH",
];

export const MATERIAL_LABEL: Record<MaterialKind, string> = {
  SUMMARY: "Tailored summary",
  RESUME_BULLETS: "Resume bullets",
  COVER_LETTER: "Cover letter",
  RECRUITER_OUTREACH: "Recruiter outreach",
  HIRING_MANAGER_OUTREACH: "Hiring-manager outreach",
  INTERVIEW_QUESTIONS: "Interview questions",
  STAR_PROMPTS: "STAR prep prompts",
  COMPANY_RESEARCH: "Company research",
};

export const MATERIAL_DESCRIPTION: Record<MaterialKind, string> = {
  SUMMARY: "A three-sentence professional summary aimed at this specific role.",
  RESUME_BULLETS:
    "Rewrites of your accomplishments in this posting's language.",
  COVER_LETTER: "A short, specific letter you can send with minimal editing.",
  RECRUITER_OUTREACH: "A brief message for the recruiter or talent partner.",
  HIRING_MANAGER_OUTREACH: "A direct note to the person who owns the role.",
  INTERVIEW_QUESTIONS: "Questions this posting makes likely, worth rehearsing.",
  STAR_PROMPTS:
    "Situation/Task/Action/Result prompts drawn from your own record.",
  COMPANY_RESEARCH: "What to find out before you talk to anyone.",
};

/** Estimated-minutes options offered by focus mode. */
export const FOCUS_DURATIONS = [5, 15, 30, 60] as const;
export type FocusDuration = (typeof FOCUS_DURATIONS)[number];

/** Fit-score bands. Deliberately coarse — a 71 and a 74 are the same decision. */
export function fitBand(score: number): {
  label: string;
  tone: Tone;
} {
  if (score >= 80) return { label: "Strong fit", tone: "positive" };
  if (score >= 65) return { label: "Good fit", tone: "accent" };
  if (score >= 50) return { label: "Partial fit", tone: "caution" };
  return { label: "Weak fit", tone: "critical" };
}
