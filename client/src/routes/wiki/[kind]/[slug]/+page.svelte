<script lang="ts">
  import WikiSearch from '$lib/components/wiki/WikiSearch.svelte';
  import { getWikiArticleSummaries, getWikiIndexGroups } from '$lib/wiki';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.article.title} | Midnight Manual</title>
  <meta name="description" content={data.article.excerpt || 'Read about ' + data.article.title + '.'} />
</svelte:head>

<div class="standalone-wiki wiki-menu-colors">
  <header><h2>Midnight Manual</h2></header>
  <div>{#key data.article.id}<WikiSearch articles={getWikiArticleSummaries()} groups={getWikiIndexGroups()} initialArticle={data.article} />{/key}</div>
</div>
