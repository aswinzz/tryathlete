import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "TryAthlete — The training data layer for your AI",
  description:
    "Not another AI app. TryAthlete connects Strava, WHOOP, and Garmin to ChatGPT or Claude — giving your AI real training data to work with.",
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
        <NextTopLoader
          color="#c8ff00"
          height={2}
          showSpinner={false}
          shadow="0 0 8px #c8ff00"
        />
        {children}
      </body>
    </html>
  );
}
