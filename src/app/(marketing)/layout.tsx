"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import SearchPalette from "@/components/landing/SearchPalette";
import { ChevronUp } from "lucide-react";

/**
 * Marketing route group layout — V2-1.
 *
 * Owns the scroll-progress bar, active-section tracking, and
 * handleScrollToSection — all ported from App.tsx's root component, which
 * previously owned both the chrome (Navbar, SearchPalette, footer) AND the
 * section content in one file. Split here: this layout owns the chrome, and
 * app/(marketing)/page.tsx owns just the section content as `children`.
 *
 * This works because the scroll listener queries the DOM by element id
 * (document.getElementById(sectionId)) rather than depending on a parent-child
 * React relationship — Next.js renders this layout and the page's section
 * elements into the same DOM tree, so the id lookup finds them exactly as it
 * did when everything lived in one component.
 *
 * Route-group scoped (not the root layout) deliberately: this Navbar's
 * scroll-spy logic is specific to the marketing page's section ids (hero,
 * personas, blog, ...) and doesn't generalize to future authenticated app
 * routes, which will get their own (app) layout with the command-rail header
 * already used in ChallengeChamber.tsx / BillingDashboard.tsx — not this one.
 *
 * SearchPalette lives here (global within the marketing group) per §4.4.
 * SystemLogs does NOT — despite §4.4 also calling it "global," §4.1's own
 * component table positions it as "Section 9," and that's what the actual
 * App.tsx implementation already did (rendered inside <main>, not as an
 * overlay). Follows the table + the shipped behavior over the one contradictory
 * sentence — SystemLogs stays in page.tsx as the last section.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState("hero");
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const sections = ["hero", "personas", "blog", "testimonials", "citations", "faq", "contact"];

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }

      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-cotton-lace selection:bg-gold-crust selection:text-obsidian flex flex-col justify-between">

      {/* Fixed top-level Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-border-structural/20 z-[100] pointer-events-none">
        <div
          className={`h-full bg-gold-crust transition-all duration-75 ease-out ${
            scrollProgress >= 98 ? "animate-gold-pulse" : ""
          }`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Structural Scanline overlay matching the Brutalist visual spec */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-10 z-50"></div>

      {/* Command Palette Search Modal */}
      <SearchPalette />

      {/* Persistent Navigation Frame */}
      <Navbar onScrollToSection={handleScrollToSection} activeSection={activeSection} />

      {/* Main Canvas Segment — section content supplied by page.tsx */}
      <main className="flex-grow pt-14">
        {children}
      </main>

      {/* Brutalist Footer layout with strict uppercase typography and structural border gaps */}
      <footer className="bg-obsidian border-t border-border-structural py-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">

          {/* Brand block */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg width="20" height="22" viewBox="0 0 120 132" aria-hidden="true" className="text-cotton-lace">
                <rect x="20" y="20" width="80" height="3" fill="currentColor"/>
                <rect x="28" y="38" width="64" height="3" fill="currentColor"/>
                <rect x="36" y="56" width="48" height="3" fill="currentColor"/>
                <rect x="43" y="74" width="34" height="3" fill="currentColor"/>
                <rect x="49" y="92" width="22" height="3" fill="currentColor"/>
                <rect x="59" y="98" width="2" height="12" fill="currentColor" opacity=".55"/>
                <rect x="52" y="112" width="16" height="11" fill="#C9A24B"/>
              </svg>
              <span className="font-mono text-sm tracking-widest text-cotton-lace uppercase">
                CONTENT <span className="text-gold-crust">STORM</span>
              </span>
            </div>
            <p className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider">
              © 2026 CONTENT STORM. ALL DISPATCHES REGISTERED. FRICTION IS THE FEATURE.
            </p>
          </div>

          {/* Links block */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 font-mono text-[9px] text-cotton-muted uppercase tracking-widest">
            <button
              onClick={() => handleScrollToSection("hero")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              TERMINAL_INDEX
            </button>
            <button
              onClick={() => handleScrollToSection("personas")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              PROTOCOL_VECTORS
            </button>
            <button
              onClick={() => handleScrollToSection("blog")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              BREVITIES
            </button>
            <button
              onClick={() => handleScrollToSection("citations")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              RADAR_CITATIONS
            </button>
            <button
              onClick={() => handleScrollToSection("faq")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              DIALECTIC_FAQ
            </button>
            <button
              onClick={() => handleScrollToSection("contact")}
              className="hover:text-gold-crust hover:underline transition-all cursor-pointer"
            >
              TRANSMIT_INQUIRY
            </button>
          </div>

          {/* Top of frame button */}
          <div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="border border-border-structural p-2.5 hover:border-gold-crust hover:text-gold-crust transition-all cursor-pointer uppercase font-mono text-[8px] tracking-widest flex items-center gap-1.5"
            >
              REBOOT_FRAME
              <ChevronUp size={12} />
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
