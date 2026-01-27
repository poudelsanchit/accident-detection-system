import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import "./auth-types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "phone" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.BACKEND_URL}/api/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phoneNumber: credentials.phoneNumber,
                password: credentials.password,
              }),
            },
          );

          if (!response.ok) {
            return null;
          }

          const user = await response.json();

          // Return user object with accessToken that matches your User type
          return {
            id: user.id,
            phone: user.phone,
            name: user.username,
            accessToken: user.accessToken || user.token || "", // Add the missing accessToken
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
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // Save user data to token on initial sign in
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.accessToken = user.accessToken; // Add accessToken to JWT
      }
      return token;
    },
    async session({ session, token }) {
      // Add token data to session
      if (session.user) {
        session.user.id = token.id;
        session.user.phone = token.phone;
        session.user.name = token.name;
        session.user.accessToken = token.accessToken; // Add accessToken to session
      }
      return session;
    },
  },
};
