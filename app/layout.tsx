import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ebook Reader",
  description: "Import local EPUB and PDF books into a tactile reader with offline storage."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
