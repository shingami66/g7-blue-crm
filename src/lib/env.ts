import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
});

const clerkWebhookEnvSchema = z.object({
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClerkWebhookEnv = z.infer<typeof clerkWebhookEnvSchema>;

function failInvalidEnv(scope: "public" | "server", error: z.ZodError) {
  const invalidKeys = error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  console.error(`Invalid ${scope} environment variables: ${invalidKeys}`);
  throw new Error(`Invalid ${scope} environment variables`);
}

function parseEnv<T>(
  scope: "public" | "server",
  schema: z.ZodType<T>,
  values: Record<string, unknown>
): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    failInvalidEnv(scope, result.error);
  }

  return result.data as T;
}

export const publicEnv: PublicEnv = parseEnv("public", publicEnvSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
});

let cachedServerEnv: ServerEnv | null = null;
let cachedClerkWebhookEnv: ClerkWebhookEnv | null = null;

function assertServerOnlyEnvAccess() {
  if (typeof window !== "undefined") {
    throw new Error(
      "Server environment variables must not be accessed in the browser."
    );
  }
}

export function getServerEnv(): ServerEnv {
  assertServerOnlyEnvAccess();

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = parseEnv("server", serverEnvSchema, {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  });

  return cachedServerEnv;
}

export function getClerkWebhookEnv(): ClerkWebhookEnv {
  assertServerOnlyEnvAccess();

  if (cachedClerkWebhookEnv) {
    return cachedClerkWebhookEnv;
  }

  cachedClerkWebhookEnv = parseEnv("server", clerkWebhookEnvSchema, {
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
  });

  return cachedClerkWebhookEnv;
}
