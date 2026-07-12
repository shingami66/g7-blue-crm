import "server-only";

import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { cache } from "react";
import { getCurrentUserLocale } from "@/lib/auth/permissions";
import { getLocale, isSupportedLocale, type Locale } from "./locales";

const SESSION_LOCALE_COOKIE = "g7_session_locale";
const SESSION_BINDING_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_LOCALE_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

type SessionLocaleOverride = {
  locale: Locale;
  sessionBinding: string;
};

function getSessionBinding(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("base64url");
}

async function getCurrentSessionBinding(): Promise<string | null> {
  const { sessionId, userId } = await auth();
  return userId && sessionId ? getSessionBinding(sessionId) : null;
}

function parseSessionLocaleOverride(value: string | undefined): SessionLocaleOverride | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("locale" in parsed) ||
      !("sessionBinding" in parsed) ||
      !isSupportedLocale(parsed.locale) ||
      typeof parsed.sessionBinding !== "string" ||
      !SESSION_BINDING_PATTERN.test(parsed.sessionBinding)
    ) {
      return null;
    }

    return parsed as SessionLocaleOverride;
  } catch {
    return null;
  }
}

async function getCurrentSessionLocaleOverride(): Promise<Locale | null> {
  const sessionBinding = await getCurrentSessionBinding();

  if (!sessionBinding) {
    return null;
  }

  const cookieStore = await cookies();
  const override = parseSessionLocaleOverride(cookieStore.get(SESSION_LOCALE_COOKIE)?.value);

  return override?.sessionBinding === sessionBinding ? override.locale : null;
}

export const getCurrentSessionEffectiveLocale = cache(async (): Promise<Locale> => {
  const persistedLocale = await getCurrentUserLocale();
  return (await getCurrentSessionLocaleOverride()) ?? persistedLocale;
});

/**
 * Public / pre-activation locale for surfaces that must not require an active
 * `app_users` row (e.g. root `<html>` for inactive/missing users, `/unauthorized`).
 *
 * Resolution:
 * 1. Valid current-session locale cookie bound to the same Clerk session (if any)
 * 2. Public default via `getLocale()` (English)
 *
 * Does not call `getCurrentUserLocale`, `requireUser`, or any database query.
 * Does not create a new persistence path.
 */
export const getPublicRequestLocale = cache(async (): Promise<Locale> => {
  return (await getCurrentSessionLocaleOverride()) ?? getLocale();
});

export async function setCurrentSessionLocaleOverride(locale: unknown): Promise<void> {
  if (!isSupportedLocale(locale)) {
    throw new Error("Unsupported locale override");
  }

  await getCurrentUserLocale();
  const sessionBinding = await getCurrentSessionBinding();

  if (!sessionBinding) {
    throw new Error("Authenticated session required");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_LOCALE_COOKIE,
    JSON.stringify({ locale, sessionBinding }),
    SESSION_LOCALE_COOKIE_OPTIONS,
  );
}

export async function clearCurrentSessionLocaleOverride(): Promise<void> {
  await getCurrentUserLocale();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_LOCALE_COOKIE);
}
