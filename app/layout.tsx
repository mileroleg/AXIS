import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "hh-keywords",
  description: "Local HH vacancies keyword extractor"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">Search</Link>
            <Link href="/favorites">Favorites</Link>
            <Link href="/summary">Summary</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
