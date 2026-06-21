import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Bebas_Neue } from "next/font/google";
import NavMenu from "./NavMenu";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Owner's League — Draft the Teams, Own the League",
  description: "Draft the Teams, Own the League. 48 teams. 20 owners. One champion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bebas.variable} min-h-screen`}>
        <header className="border-b border-line bg-elev">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo-v2.png" alt="Owner's League" className="h-12 w-12 sm:h-14 sm:w-14" />
              <div className="flex flex-col leading-tight">
                <span className="title-treatment text-xl sm:text-2xl">OWNER&apos;S LEAGUE</span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[color:var(--text-dim)]">Draft the Teams, Own the League</span>
              </div>
            </Link>
            <NavMenu />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-[color:var(--text-dim)]">
          <p>48 teams. 20 owners. One champion.</p>
        </footer>
      </body>
    </html>
  );
}
