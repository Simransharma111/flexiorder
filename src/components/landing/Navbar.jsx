import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX, FiArrowRight } from "react-icons/fi";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#workflow" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/75 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}

        <Link
          to="/"
          className="flex items-center gap-3 text-white font-bold text-2xl"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
            F
          </div>

          <div>
            <div>FlexiOrder</div>
            <div className="text-xs font-normal text-slate-400">
              Hospitality Platform
            </div>
          </div>
        </Link>

        {/* Desktop */}

        <nav className="hidden items-center gap-10 lg:flex">
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-slate-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Actions */}

        <div className="hidden items-center gap-4 lg:flex">

          <Link
            to="/login"
            className="text-slate-300 hover:text-white transition"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Start Free Trial

            <FiArrowRight />
          </Link>

        </div>

        {/* Mobile */}

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white lg:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <FiX size={26} /> : <FiMenu size={26} />}
        </button>

      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-slate-950 lg:hidden">

          <div className="flex flex-col px-6 py-6">

            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="py-3 text-slate-300"
              >
                {item.label}
              </a>
            ))}

            <Link
              to="/login"
              className="mt-4 py-3 text-slate-300"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="mt-3 rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white"
            >
              Start Free Trial
            </Link>

          </div>

        </div>
      )}
    </header>
  );
}
