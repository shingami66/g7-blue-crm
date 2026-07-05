import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { getDirection, getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "G7 BLUE CRM",
  description: "G7 BLUE Enterprise CRM — Events | Exhibitions | Production | Logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getLocale();
  const direction = getDirection(locale);

  return (
    <ClerkProvider>
      <html lang={locale} dir={direction} className="h-full antialiased">
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
