import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import PersonaQuintet from "@/components/landing/PersonaQuintet";
import BlogRoll from "@/components/landing/BlogRoll";
import Newsletter from "@/components/landing/Newsletter";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import CitationsFeed from "@/components/landing/CitationsFeed";
import FAQ from "@/components/landing/FAQ";
import ContactForm from "@/components/landing/ContactForm";
import SystemLogs from "@/components/landing/SystemLogs";

/**
 * "/" route — V2-1.
 *
 * Deliberately not "use client": every section component below already
 * carries its own "use client" directive (they all use hooks internally), so
 * this file doesn't need one itself — a Server Component can compose Client
 * Components as ordinary children without becoming client itself. Keeping
 * the boundary here maximizes what Next.js can server-render.
 *
 * Hero no longer takes an onTriggerAction prop. It did in V1 (App.tsx owned
 * the handler and passed it down), but a Server Component can't hand a plain
 * closure to a Client Component as a prop — only Server Actions cross that
 * boundary, and scrollIntoView() isn't one. Hero now owns its own copy of the
 * same three lines internally instead of receiving them from here.
 *
 * Section order matches the V2 doc's §4.1 component table exactly (Hero →
 * HowItWorks → PersonaQuintet → BlogRoll → Newsletter → Pricing → Testimonials → CitationsFeed →
 * FAQ → ContactForm → SystemLogs), which also matches what the original
 * App.tsx already rendered — no reordering.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PersonaQuintet />
      <BlogRoll />
      <Newsletter />
      <Pricing />
      <Testimonials />
      <CitationsFeed />
      <FAQ />
      <ContactForm />
      <SystemLogs />
    </>
  );
}
