import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@pals/design-tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pals Admin",
  description:
    "The Pals team workspace is being built. Moderation tools are not available yet.",
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
