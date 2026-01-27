import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import "./auth-types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "phone" }, //root1@gmail.com
        password: { label: "Password", type: "password" }, // rootpassword1
      },
      // check in database
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
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
                phone: credentials.phone,
                password: credentials.password,
              }),
            },
          );
          if (!response.ok) {
            return null;
          }

          const user = await response.json();

          // Return user object that will be stored in JWT
          return {
            id: user.id,
            phone: user.phone,
            name: user.username,
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
      }
      return token;
    },
    async session({ session, token }) {
      // Add token data to session
      if (session.user) {
        session.user.id = token.id;
        session.user.phone = token.phone;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
