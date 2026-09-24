import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@pals/design-tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pals · Moderation",
  description: "Private local moderation workspace.",
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
