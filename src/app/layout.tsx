import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Marius - portfolio", template: "%s - Marius" },
  description: "Sideprosjekter, eksperimenter og ting jeg ikke klarte å la være.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
