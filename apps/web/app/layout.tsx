import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { urbaneRounded } from "./fonts/config";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-context";
import { SupabaseRealtimeProvider } from "@/providers/supabase-realtime-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Glaze - The Agentic Spreadsheet",
  description: "An open-source Freckle.io alternative that enriches your data with transparent, streaming AI workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${urbaneRounded.variable} ${jetbrainsMono.variable}`}>
        <AuthProvider>
          <QueryProvider>
            <SupabaseRealtimeProvider>
              {children}
              <Toaster />
            </SupabaseRealtimeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

