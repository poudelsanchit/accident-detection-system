import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    phone: string;
    name: string;
    accessToken: string;
  }

  interface Session {
    user: {
      id: string;
      phone: string;
      name: string;
      accessToken: string;
    } & DefaultSession["user"];
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone: string;
    name: string;
    accessToken: string; 
  }
}
