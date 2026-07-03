// Type stub for @mozilla/readability.
// Recent versions ship their own types; this covers older installs or
// environments where the bundled .d.ts isn't resolved.
declare module "@mozilla/readability" {
  export interface Article {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
  }

  export class Readability {
    constructor(doc: Document, options?: Record<string, unknown>);
    parse(): Article | null;
  }
}
