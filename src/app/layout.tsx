import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FetchDogBg } from "@/components/FetchDogBg";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { site } from "@/content/site";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: site.title,
  description: site.description,
  icons: {
    icon: "/hosky-mark.png",
    apple: "/hosky-mark.png",
  },
  openGraph: {
    title: site.title,
    description: site.description,
    images: ["/hosky-mark.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col font-sans">
        <FetchDogBg />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 sm:px-6">
            {children}
          </main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
