import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getCurrentAppUser } from "@/lib/auth/permissions";
import { getDirection } from "@/lib/i18n";
import {
  getCurrentSessionEffectiveLocale,
  getPublicRequestLocale,
} from "@/lib/i18n/session-locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "G7 BLUE CRM",
  description: "G7 BLUE Enterprise CRM — Events | Exhibitions | Production | Logistics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appUser = await getCurrentAppUser();
  // Active members: session override → persisted app_users.locale.
  // Inactive/missing app_users: public session cookie only → English default (no DB).
  const locale = appUser?.is_active
    ? await getCurrentSessionEffectiveLocale()
    : await getPublicRequestLocale();
  const direction = getDirection(locale);

  return (
    <ClerkProvider>
      <html lang={locale} dir={direction} className="h-full antialiased">
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
