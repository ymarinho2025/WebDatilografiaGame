import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartas para o Farol Online",
  description: "Jogo web multiplayer de datilografia com salas online, bots e suporte mobile."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
