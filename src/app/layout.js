import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Arena do Conhecimento",
  description: "Quiz em tempo real para sala de aula",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col relative`}
      >
        <main className="flex-grow">
          {children}
        </main>
        <footer className="w-full py-4 text-center text-slate-500 text-sm border-t border-slate-100 bg-transparent z-50">
          <div className="container mx-auto px-4">
            <p className="mb-0.5">Desenvolvido por <strong>Diego de Andrade Bezerra</strong></p>
            <p>© 2026 – Todos os direitos reservados. | Contato: <a href="mailto:diegoab@gmail.com" className="hover:text-[var(--arena-primary)] transition-colors">diegoab@gmail.com</a></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
