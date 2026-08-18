-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DISCOVERED', 'EVALUATING', 'PREPARING', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('FAMILIAR', 'PROFICIENT', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('CONFIRMED', 'INFERRED', 'MISSING');

-- CreateEnum
CREATE TYPE "MaterialKind" AS ENUM ('SUMMARY', 'RESUME_BULLETS', 'COVER_LETTER', 'RECRUITER_OUTREACH', 'HIRING_MANAGER_OUTREACH', 'INTERVIEW_QUESTIONS', 'STAR_PROMPTS', 'COMPANY_RESEARCH');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('JOB_CREATED', 'JOB_UPDATED', 'STATUS_CHANGED', 'ANALYSIS_RUN', 'MATERIAL_GENERATED', 'MATERIAL_EDITED', 'NOTE_ADDED', 'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED', 'FOCUS_TASK_COMPLETED');

-- CreateEnum
CREATE TYPE "FocusTaskStatus" AS ENUM ('PENDING', 'SNOOZED', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FollowUpChannel" AS ENUM ('EMAIL', 'LINKEDIN', 'PHONE', 'PORTAL', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "linkedIn" TEXT,
    "portfolio" TEXT,
    "github" TEXT,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workMode" "WorkMode" NOT NULL DEFAULT 'FLEXIBLE',
    "desiredSalaryMin" INTEGER,
    "desiredSalaryMax" INTEGER,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'USD',
    "masterResume" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "credential" TEXT NOT NULL,
    "field" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT,
    "level" "SkillLevel" NOT NULL DEFAULT 'PROFICIENT',
    "yearsExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accomplishment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "employmentId" TEXT,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL DEFAULT '',
    "task" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "metric" TEXT,
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accomplishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "url" TEXT,
    "location" TEXT,
    "workMode" "WorkMode",
    "salaryText" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "JobStatus" NOT NULL DEFAULT 'DISCOVERED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAnalysis" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "recommendedPriority" "Priority" NOT NULL,
    "explanation" TEXT NOT NULL,
    "requiredSkills" JSONB NOT NULL,
    "preferredSkills" JSONB NOT NULL,
    "matchedSkills" JSONB NOT NULL,
    "missingQualifications" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationMaterial" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "sourceAccomplishmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "channel" "FollowUpChannel" NOT NULL DEFAULT 'EMAIL',
    "note" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "recipeKey" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "FocusTaskStatus" NOT NULL DEFAULT 'PENDING',
    "href" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "Employment_profileId_startDate_idx" ON "Employment"("profileId", "startDate");

-- CreateIndex
CREATE INDEX "Education_profileId_idx" ON "Education"("profileId");

-- CreateIndex
CREATE INDEX "Skill_profileId_idx" ON "Skill"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_profileId_normalizedName_key" ON "Skill"("profileId", "normalizedName");

-- CreateIndex
CREATE INDEX "Accomplishment_profileId_idx" ON "Accomplishment"("profileId");

-- CreateIndex
CREATE INDEX "Accomplishment_employmentId_idx" ON "Accomplishment"("employmentId");

-- CreateIndex
CREATE INDEX "Resume_profileId_idx" ON "Resume"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Resume_profileId_label_key" ON "Resume"("profileId", "label");

-- CreateIndex
CREATE INDEX "JobOpportunity_userId_status_idx" ON "JobOpportunity"("userId", "status");

-- CreateIndex
CREATE INDEX "JobOpportunity_userId_lastActivityAt_idx" ON "JobOpportunity"("userId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "JobOpportunity_userId_deadline_idx" ON "JobOpportunity"("userId", "deadline");

-- CreateIndex
CREATE INDEX "JobOpportunity_userId_archivedAt_idx" ON "JobOpportunity"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobAnalysis_jobId_key" ON "JobAnalysis"("jobId");

-- CreateIndex
CREATE INDEX "JobAnalysis_inputHash_idx" ON "JobAnalysis"("inputHash");

-- CreateIndex
CREATE INDEX "ApplicationMaterial_jobId_idx" ON "ApplicationMaterial"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMaterial_jobId_kind_key" ON "ApplicationMaterial"("jobId", "kind");

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_jobId_createdAt_idx" ON "Activity"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_jobId_idx" ON "FollowUp"("jobId");

-- CreateIndex
CREATE INDEX "FollowUp_dueAt_idx" ON "FollowUp"("dueAt");

-- CreateIndex
CREATE INDEX "FocusTask_userId_status_idx" ON "FocusTask"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FocusTask_userId_recipeKey_key" ON "FocusTask"("userId", "recipeKey");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accomplishment" ADD CONSTRAINT "Accomplishment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accomplishment" ADD CONSTRAINT "Accomplishment_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMaterial" ADD CONSTRAINT "ApplicationMaterial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusTask" ADD CONSTRAINT "FocusTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusTask" ADD CONSTRAINT "FocusTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
