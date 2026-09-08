import { getWikiArticleSummaries, getWikiIndexGroups } from "$lib/wiki";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = () => {
    return {
        articles: getWikiArticleSummaries(),
        groups: getWikiIndexGroups(),
    };
};
