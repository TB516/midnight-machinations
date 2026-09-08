<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import WikiLink from './WikiLink.svelte';
  import WikiArticle from './WikiArticle.svelte';
  import Icon from '../Icon.svelte';
  import Select from '../Select.svelte';
  import CheckBox from '../CheckBox.svelte';
  import StyledText from '../StyledText.svelte';
  import { text } from '$lib/live/format';
  import { defaultGameModes, loadGameModes } from '$lib/game-modes';
  import { roleData } from '$lib/game/roles';
  import { getWikiArticle, isWikiArticleId, type WikiArticleSummary, type WikiIndexGroup, type WikiArticle as Article } from '$lib/wiki';
  import '../wiki.css';

  let { articles, groups, inline = false, initialArticle = null, enabledRoleIds, enabledModifierIds }: { articles: WikiArticleSummary[]; groups: WikiIndexGroup[]; inline?: boolean; initialArticle?: Article | null; enabledRoleIds?: string[]; enabledModifierIds?: string[] } = $props();
  let chosen = $state<Article | null | undefined>(undefined);
  let history = $state<Article[]>([]);
  let displayedArticle = $derived(chosen === undefined ? initialArticle : chosen);
  let query = $state('');
  let hideDisabled = $state(true);
  let gameModes = $state(defaultGameModes().gameModes);
  let modeName = $state(defaultGameModes().gameModes.some(mode => mode.name === 'Experimental') ? 'Experimental' : 'all');
  let width = $state(300);
  let columns = $derived(Math.max(Math.floor(width / 300), 1));
  let selectedMode = $derived(gameModes.find(mode => mode.name === modeName));
  let enabledRoles = $derived(new Set<string>(enabledRoleIds ?? Object.values(selectedMode?.data ?? {}).flatMap(data => data.enabledRoles)));
  let enabledModifiers = $derived(new Set<string>(enabledModifierIds ?? Object.values(selectedMode?.data ?? {}).flatMap(data => data.modifierSettings.map(([id]) => id))));
  let options = $derived([{value: 'all', label: text('wiki.disabledSelector.all')}, ...gameModes.map(mode => ({value: mode.name, label: mode.name}))]);
  let normalized = $derived(query.trim().toLowerCase());
  let results = $derived([...articles.filter(article => article.title.toLowerCase().includes(normalized)), ...articles.filter(article => !article.title.toLowerCase().includes(normalized) && article.searchText.includes(normalized))].filter(article => !hideDisabled || enabled(article)));
  let partitions = $derived(groups.filter(group => group.id !== 'uncategorized').map(group => ({...group, articles: group.articles.filter(article => !hideDisabled || enabled(article))})));
  let uncategorized = $derived(groups.find(group => group.id === 'uncategorized')?.articles.filter(article => !hideDisabled || enabled(article)) ?? []);

  onMount(() => { query = page.url.searchParams.get('search') ?? ''; const loaded = loadGameModes(localStorage); if (loaded.ok) gameModes = loaded.value.gameModes; });
  function enabled(article: WikiArticleSummary): boolean {
    if (modeName === 'all' && !enabledRoleIds) return true;
    if (article.kind === 'role') return enabledRoles.has(article.slug);
    if (article.kind === 'modifier') return enabledModifiers.has(article.slug);
    if (article.id === 'standard/mafia' || article.id === 'standard/cult') return Object.entries(roleData).some(([role, data]) => enabledRoles.has(role) && data.roleSets.some(set => set === article.slug));
    if (article.kind === 'category') return (groups.find(group => group.id === article.slug)?.articles ?? []).some(other => other.id !== article.id && enabled(other));
    return true;
  }
  function navigate(event: MouseEvent): void {
    if (!inline || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>('a[href^="/wiki/"]');
    if (!anchor) return;
    const id = decodeURIComponent(anchor.pathname.slice('/wiki/'.length));
    if (!isWikiArticleId(id)) return;
    event.preventDefault();
    const article = getWikiArticle(id);
    if (!article) return;
    if (displayedArticle) history = [...history.slice(-49), displayedArticle];
    chosen = article;
  }
  function back(): void { chosen = history.at(-1) ?? null; history = history.slice(0, -1); query = ''; }
</script>

<div class="wiki-search" role="presentation" onclick={navigate}>
  <div class="wiki-search-bar">
    <button tabindex="-1" aria-label="Back to search" onclick={back}><Icon>arrow_back</Icon></button>
    <input type="text" aria-label="Search wiki" bind:value={query} placeholder={text('menu.wiki.search.placeholder')} onkeydown={event => { if (event.key === 'Enter') { chosen = null; history = []; } }} />
    <button tabindex="-1" aria-label="Clear search" onclick={() => {query = ''; chosen = null; history = [];}}><Icon>close</Icon></button>
  </div>
  {#if displayedArticle}<WikiArticle article={displayedArticle} />{:else}
  <div class="wiki-results" tabindex="-1">
    {#if query === ''}
      <div class="wiki-main-page" bind:clientWidth={width}>
        <div class="masonry">
          {#each Array(columns) as _, column}
            <div class="masonry-column">
              {#each partitions.filter((_, index) => index % columns === column) as group (group.id)}
                <div class="masonry-item">
                  {#if group.articles.length}
                    <h3 class="wiki-search-divider"><StyledText value={group.title} /></h3>
                    {#each group.articles as article (article.id)}<WikiLink {article} disabled={!enabled(article)} />{/each}
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
        {#if uncategorized.length}
          <h3 class="wiki-search-divider"><StyledText value={text('wiki.category.uncategorized')} /></h3>
          {#each uncategorized as article (article.id)}<WikiLink {article} disabled={!enabled(article)} />{/each}
        {/if}
      </div>
    {:else}
      <div>{#each results as article (article.id)}<WikiLink {article} disabled={!enabled(article)} />{/each}</div>
    {/if}
  </div>
  {/if}
  <div class="wiki-disabled-selector">
    {#if !enabledRoleIds}<label class="centered-label">{text('wiki.disabledSelector.gameMode')}<Select value={modeName} {options} onchange={value => modeName = value} /></label>{/if}
    {#if modeName !== 'all'}<div class="centered-label filter-label">{text('hideDisabled')}<CheckBox label={text('hideDisabled')} checked={hideDisabled} onchange={value => hideDisabled = value} /></div>{/if}
  </div>
</div>

<style>
  .masonry { display: flex; width: 100%; }
  .masonry-column { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .filter-label { background-color: var(--primary-color); border-radius: .5rem; padding: .25rem .5rem; }
</style>
