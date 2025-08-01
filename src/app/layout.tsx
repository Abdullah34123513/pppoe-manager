import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "PPPoE Manager - MikroTik Router Management",
  description: "Manage PPPoE users across multiple MikroTik routers with automatic expiration enforcement",
  keywords: ["PPPoE", "MikroTik", "RouterOS", "Network Management", "ISP"],
  authors: [{ name: "PPPoE Manager" }],
  openGraph: {
    title: "PPPoE Manager",
    description: "Manage PPPoE users across multiple MikroTik routers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
