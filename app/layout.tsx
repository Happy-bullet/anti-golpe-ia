import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./globals.css";
import Navegacao from "@/components/Navegacao";
import RegistrarSW from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: { default: "Anti-Golpe IA", template: "%s | Anti-Golpe IA" },
  description: "Recebeu uma mensagem estranha? Cole aqui. Em segundos você sabe se é golpe e por quê.",
  applicationName: "Anti-Golpe IA",
  appleWebApp: { capable: true, title: "Anti-Golpe IA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F3A93",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Navegacao />
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
