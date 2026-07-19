import type { Metadata } from "next";
import { Bagel_Fat_One, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bagelFatOne = Bagel_Fat_One({
  variable: "--font-bagel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NadPay — payroll in one link",
  description:
    "Preset your team, fund the payout with one approval, drop one claim link in the chat. Recurring crypto payroll on Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bagelFatOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
