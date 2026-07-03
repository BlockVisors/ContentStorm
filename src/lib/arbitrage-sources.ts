import { JSDOM } from "jsdom";

/**
 * External source adapters — Curriculum Arbitrage Engine (V2-6).
 *
 * Four real public APIs, matching the source spec's four monitored channels
 * (GitHub security advisories, patent registries, academic journals,
 * regulatory databases). NEWS stays defined in ArbitrageSourceType (schema)
 * for manual/future use, but isn't implemented here — every mainstream news
 * API worth using requires a paid key, and fabricating an integration
 * against credentials nobody has would be worse than leaving the gap
 * explicit. The other four are keyless or use a documented, already-
 * established-in-this-project auth pattern:
 *
 *   GitHub Advisories — api.github.com/advisories, keyless (optional
 *     GITHUB_TOKEN raises the rate limit from 60/hr to 5000/hr) — verified
 *     live against the real endpoint during development.
 *   arXiv — export.arxiv.org/api/query, keyless, Atom XML (parsed with
 *     jsdom, already a project dependency — no new package needed).
 *   Federal Register — federalregister.gov/api/v1, keyless, plain JSON.
 *   PatentsView — search.patentsview.org/api/v1/patent, X-Api-Key header,
 *     PATENTSVIEW_API_KEY env var — same endpoint and auth pattern this
 *     project's own patent-search skill already documents.
 *
 * Every adapter takes free-text keywords (derived from the module's title —
 * see src/lib/arbitrage.ts) and returns a normalized list; none of these
 * APIs support the kind of semantic "is this relevant to my module" search
 * a topic needs, so keyword pre-filtering happens here and the real
 * relevance judgment happens downstream via embeddings + Claude, same
 * two-stage split as the Drift Dashboard (V2-4).
 */

export interface ExternalSourceItem {
  sourceUrl:   string;
  sourceType:  "GITHUB_ADVISORY" | "ACADEMIC_JOURNAL" | "REGULATORY_UPDATE" | "PATENT";
  title:       string;
  excerpt:     string; // the actual text used for embedding + as rewrite grounding — not just a link
  publishedAt: string; // ISO date
}

function textContains(haystack: string, keywords: string[]): boolean {
  const lower = haystack.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

// ── GitHub Security Advisories ────────────────────────────────────────────────

interface GithubAdvisory {
  ghsa_id: string;
  html_url: string;
  summary: string;
  description: string | null;
  published_at: string;
}

export async function fetchGithubAdvisories(keywords: string[]): Promise<ExternalSourceItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "content-storm-arbitrage-scanner",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  // The REST advisories endpoint has no free-text query param — filter by
  // ecosystem/severity/affects, not keywords — so pull the most recent
  // advisories and filter client-side against the module's keywords.
  const res = await fetch(
    "https://api.github.com/advisories?per_page=50&sort=published&direction=desc",
    { headers }
  );
  if (!res.ok) {
    console.error(`[arbitrage] GitHub advisories fetch failed: ${res.status}`);
    return [];
  }

  const advisories = (await res.json()) as GithubAdvisory[];
  return advisories
    .filter((a) => textContains(`${a.summary} ${a.description ?? ""}`, keywords))
    .map((a) => ({
      sourceUrl:   a.html_url,
      sourceType:  "GITHUB_ADVISORY" as const,
      title:       a.summary,
      excerpt:     (a.description ?? a.summary).slice(0, 2000),
      publishedAt: a.published_at,
    }));
}

// ── arXiv (academic journals) ─────────────────────────────────────────────────

