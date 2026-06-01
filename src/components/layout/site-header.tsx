import Link from "next/link";
import { APP_NAME } from "@/lib/safety-copy";

const navItems = [
  { href: "/signals", label: "Signals" },
  { href: "/methodology", label: "Methodology" },
  { href: "/sources", label: "Sources" },
  { href: "/about", label: "About" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-shell site-header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-mark-kicker">Public records explorer</span>
          <span className="brand-mark-title">{APP_NAME}</span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

