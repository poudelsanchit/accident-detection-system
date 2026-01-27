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
        console.log(credentials)
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phoneNumber: credentials.phone,
                password: credentials.password,
              }),
            },
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            console.log("Login error:", errorData);
            return null;
          }

          const data = await response.json();
          console.log("Login response:", data);

          // Map backend response fields to frontend user object
          // Backend returns: { token, userId, phoneNumber, fullName }
          return {
            id: data.userId,
            phone: data.phoneNumber,
            name: data.fullName || "",
            accessToken: data.token || "",
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
