import { error } from "@sveltejs/kit";
import {
    getAdjacentWikiArticles,
    getWikiArticle,
    getWikiEntries,
    isWikiArticleId,
    isWikiKind,
    type WikiArticleId,
} from "$lib/wiki";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => getWikiEntries();

export const load: PageLoad = ({ params }) => {
    if (!isWikiKind(params.kind)) {
        error(404, "Unknown wiki article type");
    }

    const id = `${params.kind}/${params.slug}`;
    if (!isWikiArticleId(id)) {
        error(404, "Wiki article not found");
    }

    const articleId = id as WikiArticleId;
    const article = getWikiArticle(articleId);
    if (!article) {
        error(404, "Wiki article not found");
    }

    return {
        article,
        adjacent: getAdjacentWikiArticles(articleId),
    };
};
