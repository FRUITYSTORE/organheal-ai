import { Fragment, type ReactNode } from "react";

/**
 * Shows an assistant answer that may contain light markdown (**bold** and
 * "- " lists) as real formatting instead of raw asterisks. It builds React
 * elements only, so nothing from the answer is ever inserted as HTML.
 */
function renderInline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  );
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (bullet) {
      if (last?.type === "list") {
        last.items.push(bullet[1]);
      } else {
        blocks.push({ type: "list", items: [bullet[1]] });
      }
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  return blocks;
}

export default function FormattedAnswer({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={className} dir="auto">
      {toBlocks(text).map((block, index) =>
        block.type === "list" ? (
          <ul key={index} style={{ margin: "8px 0", paddingInlineStart: 20 }}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={index} style={{ margin: "8px 0" }}>
            {renderInline(block.text)}
          </p>
        )
      )}
    </div>
  );
}
