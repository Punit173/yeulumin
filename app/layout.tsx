import type { Metadata } from "next";
import { Orbitron, Sora } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yeulumin AI | Futuristic Custom Streetwear",
  description: "Wear your imagination. Create bespoke AI-designed T-shirts, interact with custom clothing on a 3D showroom mannequin, and order streetwear shipped worldwide.",
  keywords: ["AI Custom T-Shirts", "Cyberpunk Apparel", "Three.js 3D Mannequin", "Futuristic Streetwear", "Yeulumin AI"],
  authors: [{ name: "Yeulumin AI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${sora.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#f5f5f5] antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
