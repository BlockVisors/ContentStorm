import type { IngestSource } from "./queue";
import { getObjectBuffer } from "./storage";

/**
 * Source text extraction (Blueprint §5.1). Heavy parsers are dynamically
 * imported so they never enter the API route bundle — only the worker process
 * pulls jsdom / pdf-parse into memory.
 */

export async function extractText(source: IngestSource): Promise<string> {
  switch (source.kind) {
    case "text":
      return (source.raw ?? "").trim();

    case "pdf": {
      if (!source.s3Key) throw new Error("pdf source missing s3Key");
      const buf = await getObjectBuffer(source.s3Key);
      // Import the parser directly to avoid pdf-parse's debug entrypoint.
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default as (
        b: Buffer
      ) => Promise<{ text: string }>;
      const data = await pdf(buf);
      return data.text.trim();
    }

    case "url": {
      if (!source.url) throw new Error("url source missing url");
      const res = await fetch(source.url, {
        headers: { "User-Agent": "ContentStorm/1.0 (+ingest)" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`Fetch ${source.url} failed: ${res.status}`);
      const html = await res.text();

      const { JSDOM } = await import("jsdom");
      const { Readability } = await import("@mozilla/readability");
      const dom = new JSDOM(html, { url: source.url });
      const article = new Readability(dom.window.document).parse();
      const text =
        article?.textContent?.trim() ||
        dom.window.document.body?.textContent?.trim() ||
        "";
      if (!text) throw new Error(`No extractable text at ${source.url}`);
      return text;
    }

    default: {
      const _exhaustive: never = source.kind;
      throw new Error(`Unsupported source kind: ${_exhaustive}`);
    }
  }
}
