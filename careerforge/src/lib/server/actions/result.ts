import "server-only";

import { ZodError, type TypeOf, type ZodTypeAny } from "zod";

/**
 * Shared shape for every server action. Actions never throw at the client;
 * they return a discriminated result so forms can render field errors without
 * a try/catch at every call site.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Flattens a Zod error into a per-field message map for form rendering. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/** Parses a schema against form data, returning an ActionResult on failure. */
export function parseOrFail<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): { ok: true; data: TypeOf<S> } | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors = fieldErrorsFrom(parsed.error);
  const first =
    Object.values(fieldErrors)[0] ?? "Check the highlighted fields.";
  return { ok: false, result: fail(first, fieldErrors) };
}

/**
 * Wraps an action body so an unexpected failure becomes a safe message rather
 * than a stack trace containing resume text or personal details. The real
 * error is logged by identity only — never its message.
 */
export async function guarded<T>(
  label: string,
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`[action:${label}] failed with ${name}`);
    return fail("Something went wrong saving that. Try again.");
  }
}

/** Turns a FormData into a plain object, keeping repeated keys as arrays. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}
