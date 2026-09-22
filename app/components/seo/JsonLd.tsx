/**
 * Renders a JSON-LD structured data block. The data is always a plain
 * object we build ourselves (never raw user input), and JSON.stringify
 * escapes it, so this is safe against injection the way
 * dangerouslySetInnerHTML normally isn't.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
