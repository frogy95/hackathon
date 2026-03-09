import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "해커톤 평가 시스템",
  description: "AI-Native 해커톤 참가자 제출 및 평가 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col bg-zinc-50">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
