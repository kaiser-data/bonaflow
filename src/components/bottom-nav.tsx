"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/guest", label: "Guest" },
  { href: "/staff", label: "Staff" },
  { href: "/ops", label: "Operations" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="App modes">
      {links.map((link) => (
        <Link
          className={pathname.startsWith(link.href) ? "is-active" : ""}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
