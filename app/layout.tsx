import type { Metadata } from "next";
import "./globals.css";

const description =
  "Personal tracker for a 151-card Japanese Pokémon TCG wishlist — one full-art / alt-art print for each original Kanto Pokémon. Import Cardmarket shipments, watch the collection fill in, and print binder placeholders.";

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pokédex 151 full-art",
    template: "%s · Pokédex 151",
  },
  description,
  openGraph: {
    title: "Pokédex 151 full-art",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pokédex 151 full-art",
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
