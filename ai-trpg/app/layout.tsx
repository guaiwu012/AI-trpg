import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI TRPG Demo",
  description: "A suspense text RPG with AI narration, NPC replies, and dice rolls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}