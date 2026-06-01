import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { APP_NAME } from "@/lib/safety-copy";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Explore campaign money, committee relationships, bills, votes, and explainable transparency signals."
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
