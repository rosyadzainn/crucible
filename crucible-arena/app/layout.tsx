import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Crucible — Arena",
  description: "Adversarial hardening, on the record",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={jakarta.variable}
    >
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
