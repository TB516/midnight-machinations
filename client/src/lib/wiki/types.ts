export const WIKI_KINDS = ["category", "role", "modifier", "standard", "generated"] as const;

export type WikiKind = (typeof WIKI_KINDS)[number];

export const WIKI_CATEGORIES = [
    "categories",
    "town",
    "mafia",
    "cult",
    "neutral",
    "minions",
    "fiends",
    "modifiers",
    "abilities",
    "strategies",
    "menus",
    "phases",
    "trial",
] as const;

export type WikiCategory = (typeof WIKI_CATEGORIES)[number];
export type WikiCategoryGroup = WikiCategory | "uncategorized";
export type WikiArticleId = `${WikiKind}/${string}`;

export interface WikiArticleSummary {
    id: WikiArticleId;
    kind: WikiKind;
    slug: string;
    title: string;
    href: `/wiki/${WikiKind}/${string}`;
    categories: WikiCategoryGroup[];
    excerpt: string;
    searchText: string;
}

export interface WikiFact {
    label: string;
    value: string;
}

export interface WikiSection {
    title: string;
    markdown: string;
}

export interface WikiExample {
    label: string;
    text: string;
    description?: string;
}

export interface WikiArticleGroup {
    title: string;
    description: string | null;
    articles: WikiArticleSummary[];
}

/** Plain serializable data returned by the prerendered article route. */
export interface WikiArticle extends WikiArticleSummary {
    subtitle: string | null;
    markdown: string;
    facts: WikiFact[];
    sections: WikiSection[];
    examples: WikiExample[];
    relatedArticles: WikiArticleSummary[];
    groups: WikiArticleGroup[];
    sourceText: string | null;
}

export interface WikiIndexGroup {
    id: WikiCategoryGroup;
    title: string;
    articles: WikiArticleSummary[];
}

export interface WikiEntry {
    kind: WikiKind;
    slug: string;
}
