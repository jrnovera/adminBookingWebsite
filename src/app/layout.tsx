import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
import { ShopProvider } from "@/lib/shop";
import { PageVisibilityProvider } from "@/lib/pageVisibility";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salon Spa Admin",
  description: "Salon and spa management dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <ShopProvider>
            <PageVisibilityProvider>
              <AppShell>{children}</AppShell>
            </PageVisibilityProvider>
          </ShopProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
