import type { Metadata } from "next";
import "./globals.css";

const description =
  "Personal tracker for Japanese Pokémon TCG binders — a full-art Kanto 151 wishlist and the 30th CELEBRATION master set. Log Cardmarket shipments and booster pulls, watch each binder fill in, and print placeholder sheets.";

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pokémon card binders",
    template: "%s · Pokémon binders",
  },
  description,
  openGraph: {
    title: "Pokémon card binders",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pokémon card binders",
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
