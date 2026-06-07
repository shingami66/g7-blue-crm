import type { Metadata } from "next";
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
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
