import { z } from "zod";

/**
 * Free-text fields are stored as the user typed them and escaped at render
 * time by React. This strips only control characters, which have no legitimate
 * place in a resume and can corrupt exports and terminal output downstream.
 * Tab, newline, and carriage return are deliberately kept.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const cleanText = (max: number) =>
  z
    .string()
    .max(max, `Keep this under ${max.toLocaleString()} characters`)
    .transform((v) => v.replace(CONTROL_CHARS, ""))
    .transform((v) => v.trim());

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v),
    "Enter a full URL starting with http:// or https://",
  )
  .transform((v) => (v === "" ? null : v));

/** Comma or newline separated list input to a clean, de-duplicated array. */
export const listFromText = (maxItems: number, maxLen = 120) =>
  z
    .string()
    .max(4000)
    .transform((v) =>
      Array.from(
        new Set(
          v
            .split(/[\n,]/)
            .map((s) => s.replace(CONTROL_CHARS, "").trim())
            .filter(Boolean)
            .map((s) => s.slice(0, maxLen)),
        ),
      ).slice(0, maxItems),
    );

export const workModeSchema = z.enum([
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "FLEXIBLE",
]);

/** Empty string means "not stated", which is different from zero. */
const optionalInt = (max: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(0).max(max)])
    .transform((v) => (v === "" ? null : v));

export const profileSchema = z.object({
  fullName: cleanText(120).pipe(z.string().min(1, "Your name is required")),
  headline: cleanText(160),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address",
    }),
  phone: cleanText(40),
  location: cleanText(120),
  linkedIn: optionalUrl,
  portfolio: optionalUrl,
  github: optionalUrl,
  targetRoles: listFromText(15),
  preferredLocations: listFromText(15),
  workMode: workModeSchema,
  desiredSalaryMin: optionalInt(10_000_000),
  desiredSalaryMax: optionalInt(10_000_000),
  salaryCurrency: cleanText(8),
  masterResume: cleanText(60_000),
});

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .transform((v) => (v === "" ? null : new Date(v)));

export const employmentSchema = z
  .object({
    id: z.string().min(1).optional(),
    company: cleanText(160).pipe(z.string().min(1, "Company is required")),
    title: cleanText(160).pipe(z.string().min(1, "Job title is required")),
    location: cleanText(120),
    startDate: isoDate,
    endDate: isoDate,
    isCurrent: z.coerce.boolean(),
    summary: cleanText(4000),
  })
  .refine((v) => v.startDate !== null, {
    message: "Start date is required",
    path: ["startDate"],
  })
  .refine(
    (v) =>
      v.isCurrent ||
      v.endDate === null ||
      v.startDate === null ||
      v.endDate >= v.startDate,
    { message: "End date cannot be before the start date", path: ["endDate"] },
  );

export const educationSchema = z.object({
  id: z.string().min(1).optional(),
  institution: cleanText(160).pipe(
    z.string().min(1, "Institution is required"),
  ),
  credential: cleanText(160).pipe(z.string().min(1, "Credential is required")),
  field: cleanText(160),
  startDate: isoDate,
  endDate: isoDate,
  notes: cleanText(2000),
});

export const skillSchema = z.object({
  id: z.string().min(1).optional(),
  name: cleanText(80).pipe(z.string().min(1, "Skill name is required")),
  category: cleanText(60),
  level: z.enum(["FAMILIAR", "PROFICIENT", "ADVANCED", "EXPERT"]),
  yearsExperience: optionalInt(70),
});

export const accomplishmentSchema = z.object({
  id: z.string().min(1).optional(),
  employmentId: z
    .string()
    .trim()
    .transform((v) => (v === "" || v === "none" ? null : v)),
  title: cleanText(200).pipe(z.string().min(1, "Give this a short title")),
  situation: cleanText(2000),
  task: cleanText(2000),
  action: cleanText(2000),
  result: cleanText(2000),
  metric: cleanText(160),
  skillTags: listFromText(20, 80),
  categories: listFromText(10, 60),
});

export const resumeSchema = z.object({
  id: z.string().min(1).optional(),
  label: cleanText(80).pipe(z.string().min(1, "Give this version a name")),
  content: cleanText(60_000),
  isDefault: z.coerce.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type EmploymentInput = z.infer<typeof employmentSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type AccomplishmentInput = z.infer<typeof accomplishmentSchema>;
export type ResumeInput = z.infer<typeof resumeSchema>;
