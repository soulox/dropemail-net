import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dropemail.net"),
  title: {
    default: "Email Header Analyzer - DropEmail.net",
    template: "%s | DropEmail.net",
  },
  description:
    "Analyze email headers for SPF, DKIM, DMARC, ARC, routing hops, TLS, spam score, and security insights.",
  keywords: [
    "email header analyzer",
    "SPF",
    "DKIM",
    "DMARC",
    "ARC",
    "email security",
    "routing",
    "Received chain",
    "TLS",
    "spam score",
    ".eml parser",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      maxSnippet: -1,
      maxImagePreview: "large",
      maxVideoPreview: -1,
    },
  },
  alternates: {
    canonical: "https://dropemail.net/",
  },
  openGraph: {
    type: "website",
    url: "https://dropemail.net/",
    siteName: "DropEmail.net",
    title: "Email Header Analyzer - DropEmail.net",
    description:
      "Parse and analyze email headers to verify SPF, DKIM, DMARC, and visualize routing with security insights.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DropEmail.net - Email Header Analyzer",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@dropemail",
    creator: "@dropemail",
    title: "Email Header Analyzer - DropEmail.net",
    description:
      "Analyze email headers (SPF, DKIM, DMARC) and routing with a modern UI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  category: "technology",
  authors: [{ name: "DropEmail.net" }],
  applicationName: "DropEmail Email Header Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'DropEmail Email Header Analyzer',
              url: 'https://dropemail.net',
              applicationCategory: 'SecurityApplication',
              operatingSystem: 'Web',
              description:
                'Analyze email headers for SPF, DKIM, DMARC, ARC, routing hops, TLS, spam score, and security insights.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              creator: {
                '@type': 'Organization',
                name: 'DropEmail.net',
                url: 'https://dropemail.net',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <GoogleAnalytics />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
