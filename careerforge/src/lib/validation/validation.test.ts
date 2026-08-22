import { describe, expect, it } from "vitest";

import { emailSchema, passwordSchema, signUpSchema } from "./auth";
import { jobSchema } from "./job";
import { cleanText, listFromText, profileSchema } from "./profile";

describe("emailSchema", () => {
  it("lowercases and trims", () => {
    expect(emailSchema.parse("  Test@Example.COM ")).toBe("test@example.com");
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires a real length rather than a composition rule", () => {
    // Length is what actually resists guessing; composition rules mostly
    // produce "Password1!".
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("a long enough passphrase").success).toBe(
      true,
    );
  });
});

describe("signUpSchema", () => {
  it("accepts a complete signup", () => {
    const parsed = signUpSchema.safeParse({
      name: "Alex Rivera",
      email: "ALEX@example.com",
      password: "a long enough passphrase",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("alex@example.com");
  });

  it("rejects a blank name", () => {
    expect(
      signUpSchema.safeParse({
        name: "   ",
        email: "a@example.com",
        password: "a long enough passphrase",
      }).success,
    ).toBe(false);
  });
});

describe("cleanText", () => {
  it("strips control characters but keeps newlines and tabs", () => {
    const dirty = `line one\nline\ttwo${String.fromCharCode(0)}${String.fromCharCode(7)}`;
    expect(cleanText(100).parse(dirty)).toBe("line one\nline\ttwo");
  });

  it("rejects text over the limit", () => {
    expect(cleanText(10).safeParse("x".repeat(11)).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanText(100).parse("  hello  ")).toBe("hello");
  });
});

describe("listFromText", () => {
  it("splits on commas and newlines", () => {
    expect(listFromText(10).parse("Go, Rust\nPython")).toEqual([
      "Go",
      "Rust",
      "Python",
    ]);
  });

  it("removes duplicates and blanks", () => {
    expect(listFromText(10).parse("Go,,Go, Rust,")).toEqual(["Go", "Rust"]);
  });

  it("caps the number of items", () => {
    expect(listFromText(2).parse("a,b,c,d")).toEqual(["a", "b"]);
  });
});

describe("profileSchema", () => {
  const base = {
    fullName: "Maya Okonkwo",
    headline: "Backend engineer",
    email: "maya@example.com",
    phone: "",
    location: "Portland, OR",
    linkedIn: "",
    portfolio: "",
    github: "",
    targetRoles: "Senior Backend Engineer",
    preferredLocations: "Remote (US)",
    workMode: "REMOTE",
    desiredSalaryMin: "150000",
    desiredSalaryMax: "",
    salaryCurrency: "USD",
    masterResume: "",
  };

  it("accepts a minimal profile", () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
  });

  it("distinguishes an unset salary from zero", () => {
    const parsed = profileSchema.parse(base);
    expect(parsed.desiredSalaryMin).toBe(150_000);
    expect(parsed.desiredSalaryMax).toBeNull();
  });

  it("requires a name", () => {
    expect(profileSchema.safeParse({ ...base, fullName: "  " }).success).toBe(
      false,
    );
  });

  it("rejects a URL without a scheme", () => {
    expect(
      profileSchema.safeParse({ ...base, linkedIn: "linkedin.com/in/me" })
        .success,
    ).toBe(false);
  });

  it("normalises an empty URL to null", () => {
    expect(profileSchema.parse(base).linkedIn).toBeNull();
  });
});

describe("jobSchema", () => {
  const base = {
    title: "Senior Backend Engineer",
    company: "Meridian Financial",
    url: "https://example.com/jobs/1",
    location: "Remote (US)",
    workMode: "REMOTE",
    salaryText: "$180,000",
    salaryMin: "180000",
    salaryMax: "200000",
    description: "Requirements:\n- Go",
    source: "Referral",
    status: "DISCOVERED",
    priority: "MEDIUM",
    deadline: "",
    notes: "",
  };

  it("accepts a complete job", () => {
    expect(jobSchema.safeParse(base).success).toBe(true);
  });

  it("requires a title and a company", () => {
    expect(jobSchema.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(jobSchema.safeParse({ ...base, company: "  " }).success).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    // The posting URL is rendered as a link, so the scheme is checked here
    // rather than sanitised at every render site.
    expect(
      jobSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects a data: URL", () => {
    expect(
      jobSchema.safeParse({ ...base, url: "data:text/html,<script>" }).success,
    ).toBe(false);
  });

  it("treats an unspecified work mode as null rather than an error", () => {
    const parsed = jobSchema.parse({ ...base, workMode: "unspecified" });
    expect(parsed.workMode).toBeNull();
  });

  it("rejects an invalid status", () => {
    expect(jobSchema.safeParse({ ...base, status: "MAYBE" }).success).toBe(
      false,
    );
  });

  it("parses an empty deadline as null", () => {
    expect(jobSchema.parse(base).deadline).toBeNull();
  });

  it("strips control characters from the pasted description", () => {
    const parsed = jobSchema.parse({
      ...base,
      description: `Requirements:${String.fromCharCode(0)}\n- Go`,
    });
    expect(parsed.description).toBe("Requirements:\n- Go");
  });
});
