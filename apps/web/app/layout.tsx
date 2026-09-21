import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@pals/design-tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pals",
  description:
    "Pals is taking shape at UNC. A place to find a Hangout and make time for each other.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
