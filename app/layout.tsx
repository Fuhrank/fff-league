import type { Metadata } from "next";
import Link from "next/link";
import NavMenu from "./NavMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Owner's League — Draft the Teams, Own the League",
  description: "Draft the Teams, Own the League. 48 teams. 12 owners. One champion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-line bg-elev">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Owner's League" className="h-10 w-10 sm:h-12 sm:w-12" />
              <div className="flex flex-col leading-tight">
                <span className="title-treatment text-xl sm:text-2xl">OWNER&apos;S LEAGUE</span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[color:var(--text-dim)]">Draft the Teams, Own the League</span>
              </div>
            </Link>
            <NavMenu />
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
