import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./components/client/ServiceWorkerRegister";
import AppSplash from "./components/client/AppSplash";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BayanAlert",
  description: "Community Emergency Reporting & Response System for Brgy Sta Rita",
  icons: {
    icon: "/app-logo.ico",
    apple: "/app-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4AA00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BayanAlert" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg-gray)] text-[var(--text)]">
        <AppSplash />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
