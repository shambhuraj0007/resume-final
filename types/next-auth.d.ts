import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionStatus?: string | null;
      subscriptionProvider?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    subscriptionStatus?: string | null;
    subscriptionProvider?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionStatus?: string | null;
  }
}
