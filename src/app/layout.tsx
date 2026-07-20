import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://socialpost.app";
const TITLE = "SocialPost — Gerencie todas as suas redes sociais";
const DESCRIPTION =
  "Agende posts, responda mensagens e analise resultados para Instagram, X, Facebook, LinkedIn, TikTok e mais — tudo em um único lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | SocialPost",
  },
  description: DESCRIPTION,
  keywords: [
    "gerenciador de redes sociais",
    "agendamento de posts",
    "social media management",
    "instagram scheduler",
    "twitter scheduler",
    "linkedin scheduler",
    "social media analytics",
  ],
  authors: [{ name: "SocialPost" }],
  creator: "SocialPost",
  publisher: "SocialPost",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: BASE_URL,
    siteName: "SocialPost",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SocialPost — Gerencie todas as suas redes sociais",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
