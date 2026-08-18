import { createElement, type ReactNode } from "react";

function resolveAssetUrl(url: string, baseUrl: string, resourceBase: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//") || url.startsWith("#")) {
    return url;
  }
  if (url.startsWith("/")) {
    const cleanBase = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
    return `${cleanBase}${url}`;
  }
  return `${resourceBase}${url}`;
}

function renderInline(
  text: string,
  baseUrl = "/",
  resourceBase = "/",
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{renderInline(token.slice(2, -2), baseUrl, resourceBase)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{renderInline(token.slice(1, -1), baseUrl, resourceBase)}</em>);
    } else if (token.startsWith("![")) {
      const urlStart = token.indexOf("](");
      const alt = token.slice(2, urlStart);
      const src = token.slice(urlStart + 2, -1);
      nodes.push(
          <img
            key={key++}
            src={resolveAssetUrl(src, baseUrl, resourceBase)}
            alt={alt}
            loading="lazy"
          />,
        );
    } else if (token.startsWith("[")) {
      const urlStart = token.indexOf("](");
      const label = token.slice(1, urlStart);
      const href = token.slice(urlStart + 2, -1);
      nodes.push(
        <a key={key++} href={resolveAssetUrl(href, baseUrl, resourceBase)} target="_blank" rel="noopener noreferrer">
          {renderInline(label, baseUrl, resourceBase)}
        </a>,
      );
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function isFence(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line);
}

function isUnorderedList(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrderedList(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line);
}

function isBlockquote(line: string): boolean {
  return /^\s*>\s?/.test(line);
}

function isBlockStart(line: string): boolean {
  return (
    isFence(line) ||
    isHeading(line) ||
    isUnorderedList(line) ||
    isOrderedList(line) ||
    isBlockquote(line)
  );
}

export function Markdown({
  source,
  baseUrl = "/",
  resourceBase = "/",
}: {
  readonly source: string;
  readonly baseUrl?: string;
  readonly resourceBase?: string;
}) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isFence(line)) {
      const fence = line.trim().startsWith("```") ? "```" : "~~~";
      const language = line.trim().slice(fence.length).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith(fence)) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={key++}>
          <code className={language ? `language-${language}` : undefined}>
            {code.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    if (isHeading(line)) {
      const level = line.match(/^#{1,6}/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,6}\s*/, "");
      blocks.push(createElement(`h${level}`, { key: key++ }, ...renderInline(text, baseUrl, resourceBase)));
      index += 1;
      continue;
    }

    if (isUnorderedList(line)) {
      const items: string[] = [];
      while (index < lines.length && isUnorderedList(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOrderedList(line)) {
      const items: string[] = [];
      while (index < lines.length && isOrderedList(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (isBlockquote(line)) {
      const quote: string[] = [];
      while (index < lines.length && isBlockquote(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={key++}>
          {quote.map((item, itemIndex) => (
            <p key={itemIndex}>{renderInline(item, baseUrl, resourceBase)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
        <p key={key++}>{renderInline(paragraph.join("\n"), baseUrl, resourceBase)}</p>,
      );
  }

  return <div className="markdown-body">{blocks}</div>;
}
