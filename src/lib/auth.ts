import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyFirebaseIdToken } from "./firebase-verify";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "FirebaseToken",
      credentials: {
        idToken: { label: "ID Token", type: "text" }
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (!idToken) {
          throw new Error("Authentication failed: Missing Firebase ID Token");
        }

        try {
          // Cryptographically verify the client-side Firebase ID token using Google public JWKS keys
          const payload = await verifyFirebaseIdToken(idToken);
          const { uid, email, name, picture } = payload;

          if (!email) {
            throw new Error("Authentication failed: Email claim missing from token");
          }

          // 1. Look up user by verified Firebase UID
          let user = await prisma.user.findUnique({
            where: { firebaseUid: uid }
          });

          if (!user) {
            // 2. Fallback: Check if user exists with matching email
            user = await prisma.user.findUnique({
              where: { email }
            });

            if (user) {
              // Link existing account with Firebase UID
              user = await prisma.user.update({
                where: { id: user.id },
                data: { firebaseUid: uid }
              });
            } else {
              // 3. Create a new user record in MongoDB
              user = await prisma.user.create({
                data: {
                  firebaseUid: uid,
                  email,
                  name: name || email.split('@')[0],
                  image: picture || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150`
                }
              });
            }
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image
          };
        } catch (error: any) {
          console.error("NextAuth Firebase authorize error:", error);
          throw new Error(error.message || "Invalid authentication credentials");
        }
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
