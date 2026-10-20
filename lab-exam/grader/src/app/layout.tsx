import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Condo Portal Grader",
  description: "Practice lab exam grader — Smart Condo & Apartment Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="sunset">
      <body className="min-h-screen bg-base-200">{children}</body>
    </html>
  );
}
