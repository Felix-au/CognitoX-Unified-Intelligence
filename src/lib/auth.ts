import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

// TODO (Firebase Auth Migration):
// Once Firebase configuration is provided, replace this CredentialsProvider with
// client-side Firebase token validation. The server will verify the JWT ID token
// using firebase-admin and match/create users in PostgreSQL database.
// Refer to future_changes.md for detailed steps.

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // Standard mock authentication for CognitoX out-of-the-box experience
        // In a real application, verify passwords using bcrypt/argon2.
        const email = credentials.email.toLowerCase();

        let user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          // Auto-create user for frictionless sandbox onboarding
          user = await prisma.user.create({
            data: {
              id: `user_${Math.random().toString(36).substring(2, 11)}`,
              email,
              name: email.split('@')[0],
              image: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150`
            }
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/", // Redirect to landing page for login
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "cognitox-temporary-auth-secret-123456"
};
