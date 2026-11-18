import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

// Only comes in weight 400; globals.css turns off faux bold for font-serif.
const dmSerif = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Marius - portfolio", template: "%s - Marius" },
  description: "Sideprosjekter, eksperimenter og ting jeg ikke klarte å la være.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} data-scroll-behavior="smooth" className={`${dmSerif.variable} ${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
