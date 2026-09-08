import { marked } from "marked";

const MARKDOWN_OPTIONS = {
    breaks: true,
    gfm: true,
} as const;

/**
 * Render trusted, repository-owned wiki copy. User-provided text must not be
 * passed here without sanitizing it first.
 */
export function renderWikiMarkdown(markdown: string): string {
    const html = marked.parse(markdown, MARKDOWN_OPTIONS);

    if (typeof html !== "string") {
        throw new Error("Wiki markdown unexpectedly rendered asynchronously");
    }

    return html;
}

export function markdownToPlainText(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]*>/g, " ")
        .replace(/[#>*_~\-|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
