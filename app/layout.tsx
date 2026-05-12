import type { Metadata } from "next";
import { Permanent_Marker } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const marker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Can I Live There?",
  description:
    "Compare take-home pay, housing, and spending across cities. Your comparison is stored locally in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={marker.variable}>
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
