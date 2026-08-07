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
  title: "Yeulumin AI | Design and Print T-Shirts | Custom T-Shirt Printing",
  description: "Design and print t-shirts with AI at Yeulumin. Premium custom t-shirt printing and personalised t-shirt printing with interactive 3D preview and worldwide shipping.",
  keywords: [
    "design and print t shirts",
    "custom t shirt printing",
    "personalised t shirt printing",
    "personalized t shirt printing",
    "custom t-shirt design",
    "AI Custom T-Shirts",
    "Cyberpunk Apparel",
    "Three.js 3D Mannequin",
    "Futuristic Streetwear",
    "Yeulumin AI",
  ],
  authors: [{ name: "Yeulumin AI Team" }],
  openGraph: {
    title: "Yeulumin AI | Design and Print T-Shirts | Custom T-Shirt Printing",
    description: "Design and print t-shirts with AI at Yeulumin. Premium custom t-shirt printing and personalised t-shirt printing.",
    type: "website",
  },
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#f5f5f5] antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
