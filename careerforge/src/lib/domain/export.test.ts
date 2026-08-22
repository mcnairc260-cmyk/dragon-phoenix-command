import { describe, expect, it } from "vitest";

import {
  exportFilename,
  materialToMarkdown,
  packToMarkdown,
  toPlainText,
  type ExportContext,
  type ExportableMaterial,
} from "./export";

const context: ExportContext = {
  jobTitle: "Senior Backend Engineer",
  company: "Meridian Financial",
  candidateName: "Maya Okonkwo",
};

function material(
  overrides: Partial<ExportableMaterial> = {},
): ExportableMaterial {
  return {
    kind: "COVER_LETTER",
    content: "Dear team,\n\nI am writing about the role.",
    isEdited: false,
    updatedAt: new Date("2026-06-15T00:00:00Z"),
    ...overrides,
  };
}

describe("toPlainText", () => {
  it("strips headings, emphasis, and code fences", () => {
    const out = toPlainText("# Title\n\n**bold** and *italic* and `code`");
    expect(out).toBe("Title\n\nbold and italic and code");
  });

  it("turns list markers into bullets", () => {
    expect(toPlainText("- one\n- two")).toBe("• one\n• two");
  });

  it("keeps the URL from a link rather than dropping it", () => {
    expect(toPlainText("[my site](https://example.com)")).toBe(
      "my site (https://example.com)",
    );
  });

  it("collapses runs of blank lines", () => {
    expect(toPlainText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("leaves plain prose untouched", () => {
    const prose = "Dear team,\n\nI am writing about the role.";
    expect(toPlainText(prose)).toBe(prose);
  });
});

describe("exportFilename", () => {
  it("builds a slug from the candidate, company, and kind", () => {
    expect(exportFilename(context, "COVER_LETTER", "md")).toBe(
      "maya-okonkwo-meridian-financial-cover-letter.md",
    );
  });

  it("names a whole-pack export distinctly", () => {
    expect(exportFilename(context, "ALL", "txt")).toBe(
      "maya-okonkwo-meridian-financial-application-pack.txt",
    );
  });

  it("produces a safe filename from punctuation-heavy input", () => {
    const name = exportFilename(
      { ...context, company: "Foo & Bar, Inc. / Baz" },
      "ALL",
      "md",
    );
    expect(name).toMatch(/^[a-z0-9-]+\.md$/);
    expect(name).not.toContain("/");
  });

  it("falls back when the candidate has no name yet", () => {
    const name = exportFilename({ ...context, candidateName: "" }, "ALL", "md");
    expect(name).toContain("candidate");
  });
});

describe("materialToMarkdown", () => {
  it("includes the role, the candidate, and the content", () => {
    const out = materialToMarkdown(material(), context);
    expect(out).toContain("# Cover letter");
    expect(out).toContain("Senior Backend Engineer at Meridian Financial");
    expect(out).toContain("Maya Okonkwo");
    expect(out).toContain("I am writing about the role.");
  });

  it("marks an edited draft as edited", () => {
    const out = materialToMarkdown(material({ isEdited: true }), context);
    expect(out).toContain("edited by you");
  });
});

describe("packToMarkdown", () => {
  it("includes a section per material", () => {
    const out = packToMarkdown(
      [
        material({ kind: "COVER_LETTER" }),
        material({ kind: "SUMMARY", content: "A short summary." }),
      ],
      context,
    );

    expect(out).toContain("## Cover letter");
    expect(out).toContain("## Tailored summary");
    expect(out).toContain("A short summary.");
  });

  it("says the drafts came from the candidate's own record", () => {
    const out = packToMarkdown([material()], context);
    expect(out).toContain("own profile");
  });

  it("survives an empty material list", () => {
    const out = packToMarkdown([], context);
    expect(out).toContain("Meridian Financial");
  });
});
