import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartas para o Farol",
  description: "Jogo web de datilografia com máquina de escrever, roleta, bots e barra de progresso."
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
