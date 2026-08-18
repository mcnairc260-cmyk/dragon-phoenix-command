import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/**
 * Long-but-simple beats short-but-arcane: a length floor blocks the passwords
 * that actually get guessed, and composition rules mostly produce "Password1!".
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "Password is too long");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
