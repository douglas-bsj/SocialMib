import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // E-mail sem diferenciar maiúsculas e sem espaços sobrando
        // (o celular costuma colocar a primeira letra maiúscula).
        const email = String(credentials.email).trim().toLowerCase();
        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          String(credentials.password),
          user.password
        );

        if (!isValid) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.name) return;
      const slug = user.name.toLowerCase().replace(/\s+/g, "-") + "-" + user.id.slice(-4);
      await db.workspace.create({
        data: {
          name: `${user.name}'s Workspace`,
          slug,
          ownerId: user.id,
          members: {
            create: { userId: user.id, role: "OWNER" },
          },
        },
      });
    },
  },
});
