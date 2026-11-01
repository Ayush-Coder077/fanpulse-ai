import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FanPulse AI — Your Live Cricket Companion",
  description: "Understand every moment of the match with private, browser-based AI."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
