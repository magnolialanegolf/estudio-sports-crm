import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Estudio Sports · CRM comercial", template: "%s · Estudio Sports" },
  description: "Portal de control comercial de Estudio Sports.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
