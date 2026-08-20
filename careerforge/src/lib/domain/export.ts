import type { MaterialKind } from "@prisma/client";

import { MATERIAL_LABEL } from "./constants";

/**
 * Export helpers. Kept pure and framework-free so they are trivially testable
 * and so the same output is produced whether a file is downloaded, copied, or
 * rendered.
 */

export type ExportableMaterial = {
  kind: MaterialKind;
  content: string;
  isEdited: boolean;
  updatedAt: Date;
};

export type ExportContext = {
  jobTitle: string;
  company: string;
  candidateName: string;
};

/** Strips Markdown to something that reads correctly in a plain-text field. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{3}[a-z]*\n?/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A filesystem-safe stem: lowercase, hyphenated, no leading or trailing dashes. */
export function exportFilename(
  context: ExportContext,
  kind: MaterialKind | "ALL",
  extension: "md" | "txt",
): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

  const parts = [
    slug(context.candidateName || "candidate"),
    slug(context.company),
    kind === "ALL" ? "application-pack" : slug(MATERIAL_LABEL[kind]),
  ].filter(Boolean);

  return `${parts.join("-")}.${extension}`;
}

export function materialToMarkdown(
  material: ExportableMaterial,
  context: ExportContext,
): string {
  return [
    `# ${MATERIAL_LABEL[material.kind]}`,
    "",
    `**Role:** ${context.jobTitle} at ${context.company}`,
    `**Prepared by:** ${context.candidateName}`,
    `**Last updated:** ${material.updatedAt.toISOString().slice(0, 10)}${
      material.isEdited ? " (edited by you)" : ""
    }`,
    "",
    "---",
    "",
    material.content.trim(),
    "",
  ].join("\n");
}

export function packToMarkdown(
  materials: ExportableMaterial[],
  context: ExportContext,
): string {
  const header = [
    `# Application pack — ${context.jobTitle} at ${context.company}`,
    "",
    `Prepared by ${context.candidateName}.`,
    "",
    "Every draft below was assembled from this candidate's own profile and",
    "accomplishment record. Check anything before you send it.",
    "",
  ];

  const sections = materials.map((material) =>
    [
      "---",
      "",
      `## ${MATERIAL_LABEL[material.kind]}`,
      material.isEdited ? "*Edited by you.*" : "*As generated.*",
      "",
      material.content.trim(),
      "",
    ].join("\n"),
  );

  return [...header, ...sections].join("\n");
}
