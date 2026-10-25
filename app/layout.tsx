import type { Metadata } from "next";
import { binders } from "@/lib/data";
import { SITE_TITLE, siteDescription } from "@/lib/binders";
import "./globals.css";

const description = siteDescription(binders);

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s · Pokémon binders",
  },
  description,
  openGraph: {
    title: SITE_TITLE,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
