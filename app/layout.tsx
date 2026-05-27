import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forge - YouTube Content Processing",
  description: "Turn YouTube videos into newsletters, LinkedIn posts, and short-form scripts."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
