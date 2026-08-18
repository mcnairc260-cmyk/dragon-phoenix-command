import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/server/prisma";
import { signInSchema } from "@/lib/validation/auth";

/**
 * A bcrypt hash of a throwaway string. When an email does not exist we still
 * run a comparison against this so sign-in takes the same time either way and
 * cannot be used to enumerate registered addresses.
 */
const DUMMY_HASH = "$2b$12$K3JNi5eB1Rj3vX4vJ0m9tOxYqXn0M1qhZ7v1zL0pQ7yQ9Y4gJ2m3G";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });

        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
