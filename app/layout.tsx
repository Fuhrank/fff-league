import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FFF League — Frank's Fantasy Fútbol",
  description: "48 teams. 12 owners. One champion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-line bg-elev">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="FFF League" className="h-10 w-10 sm:h-12 sm:w-12" />
              <div className="flex flex-col leading-tight">
                <span className="title-treatment text-xl sm:text-2xl">FFF LEAGUE</span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[color:var(--text-dim)]">Frank's Fantasy Fútbol</span>
              </div>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:gold-bright">Home</Link>
              <Link href="/leaderboard" className="hover:gold-bright">Leaderboard</Link>
              <Link href="/draft" className="hover:gold-bright">Draft</Link>
              <Link href="/rules" className="hover:gold-bright">Rules</Link>
              <Link href="/teams" className="hover:gold-bright">The 48</Link>
              <Link href="/today" className="hover:gold-bright">Today</Link>
              <Link href="/admin" className="hover:gold-bright text-[color:var(--text-dim)]">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-[color:var(--text-dim)]">
          <p>48 teams. 12 owners. One champion.</p>
        </footer>
      </body>
    </html>
  );
}