export async function fetchArxivPapers(keywords: string[]): Promise<ExternalSourceItem[]> {
  if (keywords.length === 0) return [];

  // arXiv's query syntax ANDs terms with `+AND+`; OR groups need parens.
  // Keep it simple — search the primary keyword in title+abstract.
  const searchQuery = `all:${encodeURIComponent(keywords[0])}`;
  const url = `http://export.arxiv.org/api/query?search_query=${searchQuery}&sortBy=submittedDate&sortOrder=descending&max_results=15`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[arbitrage] arXiv fetch failed: ${res.status}`);
    return [];
  }

  const xml  = await res.text();
  const dom  = new JSDOM(xml, { contentType: "text/xml" });
  const entries = Array.from(dom.window.document.querySelectorAll("entry"));

  return entries
    .map((entry): ExternalSourceItem | null => {
      const title   = entry.querySelector("title")?.textContent?.trim();
      const summary = entry.querySelector("summary")?.textContent?.trim();
      const link    = entry.querySelector("id")?.textContent?.trim(); // arXiv's <id> is the canonical abs URL
      const published = entry.querySelector("published")?.textContent?.trim();
      if (!title || !summary || !link || !published) return null;
      return {
        sourceUrl:   link,
        sourceType:  "ACADEMIC_JOURNAL" as const,
        title,
        excerpt:     summary.slice(0, 2000),
        publishedAt: published,
      };
    })
    .filter((item): item is ExternalSourceItem => item !== null)
    .filter((item) => textContains(`${item.title} ${item.excerpt}`, keywords));
}

// ── Federal Register (regulatory updates) ────────────────────────────────────

interface FederalRegisterDocument {
  html_url: string;
  title: string;
  abstract: string | null;
  publication_date: string;
}

export async function fetchRegulatoryUpdates(keywords: string[]): Promise<ExternalSourceItem[]> {
  if (keywords.length === 0) return [];

  const params = new URLSearchParams({
    "conditions[term]": keywords[0],
    "order": "newest",
    "per_page": "15",
  });
  const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[arbitrage] Federal Register fetch failed: ${res.status}`);
    return [];
  }

  const body = (await res.json()) as { results?: FederalRegisterDocument[] };
  return (body.results ?? [])
    .filter((d) => d.abstract)
    .map((d) => ({
      sourceUrl:   d.html_url,
      sourceType:  "REGULATORY_UPDATE" as const,
      title:       d.title,
      excerpt:     (d.abstract ?? "").slice(0, 2000),
      publishedAt: d.publication_date,
    }));
}

// ── PatentsView (patent registries) ───────────────────────────────────────────
// Same endpoint + auth pattern as this project's own patent-search skill
// (/mnt/skills/user/patent-search) — X-Api-Key header, PATENTSVIEW_API_KEY.

interface PatentsViewPatent {
  patent_id: string;
  patent_title: string;
  patent_abstract: string | null;
  patent_date: string;
}

export async function fetchPatentFilings(keywords: string[]): Promise<ExternalSourceItem[]> {
  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey || keywords.length === 0) return [];

  const query = JSON.stringify({ _text_any: { patent_abstract: keywords.join(" ") } });
  const fields = JSON.stringify(["patent_id", "patent_title", "patent_abstract", "patent_date"]);
  const options = JSON.stringify({ size: 15 });

  const url =
    `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(query)}` +
    `&f=${encodeURIComponent(fields)}&o=${encodeURIComponent(options)}`;

  const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });
  if (!res.ok) {
    console.error(`[arbitrage] PatentsView fetch failed: ${res.status}`);
    return [];
  }

  const body = (await res.json()) as { patents?: PatentsViewPatent[] };
  return (body.patents ?? [])
    .filter((p) => p.patent_abstract)
    .map((p) => ({
      sourceUrl:   `https://patents.google.com/patent/US${p.patent_id}`,
      sourceType:  "PATENT" as const,
      title:       p.patent_title,
      excerpt:     (p.patent_abstract ?? "").slice(0, 2000),
      publishedAt: p.patent_date,
    }));
}

/**
 * Fetch from every configured adapter. GitHub and arXiv are always
 * attempted (keyless). Federal Register is keyless too. PatentsView only
 * runs if PATENTSVIEW_API_KEY is set — silently skipped otherwise rather
 * than failing the whole scan over one unconfigured source.
 */
export async function fetchAllExternalSources(keywords: string[]): Promise<ExternalSourceItem[]> {
  const results = await Promise.allSettled([
    fetchGithubAdvisories(keywords),
    fetchArxivPapers(keywords),
    fetchRegulatoryUpdates(keywords),
    fetchPatentFilings(keywords),
  ]);

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
