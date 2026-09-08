<script lang="ts">
  import type { GameState } from '$lib/game/state';
  import { getWikiArticle, getWikiArticleSummaries, getWikiIndexGroups, type WikiArticleId } from '$lib/wiki';
  import WikiSearch from '../wiki/WikiSearch.svelte';
  let { state, articleId = null }: { state: GameState; articleId?: WikiArticleId | null } = $props();
</script>

{#key articleId}<WikiSearch articles={getWikiArticleSummaries()} groups={getWikiIndexGroups()} initialArticle={articleId ? getWikiArticle(articleId) : null} inline enabledRoleIds={state.enabledRoles} enabledModifierIds={state.modifierSettings.modifiers.map(([id]) => id)} />{/key}
