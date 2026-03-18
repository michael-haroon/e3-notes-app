import type { NextAuthConfig } from "next-auth";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth", "/api/health"];

// Edge-compatible auth config — no DB imports, JWT-only.
// Used by middleware; the full auth.ts adds providers + DB callbacks.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isPublic = PUBLIC_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
