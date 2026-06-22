import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().optional(),
    AUTH_DISCORD_ID: z.string().optional(),
    AUTH_DISCORD_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
    // Contact form email (Resend). Only RESEND_API_KEY is required to send.
    RESEND_API_KEY: z.string().optional(),
    CONTACT_TO: z.string().optional(),
    CONTACT_FROM: z.string().optional(),
  },

  client: {},

  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_TO: process.env.CONTACT_TO,
    CONTACT_FROM: process.env.CONTACT_FROM,
  },
});
