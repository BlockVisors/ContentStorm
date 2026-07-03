// pdf-parse ships types for its top-level entrypoint but not for
// pdf-parse/lib/pdf-parse.js directly. extract.ts imports that inner path
// deliberately (see extract.ts's own comment: "avoid pdf-parse's debug
// entrypoint" — the top-level index.js runs a demo/debug block when required
// directly under certain conditions). This declaration covers just that path.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
