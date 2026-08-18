import type { NextAuthConfig } from "next-auth";

/**
 * The edge-safe half of the Auth.js config. It carries no database or bcrypt
 * imports so `middleware.ts` can use it in the edge runtime; the Credentials
 * provider and its Node-only dependencies live in `src/auth.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
