import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
    }
  },
  user: {
    additionalFields: {
      encrypted_auth: {
        type: "string",
        required: false,
      },
      auth_uploaded_at: {
        type: "date",
        required: false,
      },
    },
  },
});
