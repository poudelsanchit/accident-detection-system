import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import "./auth-types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone Number", type: "phone" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phoneNumber: credentials.phone,
                password: credentials.password,
              }),
            }
          );

          if (!response.ok) return null;

          const data = await response.json();

          return {
            id: data.userId,
            phone: data.phoneNumber,
            name: data.fullName || "",
            accessToken: data.token || "",
            isVerified: data.isVerified || false,
          };
        } catch (error) {
          console.log("Authentication Error", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 60, // refresh token every 60 seconds
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1) Initial sign in
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.isVerified = user.isVerified;
        token.accessToken = user.accessToken;
      }

      // 2) Client-triggered update (e.g. after OTP verification on /verification page)
      if (trigger === "update" && session && typeof session === "object" && "isVerified" in session) {
        token.isVerified = !!session.isVerified;
      }

      // 3) On every request, refresh isVerified from backend (when not from client update)
      if (token.accessToken && trigger !== "update") {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/current-user-status`,
            {
              headers: {
                Authorization: token.accessToken,
                "Content-Type": "application/json",
              },
            }
          );

          if (res.ok) {
            const latest = await res.json();
            token.isVerified = latest.isVerified;
          }
        } catch (error) {
          console.log("Failed to refresh isVerified status:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.phone = token.phone;
        session.user.name = token.name;
        session.user.isVerified = token.isVerified;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
};
