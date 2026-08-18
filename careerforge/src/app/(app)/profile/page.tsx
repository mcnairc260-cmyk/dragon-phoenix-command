import type { Metadata } from "next";

import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/session";

import { AccomplishmentsSection } from "./accomplishments-section";
import { BasicsForm } from "./basics-form";
import { EducationSection } from "./education-section";
import { EmploymentSection } from "./employment-section";
import { ProfileCompleteness } from "./completeness";
import { ResumesSection } from "./resumes-section";
import { SkillsSection } from "./skills-section";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}) {
  const [{ welcome, tab }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      employments: { orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }] },
      educations: { orderBy: { endDate: "desc" } },
      skills: { orderBy: [{ category: "asc" }, { name: "asc" }] },
      accomplishments: { orderBy: { createdAt: "desc" } },
      resumes: { orderBy: [{ isDefault: "desc" }, { label: "asc" }] },
    },
  });

  const employmentOptions = (profile?.employments ?? []).map((e) => ({
    id: e.id,
    label: `${e.title} — ${e.company}`,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Your profile"
        description="Everything generated for a job is built from what is here. Nothing gets invented to fill a gap, so the more complete this is, the more usable the drafts are."
        actions={
          profile ? (
            <Badge tone="neutral">
              Updated {profile.updatedAt.toLocaleDateString()}
            </Badge>
          ) : null
        }
      />

      {welcome ? (
        <div className="bg-accent-soft border-accent/30 text-ink mt-6 rounded-lg border px-4 py-3 text-sm leading-relaxed">
          <strong className="font-medium">Start with the basics.</strong> Name
          and target roles are enough to add your first job. You can come back
          for employment history and accomplishments once something is in the
          pipeline.
        </div>
      ) : null}

      {profile ? (
        <ProfileCompleteness profile={profile} className="mt-6" />
      ) : null}

      <Tabs defaultValue={tab ?? "basics"} className="mt-6">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="experience">
            Experience
            {profile?.employments.length
              ? ` (${profile.employments.length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="education">
            Education
            {profile?.educations.length
              ? ` (${profile.educations.length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="skills">
            Skills{profile?.skills.length ? ` (${profile.skills.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="accomplishments">
            Accomplishments
            {profile?.accomplishments.length
              ? ` (${profile.accomplishments.length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="resumes">
            Resumes
            {profile?.resumes.length ? ` (${profile.resumes.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics">
          <BasicsForm
            profile={profile}
            fallbackName={user.name}
            fallbackEmail={user.email}
          />
        </TabsContent>

        <TabsContent value="experience">
          <EmploymentSection
            hasProfile={Boolean(profile)}
            employments={profile?.employments ?? []}
          />
        </TabsContent>

        <TabsContent value="education">
          <EducationSection
            hasProfile={Boolean(profile)}
            educations={profile?.educations ?? []}
          />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsSection
            hasProfile={Boolean(profile)}
            skills={profile?.skills ?? []}
          />
        </TabsContent>

        <TabsContent value="accomplishments">
          <AccomplishmentsSection
            hasProfile={Boolean(profile)}
            accomplishments={profile?.accomplishments ?? []}
            employmentOptions={employmentOptions}
          />
        </TabsContent>

        <TabsContent value="resumes">
          <ResumesSection
            hasProfile={Boolean(profile)}
            resumes={profile?.resumes ?? []}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
