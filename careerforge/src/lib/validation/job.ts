import { z } from "zod";

import { cleanText } from "./profile";

export const jobStatusSchema = z.enum([
  "DISCOVERED",
  "EVALUATING",
  "PREPARING",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "ARCHIVED",
]);

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const optionalWorkMode = z
  .string()
  .trim()
  .transform((v) => (v === "" || v === "unspecified" ? null : v))
  .refine(
    (v) => v === null || ["REMOTE", "HYBRID", "ONSITE", "FLEXIBLE"].includes(v),
    "Pick a valid work mode",
  )
  .transform((v) => v as "REMOTE" | "HYBRID" | "ONSITE" | "FLEXIBLE" | null);

/**
 * A posting URL is rendered as a link, so the scheme matters: `javascript:` and
 * `data:` are rejected here rather than sanitised at every render site.
 */
const postingUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v),
    "Enter a full URL starting with http:// or https://",
  )
  .transform((v) => (v === "" ? null : v));

const optionalMoney = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)])
  .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .transform((v) => (v === "" ? null : new Date(v)));

export const jobSchema = z.object({
  title: cleanText(200).pipe(z.string().min(1, "Job title is required")),
  company: cleanText(160).pipe(z.string().min(1, "Company is required")),
  url: postingUrl,
  location: cleanText(160),
  workMode: optionalWorkMode,
  salaryText: cleanText(120),
  salaryMin: optionalMoney,
  salaryMax: optionalMoney,
  // Postings run long; 60k characters is roughly twenty pages, which is more
  // than any real listing and still bounded.
  description: cleanText(60_000),
  source: cleanText(120),
  status: jobStatusSchema,
  priority: prioritySchema,
  deadline: optionalDate,
  notes: cleanText(8000),
});

export const jobStatusUpdateSchema = z.object({
  jobId: z.string().min(1),
  status: jobStatusSchema,
});

export const jobNotesSchema = z.object({
  jobId: z.string().min(1),
  notes: cleanText(8000),
});

export const followUpSchema = z.object({
  id: z.string().min(1).optional(),
  jobId: z.string().min(1),
  dueAt: z
    .string()
    .trim()
    .min(1, "Pick a date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .transform((v) => new Date(v)),
  channel: z.enum(["EMAIL", "LINKEDIN", "PHONE", "PORTAL", "OTHER"]),
  note: cleanText(1000),
});

export type JobInput = z.infer<typeof jobSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
