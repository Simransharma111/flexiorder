import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Workflow from "../components/landing/Workflow";
import Features from "../components/landing/Features";
import Contact from "../components/landing/Contact";

export default function LandingPage() {
  return (
    <div className="bg-canvas font-sans text-ink">
      <Navbar />
      <main>
        <Hero />
        <Workflow />
        <Features />
        <Contact />
      </main>
      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto flex max-w-content flex-col items-start justify-between gap-3 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-card bg-brand text-sm font-extrabold text-white">
              F
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">FlexiOrder</p>
              <p className="text-xs text-ink-disabled">
                QR ordering and kitchen workflow
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer">
            <a href="#features" className="text-xs font-semibold text-ink-secondary hover:text-ink">
              Features
            </a>
            <a href="#workflow" className="text-xs font-semibold text-ink-secondary hover:text-ink">
              How it works
            </a>
            <a href="#contact" className="text-xs font-semibold text-ink-secondary hover:text-ink">
              Contact
            </a>
            <a href="/login" className="text-xs font-semibold text-ink-secondary hover:text-ink">
              Login
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
