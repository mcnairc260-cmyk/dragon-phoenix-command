/**
 * Seeds the demo account.
 *
 * Everything here is invented. "Maya Okonkwo" is not a real person, the
 * employers do not exist, and the metrics are illustrative. That is the point:
 * the demo must make every screen understandable without exposing anyone's
 * real career history.
 *
 * Idempotent — re-running replaces the demo user's data and leaves every other
 * account untouched.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@careerforge.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo-password-1234";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function daysAhead(n: number): Date {
  return daysAgo(-n);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, isDemo: true },
    create: {
      email: DEMO_EMAIL,
      name: "Maya Okonkwo",
      passwordHash,
      isDemo: true,
    },
  });

  // Wipe the demo user's own records only; cascades handle the children.
  await prisma.jobOpportunity.deleteMany({ where: { userId: user.id } });
  await prisma.focusTask.deleteMany({ where: { userId: user.id } });
  await prisma.activity.deleteMany({ where: { userId: user.id } });
  await prisma.candidateProfile.deleteMany({ where: { userId: user.id } });

  const profile = await prisma.candidateProfile.create({
    data: {
      userId: user.id,
      fullName: "Maya Okonkwo",
      headline: "Senior backend engineer — distributed systems, payments",
      email: DEMO_EMAIL,
      phone: "+1 (555) 0134",
      location: "Portland, OR",
      linkedIn: "https://linkedin.com/in/example-demo-profile",
      github: "https://github.com/example-demo-profile",
      portfolio: "https://example.dev",
      targetRoles: [
        "Senior Backend Engineer",
        "Staff Engineer",
        "Platform Engineer",
      ],
      preferredLocations: ["Portland, OR", "Seattle, WA", "Remote (US)"],
      workMode: "REMOTE",
      desiredSalaryMin: 165000,
      desiredSalaryMax: 205000,
      salaryCurrency: "USD",
      masterResume: [
        "MAYA OKONKWO",
        "Senior Backend Engineer · Portland, OR · Remote-first",
        "",
        "Backend engineer with eight years building payment and data infrastructure.",
        "Comfortable owning a service end to end: schema, API, deploy, on-call, and the",
        "postmortem afterwards. Strongest on correctness under load and on making",
        "systems legible to the people who did not build them.",
        "",
        "EXPERIENCE",
        "Senior Backend Engineer, Northwind Payments (2022–present)",
        "Backend Engineer, Cobalt Analytics (2019–2022)",
        "Software Engineer, Tidewater Labs (2017–2019)",
        "",
        "SKILLS",
        "Go, TypeScript, Python, PostgreSQL, Kafka, gRPC, Kubernetes, Terraform, AWS",
      ].join("\n"),
    },
  });

  const northwind = await prisma.employment.create({
    data: {
      profileId: profile.id,
      company: "Northwind Payments",
      title: "Senior Backend Engineer",
      location: "Remote (US)",
      startDate: new Date("2022-03-01"),
      isCurrent: true,
      sortOrder: 0,
      summary:
        "Own the ledger and settlement services behind a card-issuing platform. Lead on correctness, on-call rotation, and the migration off a single-writer Postgres design.",
    },
  });

  const cobalt = await prisma.employment.create({
    data: {
      profileId: profile.id,
      company: "Cobalt Analytics",
      title: "Backend Engineer",
      location: "Portland, OR",
      startDate: new Date("2019-06-01"),
      endDate: new Date("2022-02-01"),
      sortOrder: 1,
      summary:
        "Built the ingestion pipeline for customer event data and the query API that sat on top of it.",
    },
  });

  const tidewater = await prisma.employment.create({
    data: {
      profileId: profile.id,
      company: "Tidewater Labs",
      title: "Software Engineer",
      location: "Portland, OR",
      startDate: new Date("2017-08-01"),
      endDate: new Date("2019-05-01"),
      sortOrder: 2,
      summary:
        "First engineering hire on an internal tools team. Built and maintained the deployment console used by every product team.",
    },
  });

  await prisma.education.createMany({
    data: [
      {
        profileId: profile.id,
        institution: "Oregon State University",
        credential: "B.S. Computer Science",
        field: "Computer Science",
        startDate: new Date("2013-09-01"),
        endDate: new Date("2017-06-01"),
        notes: "Focus on distributed systems and databases.",
        sortOrder: 0,
      },
      {
        profileId: profile.id,
        institution: "Linux Foundation",
        credential: "Certified Kubernetes Administrator",
        startDate: new Date("2021-02-01"),
        endDate: new Date("2021-04-01"),
        notes: "Renewed 2024.",
        sortOrder: 1,
      },
    ],
  });

  const skills: Array<{
    name: string;
    category: string;
    level: "FAMILIAR" | "PROFICIENT" | "ADVANCED" | "EXPERT";
    years: number;
  }> = [
    { name: "Go", category: "Languages", level: "EXPERT", years: 6 },
    { name: "TypeScript", category: "Languages", level: "ADVANCED", years: 7 },
    { name: "Python", category: "Languages", level: "PROFICIENT", years: 5 },
    { name: "PostgreSQL", category: "Data", level: "EXPERT", years: 8 },
    { name: "Kafka", category: "Data", level: "ADVANCED", years: 4 },
    { name: "gRPC", category: "Platform", level: "ADVANCED", years: 4 },
    { name: "Kubernetes", category: "Platform", level: "PROFICIENT", years: 4 },
    { name: "Terraform", category: "Platform", level: "PROFICIENT", years: 3 },
    { name: "AWS", category: "Platform", level: "ADVANCED", years: 6 },
    { name: "Distributed systems", category: "Domain", level: "ADVANCED", years: 6 },
    { name: "Payments", category: "Domain", level: "ADVANCED", years: 4 },
    { name: "Observability", category: "Platform", level: "PROFICIENT", years: 5 },
    { name: "Mentoring", category: "Leadership", level: "ADVANCED", years: 4 },
    { name: "Incident response", category: "Leadership", level: "ADVANCED", years: 5 },
  ];

  await prisma.skill.createMany({
    data: skills.map((s) => ({
      profileId: profile.id,
      name: s.name,
      normalizedName: s.name.toLowerCase(),
      category: s.category,
      level: s.level,
      yearsExperience: s.years,
    })),
  });

  const accomplishments: Prisma.AccomplishmentCreateManyInput[] = [
    {
      profileId: profile.id,
      employmentId: northwind.id,
      title: "Removed the single-writer bottleneck from the ledger",
      situation:
        "The ledger ran through one Postgres writer and was saturating during month-end settlement.",
      task: "Keep settlement correct while removing the write bottleneck, with no downtime window available.",
      action:
        "Designed a partitioned write path keyed by account, shipped it behind a dual-write shadow mode for six weeks, and reconciled every batch before cutting over.",
      result:
        "Settlement runs that took 4 hours finished in 40 minutes, and month-end write saturation stopped recurring.",
      metric: "4h → 40m settlement runtime",
      skillTags: ["PostgreSQL", "Go", "Distributed systems", "Payments"],
      categories: ["Backend", "Platform"],
    },
    {
      profileId: profile.id,
      employmentId: northwind.id,
      title: "Cut ledger reconciliation defects by making failures loud",
      situation:
        "Reconciliation mismatches were being discovered by the finance team days after they happened.",
      task: "Detect mismatches at write time instead of at month-end.",
      action:
        "Added invariant checks to the write path, emitted them as metrics, and built a dashboard finance could read without an engineer present.",
      result:
        "Mismatches surfaced within minutes rather than days, and the recurring month-end reconciliation meeting was retired.",
      metric: "Detection time: days → minutes",
      skillTags: ["Observability", "PostgreSQL", "Payments"],
      categories: ["Backend", "Reliability"],
    },
    {
      profileId: profile.id,
      employmentId: northwind.id,
      title: "Ran the on-call rotation redesign",
      situation:
        "Six engineers shared a rotation with no documented escalation path, and pages were being missed.",
      task: "Make on-call survivable without adding headcount.",
      action:
        "Wrote runbooks for the eight most common pages, introduced a secondary tier, and instituted a fifteen-minute handoff at rotation change.",
      result:
        "Missed pages went to zero over the following two quarters and two engineers volunteered back onto the rotation.",
      metric: "Missed pages → 0 over two quarters",
      skillTags: ["Incident response", "Mentoring"],
      categories: ["Leadership", "Reliability"],
    },
    {
      profileId: profile.id,
      employmentId: cobalt.id,
      title: "Built the event ingestion pipeline",
      situation:
        "Customer event data arrived through a cron-driven batch job that lost records under load.",
      task: "Replace batch ingestion with something that could take a 10x traffic increase.",
      action:
        "Built a Kafka-based ingestion path in Go with idempotent consumers and a replay tool for backfills.",
      result:
        "Handled a 12x traffic increase over the next year with no record loss and no architecture change.",
      metric: "12x traffic absorbed, zero record loss",
      skillTags: ["Kafka", "Go", "Distributed systems"],
      categories: ["Backend", "Data"],
    },
    {
      profileId: profile.id,
      employmentId: cobalt.id,
      title: "Made the query API fast enough to be interactive",
      situation:
        "The customer-facing query API answered in 8–20 seconds, so customers exported to spreadsheets instead.",
      task: "Get common queries under a second without a rewrite.",
      action:
        "Profiled the top twenty query shapes, added covering indexes and a materialised rollup for the two most expensive, and cached the rest per tenant.",
      result:
        "The 95th-percentile response dropped to 700ms and in-product query use roughly tripled.",
      metric: "p95 8s → 700ms",
      skillTags: ["PostgreSQL", "Observability", "TypeScript"],
      categories: ["Backend", "Performance"],
    },
    {
      profileId: profile.id,
      employmentId: tidewater.id,
      title: "Shipped the internal deployment console",
      situation:
        "Every deployment went through a hand-written shell script that only two people understood.",
      task: "Let any product engineer deploy safely without shell access.",
      action:
        "Built a deployment console with per-environment approvals, an audit trail, and one-click rollback.",
      result:
        "Deployments moved from two people to all fourteen engineers, and rollbacks stopped requiring an incident.",
      metric: "Deploy access: 2 → 14 engineers",
      skillTags: ["TypeScript", "AWS", "Kubernetes"],
      categories: ["Platform", "Tooling"],
    },
    {
      profileId: profile.id,
      employmentId: northwind.id,
      title: "Mentored two engineers to independent service ownership",
      situation:
        "Two mid-level engineers were shipping features but not owning any service outright.",
      task: "Get both to the point of owning a service including its on-call.",
      action:
        "Paired weekly on design reviews, handed over one service each in stages, and moved from reviewing their code to reviewing their decisions.",
      result:
        "Both owned a production service within two quarters and one was promoted to senior.",
      metric: "2 engineers to full service ownership",
      skillTags: ["Mentoring", "Incident response"],
      categories: ["Leadership"],
    },
  ];

  await prisma.accomplishment.createMany({ data: accomplishments });

  await prisma.resume.createMany({
    data: [
      {
        profileId: profile.id,
        label: "Backend — general",
        isDefault: true,
        version: 3,
        content:
          "General backend resume. Leads with the ledger partitioning work and the ingestion pipeline.",
      },
      {
        profileId: profile.id,
        label: "Platform / infrastructure",
        version: 2,
        content:
          "Platform-leaning variant. Leads with Kubernetes, Terraform, and the deployment console.",
      },
      {
        profileId: profile.id,
        label: "Payments specialist",
        version: 1,
        content:
          "Payments variant. Leads with settlement, reconciliation, and ledger correctness.",
      },
    ],
  });

  // ------------------------------------------------------------------ jobs

  const jobs: Array<
    Prisma.JobOpportunityCreateWithoutUserInput & { activityDays: number }
  > = [
    {
      title: "Staff Backend Engineer, Payments",
      company: "Meridian Financial",
      url: "https://example.com/jobs/meridian-staff-backend",
      location: "Remote (US)",
      workMode: "REMOTE",
      salaryText: "$185,000 – $215,000",
      salaryMin: 185000,
      salaryMax: 215000,
      status: "INTERVIEWING",
      priority: "URGENT",
      source: "Referral",
      deadline: daysAhead(5),
      appliedAt: daysAgo(18),
      notes:
        "Second-round loop scheduled. Interviewer mentioned they are replacing a batch settlement system — the Northwind partitioning story is directly relevant.",
      activityDays: 2,
      description: [
        "Meridian Financial is hiring a Staff Backend Engineer to own the settlement and ledger platform behind our card-issuing product.",
        "",
        "What you will do:",
        "- Own the correctness of a double-entry ledger processing millions of transactions daily",
        "- Lead the migration from batch settlement to a streaming design",
        "- Set the technical direction for a team of six engineers",
        "- Participate in a shared on-call rotation",
        "",
        "Required:",
        "- 7+ years building backend services in Go, Java, or a similar systems language",
        "- Deep PostgreSQL experience, including partitioning and query optimisation",
        "- Experience with event streaming (Kafka, Kinesis, or equivalent)",
        "- Demonstrated ownership of a payments, ledger, or financial system",
        "- Track record of technical leadership without formal authority",
        "",
        "Preferred:",
        "- Experience with card issuing or scheme settlement",
        "- gRPC and protocol buffer experience",
        "- Kubernetes and Terraform",
        "- Formal verification or property-based testing experience",
      ].join("\n"),
    },
    {
      title: "Senior Platform Engineer",
      company: "Lumen Grid",
      url: "https://example.com/jobs/lumen-platform",
      location: "Seattle, WA (Hybrid)",
      workMode: "HYBRID",
      salaryText: "$170,000 – $195,000",
      salaryMin: 170000,
      salaryMax: 195000,
      status: "APPLIED",
      priority: "HIGH",
      source: "Company site",
      appliedAt: daysAgo(11),
      notes: "Recruiter said decisions were going out this week. Worth a nudge.",
      activityDays: 11,
      description: [
        "Lumen Grid is building the internal platform that every product team at Lumen deploys onto.",
        "",
        "Responsibilities:",
        "- Own the deployment and release tooling used by 60+ engineers",
        "- Run the Kubernetes platform and its Terraform-managed infrastructure",
        "- Improve observability and reduce mean time to recovery",
        "- Mentor engineers joining the platform team",
        "",
        "Requirements:",
        "- 5+ years of backend or infrastructure engineering",
        "- Strong Kubernetes and Terraform experience",
        "- Proficiency in Go or Python",
        "- Experience building internal developer tooling",
        "- Comfort with on-call and incident response",
        "",
        "Nice to have:",
        "- Service mesh experience (Istio, Linkerd)",
        "- Cost-optimisation work on AWS",
        "- Prior experience as a first platform hire",
      ].join("\n"),
    },
    {
      title: "Senior Backend Engineer, Data Platform",
      company: "Harbor Analytics",
      url: "https://example.com/jobs/harbor-backend",
      location: "Remote (US)",
      workMode: "REMOTE",
      salaryText: "$160,000 – $185,000",
      salaryMin: 160000,
      salaryMax: 185000,
      status: "PREPARING",
      priority: "HIGH",
      source: "LinkedIn",
      deadline: daysAhead(9),
      notes: "Cover letter drafted, needs a pass to cut it down.",
      activityDays: 3,
      description: [
        "Harbor Analytics processes billions of customer events a month and exposes them through a query API used by our customers directly.",
        "",
        "You will:",
        "- Own the ingestion pipeline end to end",
        "- Improve query performance for customer-facing analytics",
        "- Design schemas that stay fast as tenants grow",
        "- Work directly with customers on performance issues",
        "",
        "Required:",
        "- 5+ years backend engineering",
        "- Kafka or equivalent event-streaming experience",
        "- Strong SQL and PostgreSQL performance tuning",
        "- Go or Python",
        "",
        "Preferred:",
        "- Multi-tenant SaaS experience",
        "- ClickHouse, Snowflake, or another analytical store",
        "- Experience talking to customers about technical problems",
      ].join("\n"),
    },
    {
      title: "Backend Engineer, Core Services",
      company: "Bright Labs",
      url: "https://example.com/jobs/bright-core",
      location: "Portland, OR (On-site)",
      workMode: "ONSITE",
      salaryText: "$145,000 – $165,000",
      salaryMin: 145000,
      salaryMax: 165000,
      status: "EVALUATING",
      priority: "MEDIUM",
      source: "Job board",
      notes:
        "On-site five days a week, which is the sticking point. Salary is also below target.",
      activityDays: 6,
      description: [
        "Bright Labs is looking for a Backend Engineer to join the Core Services team.",
        "",
        "About the role:",
        "- Build and maintain the services that everything else at Bright Labs depends on",
        "- Work in Go and TypeScript",
        "- Participate in design reviews and on-call",
        "",
        "Requirements:",
        "- 4+ years of backend experience",
        "- Go or another statically typed language",
        "- PostgreSQL",
        "- On-site in Portland five days a week",
        "",
        "Preferred:",
        "- gRPC",
        "- Experience in a company under 100 people",
      ].join("\n"),
    },
    {
      title: "Principal Engineer, Infrastructure",
      company: "Apex Systems Group",
      url: "https://example.com/jobs/apex-principal",
      location: "Remote (US)",
      workMode: "REMOTE",
      salaryText: "$210,000 – $250,000",
      salaryMin: 210000,
      salaryMax: 250000,
      status: "DISCOVERED",
      priority: "MEDIUM",
      source: "Recruiter email",
      activityDays: 1,
      description: [
        "Apex is hiring a Principal Engineer to set infrastructure direction across four product lines.",
        "",
        "Requirements:",
        "- 10+ years of engineering experience, including 3+ at principal or staff level",
        "- Demonstrated architectural ownership across multiple teams",
        "- Deep Kubernetes and cloud infrastructure expertise",
        "- Experience running a multi-region production system",
        "- Formal experience leading platform migrations at scale",
        "",
        "Preferred:",
        "- Public speaking or written thought leadership",
        "- Experience with FedRAMP or SOC 2 compliance programmes",
      ].join("\n"),
    },
    {
      title: "Senior Software Engineer, Billing",
      company: "Kestrel Cloud",
      url: "https://example.com/jobs/kestrel-billing",
      location: "Remote (US)",
      workMode: "REMOTE",
      salaryText: "$170,000 – $190,000",
      salaryMin: 170000,
      salaryMax: 190000,
      status: "REJECTED",
      priority: "MEDIUM",
      source: "LinkedIn",
      appliedAt: daysAgo(38),
      notes:
        "Rejected after the screen — they wanted someone already deep in subscription billing specifically.",
      activityDays: 24,
      description: [
        "Kestrel Cloud is hiring a Senior Software Engineer for the Billing team.",
        "",
        "Requirements:",
        "- 5+ years backend engineering",
        "- Subscription billing or metering systems experience",
        "- Go and PostgreSQL",
        "- Experience with Stripe or a comparable billing provider",
      ].join("\n"),
    },
    {
      title: "Senior Backend Engineer",
      company: "Verdant Health",
      url: "https://example.com/jobs/verdant-backend",
      location: "Remote (US)",
      workMode: "REMOTE",
      salaryText: "$165,000 – $185,000",
      salaryMin: 165000,
      salaryMax: 185000,
      status: "APPLIED",
      priority: "MEDIUM",
      source: "Referral",
      appliedAt: daysAgo(25),
      notes: "No response in over three weeks. Probably cold.",
      activityDays: 25,
      description: [
        "Verdant Health builds scheduling and records infrastructure for outpatient clinics.",
        "",
        "Requirements:",
        "- 5+ years backend engineering",
        "- PostgreSQL and a statically typed language",
        "- Experience with HIPAA-regulated systems",
        "- Comfort working in a codebase with substantial legacy surface",
        "",
        "Preferred:",
        "- HL7 or FHIR experience",
        "- Go",
      ].join("\n"),
    },
  ];

  for (const { activityDays, ...job } of jobs) {
    const created = await prisma.jobOpportunity.create({
      data: {
        ...job,
        userId: user.id,
        lastActivityAt: daysAgo(activityDays),
      },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        jobId: created.id,
        type: "JOB_CREATED",
        message: `Added ${created.title} at ${created.company}`,
        createdAt: daysAgo(activityDays + 4),
      },
    });

    if (created.appliedAt) {
      await prisma.activity.create({
        data: {
          userId: user.id,
          jobId: created.id,
          type: "STATUS_CHANGED",
          message: `Applied to ${created.company}`,
          createdAt: created.appliedAt,
        },
      });
    }
  }

  const meridian = await prisma.jobOpportunity.findFirst({
    where: { userId: user.id, company: "Meridian Financial" },
  });
  const lumen = await prisma.jobOpportunity.findFirst({
    where: { userId: user.id, company: "Lumen Grid" },
  });

  if (meridian) {
    await prisma.followUp.create({
      data: {
        jobId: meridian.id,
        dueAt: daysAhead(1),
        channel: "EMAIL",
        note: "Send the interviewer the settlement architecture summary they asked for.",
      },
    });
  }

  if (lumen) {
    await prisma.followUp.create({
      data: {
        jobId: lumen.id,
        dueAt: daysAgo(2),
        channel: "LINKEDIN",
        note: "Check in with the recruiter — they said decisions this week.",
      },
    });
  }

  console.log(
    `Seeded demo account ${DEMO_EMAIL} with ${jobs.length} opportunities.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
