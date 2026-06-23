import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TryAthlete — Make every workout instagrammable",
  description:
    "Connect Garmin, track your runs, and share beautiful receipt-style workout cards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">{children}</div>
      </body>
    </html>
  );
}
