import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://your-domain.com"), // ←本番ドメイン
  title: {
    default: "JOKER — Safe project dumps for AI",
    template: "%s · JOKER",
  },
  description:
    "JOKER converts your project into clean, safe text dumps (masked & organized) so AI can understand your app quickly.",
  keywords: [
    "AI code context",
    "project dump tool",
    "Next.js",
    "source code summarizer",
    "mask secrets",
    "software documentation",
  ],
  openGraph: {
    type: "website",
    url: "https://your-domain.com",
    siteName: "JOKER",
    title: "JOKER — Safe project dumps for AI",
    description:
      "Upload your repo, get clean text dumps (masked & categorized). Share safely with AI.",
    images: [{ url: "/ogp.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JOKER — Safe project dumps for AI",
    description:
      "Upload your repo → get safe text dumps → give AI full context.",
    images: ["/ogp.png"],
  },
  alternates: {
    canonical: "https://your-domain.com",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
