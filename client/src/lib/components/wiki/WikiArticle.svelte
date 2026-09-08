<script lang="ts">
  import WikiLink from './WikiLink.svelte';
  import WikiMarkdown from './WikiMarkdown.svelte';
  import StyledText from '../StyledText.svelte';
  import DetailsSummary from '../DetailsSummary.svelte';
  import ChatPanel from '../live/ChatPanel.svelte';
  import { roleData, type Role } from '$lib/game/roles';
  import type { ChatMessageVariant } from '$lib/game/chat';
  import type { RoleList } from '$lib/game/role-list';
  import dummyNames from '../../../resources/dummyNames.json';
  import dummyRoleList from '../../../resources/dummyRoleList.json';
  import { text } from '$lib/live/format';
  import type { WikiArticle as WikiArticleData } from '$lib/wiki';
  import '../wiki.css';
  let { article }: { article: WikiArticleData } = $props();
  let roleMarkdown = $derived('# ' + article.title + '\n### ' + (article.subtitle ?? '') + '\n' + article.markdown.replace(/^## /gm, '### '));
  let metadata = $derived(article.kind === 'role' ? roleData[article.slug as Role] : null);
  let chatExamples = $derived((metadata?.chatMessages as ChatMessageVariant[] ?? []).map((variant, index): [number, {variant: ChatMessageVariant; chatGroup: 'all'}] => [index, {variant, chatGroup: 'all'}]));
</script>

<section class="wiki-article">
  {#if article.kind === 'role'}
    <div><WikiMarkdown source={roleMarkdown} /></div>
    <div>{#each article.facts as fact}<WikiMarkdown source={'### ' + fact.label + ': ' + fact.value} />{/each}</div>
    {#if chatExamples.length}
      <div class="wiki-message-section">
        <WikiMarkdown source={'### ' + text('wiki.article.role.chatMessages')} />
        <ChatPanel embedded messages={chatExamples} players={dummyNames} roleList={dummyRoleList as RoleList} />
      </div>
    {/if}
    {#each article.examples.filter(example => example.label === text('wiki.article.role.exampleAlibi')) as example}
      <div class="wiki-message-section">
        <WikiMarkdown source={'### ' + example.label} />
        {#if example.description}<WikiMarkdown source={example.description} />{/if}
        <blockquote><WikiMarkdown source={example.text} /></blockquote>
      </div>
    {/each}
    <DetailsSummary summary={text('wiki.article.role.details')}>
      {#each article.sections as section}<WikiMarkdown source={'### ' + section.title + '\n' + section.markdown} />{/each}
      {#if metadata}
        <WikiMarkdown source={'### ' + text('wiki.article.standard.roleLimit.title') + ': ' + (metadata.maxCount ?? text('none')) + '\n### ' + text('defense') + ': ' + text('defense.' + (metadata.armor ? 'armored' : 'none')) + '\n### ' + text('wiki.article.standard.aura.title') + ': ' + (metadata.aura ? text(metadata.aura + 'Aura') : text('none'))} />
      {/if}
    </DetailsSummary>
  {:else}
    <WikiMarkdown source={'# ' + article.title + '\n' + article.markdown} />
  {/if}
  {#if article.relatedArticles.length}
    <h3 class="wiki-search-divider"><StyledText value={article.title} /></h3>
    {#each article.relatedArticles as related}<WikiLink article={related} />{/each}
  {/if}
  {#each article.groups as group}
    <h3 class="wiki-search-divider"><StyledText value={group.title} /></h3>
    {#if group.description}<WikiMarkdown source={group.description} />{/if}
    {#each group.articles as groupedArticle}<WikiLink article={groupedArticle} />{/each}
  {/each}
  {#if article.sourceText}<pre><code>{article.sourceText}</code></pre>{/if}
</section>
