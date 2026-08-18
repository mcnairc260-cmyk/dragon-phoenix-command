"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/server/prisma";
import { requireUserOrThrow } from "@/lib/server/session";
import {
  accomplishmentSchema,
  educationSchema,
  employmentSchema,
  profileSchema,
  resumeSchema,
  skillSchema,
} from "@/lib/validation/profile";

import {
  fail,
  formToObject,
  guarded,
  ok,
  parseOrFail,
  type ActionResult,
} from "./result";

/**
 * Every function here starts from the session user and reaches child records
 * through `profileId`, which is itself looked up by `userId`. A forged id in a
 * form body therefore matches nothing rather than someone else's record.
 */
async function currentProfileId(): Promise<string | null> {
  const user = await requireUserOrThrow();
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/** Resolves the caller's profile id, or an error result if none exists yet. */
async function requireProfileId() {
  const id = await currentProfileId();
  if (!id) {
    return {
      ok: false as const,
      result: fail("Create your profile before adding to it."),
    };
  }
  return { ok: true as const, id };
}

function refreshProfile() {
  revalidatePath("/profile");
  revalidatePath("/today");
}

// ------------------------------------------------------------------ profile

export async function saveProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveProfile", async () => {
    const user = await requireUserOrThrow();
    const parsed = parseOrFail(profileSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const d = parsed.data;

    if (
      d.desiredSalaryMin !== null &&
      d.desiredSalaryMax !== null &&
      d.desiredSalaryMin > d.desiredSalaryMax
    ) {
      return fail("Minimum salary cannot exceed the maximum.", {
        desiredSalaryMin: "Minimum cannot exceed the maximum",
      });
    }

    const data = {
      fullName: d.fullName,
      headline: d.headline || null,
      email: d.email || null,
      phone: d.phone || null,
      location: d.location || null,
      linkedIn: d.linkedIn,
      portfolio: d.portfolio,
      github: d.github,
      targetRoles: d.targetRoles,
      preferredLocations: d.preferredLocations,
      workMode: d.workMode,
      desiredSalaryMin: d.desiredSalaryMin,
      desiredSalaryMax: d.desiredSalaryMax,
      salaryCurrency: d.salaryCurrency || "USD",
      masterResume: d.masterResume,
    };

    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    refreshProfile();
    return ok();
  });
}

// --------------------------------------------------------------- employment

export async function saveEmploymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveEmployment", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    const parsed = parseOrFail(employmentSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, startDate, ...rest } = parsed.data;
    if (!startDate) return fail("Start date is required.");

    const data = {
      ...rest,
      startDate,
      location: rest.location || null,
      // A current role has no end date, whatever the form happened to carry.
      endDate: rest.isCurrent ? null : rest.endDate,
    };

    if (id) {
      // updateMany with profileId in the filter is what enforces ownership:
      // a mismatched id updates zero rows instead of someone else's history.
      const { count } = await prisma.employment.updateMany({
        where: { id, profileId: profile.id },
        data,
      });
      if (count === 0) return fail("That role no longer exists.");
    } else {
      await prisma.employment.create({
        data: { ...data, profileId: profile.id },
      });
    }

    refreshProfile();
    return ok();
  });
}

export async function deleteEmploymentAction(
  id: string,
): Promise<ActionResult> {
  return guarded("deleteEmployment", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    await prisma.employment.deleteMany({
      where: { id, profileId: profile.id },
    });
    refreshProfile();
    return ok();
  });
}

// ---------------------------------------------------------------- education

export async function saveEducationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveEducation", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    const parsed = parseOrFail(educationSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, ...rest } = parsed.data;
    const data = { ...rest, field: rest.field || null };

    if (id) {
      const { count } = await prisma.education.updateMany({
        where: { id, profileId: profile.id },
        data,
      });
      if (count === 0) return fail("That entry no longer exists.");
    } else {
      await prisma.education.create({
        data: { ...data, profileId: profile.id },
      });
    }

    refreshProfile();
    return ok();
  });
}

