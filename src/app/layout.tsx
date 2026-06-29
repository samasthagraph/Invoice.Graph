import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Antigravity Invoice & Quotation Portal",
  description: "Internal company invoice and quotation generator dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-slate-50 text-slate-900 font-sans">
        <div className="flex flex-col lg:flex-row w-full min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
