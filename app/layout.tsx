import "./globals.css";

import type { Metadata } from "next";
import Script from "next/script";

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
      <Script id="gtm-head" strategy="afterInteractive">
        {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KLWGWHQH');
          `}
      </Script>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KLWGWHQH"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {children}
      </body>
    </html>
  );
}
