/**
 * Emits a schema.org JSON-LD block.
 *
 * Server component with no "use client": the payload ships inside the initial
 * HTML, which is what crawlers read — they do not wait for client hydration.
 */
export default function JsonLd({ data }: { data: Record<string, any> | Record<string, any>[] }) {
  return (
    <script
      type="application/ld+json"
      // The JSON is injected verbatim, so "<" is escaped: without it a literal
      // "</script>" inside any content string would close the tag early and
      // spill the rest of the payload into the document as markup.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
