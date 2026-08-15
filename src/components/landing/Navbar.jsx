import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? "border-hairline shadow-card" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          aria-label="FlexiOrder home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-card bg-brand text-lg font-extrabold text-white">
            F
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink">
            FlexiOrder
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-ink-secondary transition hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="rounded-card px-4 py-2 text-sm font-bold text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-card bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-strong"
          >
            Register
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="grid h-11 w-11 place-items-center rounded-card text-ink md:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-hairline bg-white md:hidden">
          <nav className="flex flex-col px-4 py-3" aria-label="Mobile">
            {LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-card px-3 py-3 text-sm font-semibold text-ink-secondary hover:bg-subtle hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 pb-2">
              <Link
                to="/login"
                className="rounded-card border border-hairline px-4 py-3 text-center text-sm font-bold text-ink"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-card bg-brand px-4 py-3 text-center text-sm font-bold text-white"
              >
                Register
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