export async function deleteEducationAction(id: string): Promise<ActionResult> {
  return guarded("deleteEducation", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    await prisma.education.deleteMany({ where: { id, profileId: profile.id } });
    refreshProfile();
    return ok();
  });
}

// ------------------------------------------------------------------- skills

export async function saveSkillAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveSkill", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    const parsed = parseOrFail(skillSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, name, ...rest } = parsed.data;
    const normalizedName = name.toLowerCase();

    const data = {
      name,
      normalizedName,
      category: rest.category || null,
      level: rest.level,
      yearsExperience: rest.yearsExperience,
    };

    // The (profileId, normalizedName) unique index is what stops "Go" and "go"
    // becoming two skills that then score separately.
    const clash = await prisma.skill.findFirst({
      where: {
        profileId: profile.id,
        normalizedName,
        NOT: id ? { id } : undefined,
      },
      select: { id: true },
    });
    if (clash) {
      return fail(`You already have "${name}" in your skills.`, {
        name: "Already in your list",
      });
    }

    if (id) {
      const { count } = await prisma.skill.updateMany({
        where: { id, profileId: profile.id },
        data,
      });
      if (count === 0) return fail("That skill no longer exists.");
    } else {
      await prisma.skill.create({ data: { ...data, profileId: profile.id } });
    }

    refreshProfile();
    return ok();
  });
}

export async function deleteSkillAction(id: string): Promise<ActionResult> {
  return guarded("deleteSkill", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    await prisma.skill.deleteMany({ where: { id, profileId: profile.id } });
    refreshProfile();
    return ok();
  });
}

// ---------------------------------------------------------- accomplishments

export async function saveAccomplishmentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveAccomplishment", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    const parsed = parseOrFail(accomplishmentSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, employmentId, ...rest } = parsed.data;

    // A linked role must belong to the same profile, or the link is dropped.
    let linkedEmploymentId: string | null = null;
    if (employmentId) {
      const employment = await prisma.employment.findFirst({
        where: { id: employmentId, profileId: profile.id },
        select: { id: true },
      });
      linkedEmploymentId = employment?.id ?? null;
    }

    const data = {
      ...rest,
      metric: rest.metric || null,
      employmentId: linkedEmploymentId,
    };

    if (id) {
      const { count } = await prisma.accomplishment.updateMany({
        where: { id, profileId: profile.id },
        data,
      });
      if (count === 0) return fail("That accomplishment no longer exists.");
    } else {
      await prisma.accomplishment.create({
        data: { ...data, profileId: profile.id },
      });
    }

    refreshProfile();
    return ok();
  });
}

export async function deleteAccomplishmentAction(
  id: string,
): Promise<ActionResult> {
  return guarded("deleteAccomplishment", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    await prisma.accomplishment.deleteMany({
      where: { id, profileId: profile.id },
    });
    refreshProfile();
    return ok();
  });
}

// ------------------------------------------------------------------ resumes

export async function saveResumeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveResume", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    const parsed = parseOrFail(resumeSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, label, content, isDefault } = parsed.data;

    const clash = await prisma.resume.findFirst({
      where: { profileId: profile.id, label, NOT: id ? { id } : undefined },
      select: { id: true },
    });
    if (clash) {
      return fail(`You already have a version called "${label}".`, {
        label: "Name already used",
      });
    }

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.resume.updateMany({
          where: { profileId: profile.id },
          data: { isDefault: false },
        });
      }

      if (id) {
        // Bumping version on every save gives resume history a cheap, honest
        // counter without a separate revisions table.
        await tx.resume.updateMany({
          where: { id, profileId: profile.id },
          data: { label, content, isDefault, version: { increment: 1 } },
        });
      } else {
        await tx.resume.create({
          data: { profileId: profile.id, label, content, isDefault },
        });
      }
    });

    refreshProfile();
    return ok();
  });
}

export async function deleteResumeAction(id: string): Promise<ActionResult> {
  return guarded("deleteResume", async () => {
    const profile = await requireProfileId();
    if (!profile.ok) return profile.result;

    await prisma.resume.deleteMany({ where: { id, profileId: profile.id } });
    refreshProfile();
    return ok();
  });
}
