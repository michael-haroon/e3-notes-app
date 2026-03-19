import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        // Load first org as active
        const membership = await db.orgMember.findFirst({
          where: { userId: user.id! },
          include: { org: true },
          orderBy: { joinedAt: "asc" },
        });
        if (membership) {
          token.activeOrgId = membership.orgId;
          token.activeOrgRole = membership.role;
          token.activeOrgName = membership.org.name;
        }
      }
      // Allow client to switch active org
      if (trigger === "update" && session?.activeOrgId) {
        const membership = await db.orgMember.findUnique({
          where: {
            orgId_userId: {
              orgId: session.activeOrgId,
              userId: token.userId as string,
            },
          },
          include: { org: true },
        });
        if (membership) {
          token.activeOrgId = membership.orgId;
          token.activeOrgRole = membership.role;
          token.activeOrgName = membership.org.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.activeOrgId = token.activeOrgId as string | undefined;
        session.activeOrgRole = token.activeOrgRole as string | undefined;
        session.activeOrgName = token.activeOrgName as string | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});

// Type augmentation
declare module "next-auth" {
  interface Session {
    activeOrgId?: string;
    activeOrgRole?: string;
    activeOrgName?: string;
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  }
}
