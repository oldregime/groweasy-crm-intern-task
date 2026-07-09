import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrowEasy | AI-Powered CSV Importer",
  description: "Intelligently extract and map CRM leads from any CSV format using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
