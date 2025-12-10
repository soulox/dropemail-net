import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_NAME, SITE_URL, SITE_DISPLAY_NAME, TWITTER_HANDLE } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Email Header Analyzer - ${SITE_DISPLAY_NAME}`,
    template: `%s | ${SITE_DISPLAY_NAME}`,
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
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: SITE_DISPLAY_NAME,
    title: `Email Header Analyzer - ${SITE_DISPLAY_NAME}`,
    description:
      "Parse and analyze email headers to verify SPF, DKIM, DMARC, and visualize routing with security insights.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_DISPLAY_NAME} - Email Header Analyzer`,
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: `Email Header Analyzer - ${SITE_DISPLAY_NAME}`,
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
  authors: [{ name: SITE_DISPLAY_NAME }],
  applicationName: `${SITE_NAME} Email Header Analyzer`,
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
              name: `${SITE_NAME} Email Header Analyzer`,
              url: SITE_URL,
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
                name: SITE_DISPLAY_NAME,
                url: SITE_URL,
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
