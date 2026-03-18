import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import RouteLoader from "@/components/RouteLoader";
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "NisabFlow — The private, precise Zakat dashboard.",
  description:
    "Calculate your Zakat with precision using Islamic fiqh rules, retirement deductions, and live market data. Sheet-backed for full transparency.",
  keywords: ["zakat", "calculator", "islamic", "finance", "halal"],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", plusJakartaSans.variable)}>
      <body className={`font-sans antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <RouteLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
