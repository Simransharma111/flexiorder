import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Workflow from "../components/landing/Workflow";
import Features from "../components/landing/Features";
import Contact from "../components/landing/Contact";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Workflow />
      <Features />
      <Contact />
    </>
  );
}