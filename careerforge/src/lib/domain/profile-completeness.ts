/**
 * Profile completeness, expressed as named steps rather than a percentage.
 *
 * "Add three accomplishments" is something you can act on; "62%" is something
 * you can only feel bad about. Shared between the profile page and the focus
 * engine so both agree on what "complete" means.
 */

export type ProfileCounts = {
  fullName: string;
  targetRoles: string[];
  masterResume: string;
  employmentCount: number;
  skillCount: number;
  accomplishmentCount: number;
};

export type ChecklistItem = { label: string; done: boolean };

export function profileChecklist(profile: ProfileCounts): ChecklistItem[] {
  return [
    { label: "Name and contact", done: profile.fullName.trim().length > 0 },
    { label: "Target roles", done: profile.targetRoles.length > 0 },
    { label: "Employment history", done: profile.employmentCount > 0 },
    { label: "At least 5 skills", done: profile.skillCount >= 5 },
    {
      label: "At least 3 accomplishments",
      done: profile.accomplishmentCount >= 3,
    },
    {
      label: "Master resume text",
      done: profile.masterResume.trim().length > 0,
    },
  ];
}

export function isProfileComplete(profile: ProfileCounts): boolean {
  return profileChecklist(profile).every((item) => item.done);
}
