<script lang="ts">
  import '../app.css';
  import '../port.css';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { SITE_DESCRIPTION, SITE_NAME } from '$lib';
  import StartMenu from '$lib/components/StartMenu.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import GameModeEditor from '$lib/components/GameModeEditor.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import WikiSearch from '$lib/components/wiki/WikiSearch.svelte';
  import { overlays, type CoverCard } from '$lib/components/overlays.svelte';
  import { getWikiArticleSummaries, getWikiIndexGroups } from '$lib/wiki';
  import { gameSession } from '$lib/game';
  import { loadSettings } from '$lib/game/storage';
  import { setLanguage, text } from '$lib/live/format';
  import '$lib/components/styledText.css';
  import '$lib/components/dragAndDrop.css';

  let { children } = $props();
  const session = gameSession.state;
  let menuOpen = $state(false);
  let modalPage = $derived(['/settings', '/game-modes', '/gameMode'].includes(page.url.pathname));
  let card = $derived(overlays.card ?? (page.url.pathname === '/settings' ? 'settings' : modalPage ? 'game-modes' : null));
  let backdropPressed = false;
  let rateLimitNotice = $state('');
  $effect(() => { page.url.pathname; menuOpen = false; overlays.card = null; });

  function openCard(value: CoverCard): void { overlays.card = value; menuOpen = false; }
  function closeCard(): void { overlays.card = null; if (modalPage) void goto('/'); }
  function quit(): void {
    gameSession.leaveRoom();
    gameSession.disconnect();
    menuOpen = false;
    overlays.card = null;
    void goto('/');
  }

  onMount(() => {
    const settings = loadSettings();
    setLanguage(settings.language);
    document.documentElement.style.fontSize = settings.fontSize + 'em';
    document.body.dataset.accessibleFont = String(settings.accessibilityFont);
    let dismissTimer: number | undefined;
    const unsubscribe = gameSession.subscribePackets((packet) => {
      if (packet.type !== 'rateLimitExceeded') return;
      rateLimitNotice = text('notification.rateLimitExceeded');
      if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
      dismissTimer = window.setTimeout(() => rateLimitNotice = '', 4_000);
    });
    return () => { unsubscribe(); if (dismissTimer !== undefined) window.clearTimeout(dismissTimer); };
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
  <title>{SITE_NAME}</title>
  <meta name="description" content={SITE_DESCRIPTION} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={SITE_NAME} />
  <meta property="og:description" content={SITE_DESCRIPTION} />
</svelte:head>

<svelte:window onkeydown={event => { if (event.key === 'Escape') { closeCard(); menuOpen = false; } }} onclick={event => { if (event.target instanceof Element && !event.target.closest('.global-menu, .global-menu-button')) menuOpen = false; }} />

<div class="anchor">
  <button class="button global-menu-button" class:flush={page.url.pathname !== '/game'} aria-label="Menu" aria-expanded={menuOpen} onclick={() => menuOpen = !menuOpen}><Icon>menu</Icon></button>
  {#if menuOpen}
    <nav class="chat-menu-colors global-menu slide-in" aria-label="Main menu">
      {#if $session.kind !== 'outsideRoom'}
        <section class="standout">
          <h2>{$session.lobbyName}</h2>
          <button class="button" onclick={() => navigator.clipboard.writeText(location.origin + '/connect?code=' + $session.roomCode.toString(18))}><Icon>link_2</Icon> {text('menu.lobby.button.copyLink')}</button>
          {#if $session.kind === 'game' && $session.hostClients !== null}
            <button class="button" onclick={() => gameSession.forceBackToLobby()}>{text('backToLobby')}</button>
            <button class="button" onclick={() => openCard('host')}>{text('menu.hostSettings.title')}</button>
          {/if}
        </section>
      {/if}
      <section>
        {#if page.url.pathname !== '/' && !modalPage}<button onclick={quit}><Icon>not_interested</Icon> {text('menu.globalMenu.quitToMenu')}</button>{/if}
        <button onclick={() => openCard('settings')}><Icon>settings</Icon> {text('menu.globalMenu.settings')}</button>
        <button onclick={() => openCard('game-modes')}><Icon>edit</Icon> {text('menu.globalMenu.gameSettingsEditor')}</button>
        <button onclick={() => openCard('wiki')}><Icon>menu_book</Icon> {text('menu.wiki.title')}</button>
      </section>
    </nav>
  {/if}
    <div class="screen" inert={card !== null && card !== 'host'}>
    {#if modalPage}<StartMenu />{:else}{@render children()}{/if}
  </div>
  {#if card && card !== 'host'}
    <div class="anchor-cover-card-background-cover" class:graveyard-menu-colors={card === 'settings'} class:chat-menu-colors={card === 'game-modes'} class:wiki-menu-colors={card === 'wiki'} role="presentation" onpointerdown={event => backdropPressed = event.target === event.currentTarget} onpointerup={event => { if (backdropPressed && event.target === event.currentTarget) closeCard(); backdropPressed = false; }}>
      <div class="anchor-cover-card" role="dialog" aria-modal="true" aria-label={card} tabindex="-1">
        <button class="button close-button flush" onclick={closeCard} aria-label="Close"><Icon>close</Icon></button>
        <div class="anchor-cover-card-content">
          {#if modalPage && overlays.card === null}{@render children()}
          {:else if card === 'settings'}<Settings />
          {:else if card === 'game-modes'}<GameModeEditor />
          {:else if card === 'wiki'}<div class="wiki-cover-card"><WikiSearch articles={getWikiArticleSummaries()} groups={getWikiIndexGroups()} inline /></div>{/if}
        </div>
      </div>
    </div>
  {/if}
</div>
{#if rateLimitNotice}<div class="error-card" role="alert"><header><h2>{text('error')}</h2><button class="close" aria-label="Dismiss" onclick={() => rateLimitNotice = ''}>×</button></header><div>{rateLimitNotice}</div></div>{/if}

<style>
  .screen { height: 100%; }
</style>
