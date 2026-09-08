<script lang="ts">
  import FlushInput from '../FlushInput.svelte';
  import Icon from '../Icon.svelte';
  import '../settings.css';
  import '../lobbyMenu.css';
  let refreshed = $state('');
  $effect(() => { game.hostClients; refreshed = new Date().toLocaleTimeString(); });
  import type { GameState } from '$lib/game/state';
  import type { RoomClientID } from '$lib/game/packets';
  import { playerName, roomCode, text } from '$lib/live/format';

  interface Props {
    state: GameState;
    onClose: () => void;
    onRefresh: () => void;
    onBackToLobby: () => void;
    onEndGame: () => void;
    onSkipPhase: () => void;
    onRename: (id: RoomClientID, name: string) => void;
    onTransferHost: (id: RoomClientID) => void;
    onKick: (id: RoomClientID) => void;
    onRelinquish: () => void;
  }

  let {
    state: game,
    onClose,
    onRefresh,
    onBackToLobby,
    onEndGame,
    onSkipPhase,
    onRename,
    onTransferHost,
    onKick,
    onRelinquish
  }: Props = $props();

  let names = $derived(game.players.map((player) => player.name));
  let canManageGame = $derived(game.client.type === 'player');
  let renameDrafts = $state<Record<number, string>>({});


</script>

<div class="anchor-cover-card-background-cover graveyard-menu-colors" role="presentation" onclick={event => { if (event.target === event.currentTarget) onClose(); }}>
  <div class="anchor-cover-card" role="dialog" aria-modal="true" aria-label={text('menu.hostSettings.title')} tabindex="-1">
    <button class="button close-button flush" onclick={onClose} aria-label="Close"><Icon>close</Icon></button>
    <div class="anchor-cover-card-content">
      <div class="settings-menu-card">
        <header><h3>{text('menu.hostSettings.title')}</h3><button class="button" onclick={onRefresh}>{text('refresh')}</button></header>
        <main class="settings-menu">
          <section class="player-list-menu-colors selector-section lobby-player-list-section">
            <div class="lobby-player-list"><ol>
              {#each ['player', 'spectator'] as type}
                {#if type === 'spectator' && game.hostClients?.some(([, client]) => client.clientType.type === type)}<h3><Icon size="small">visibility</Icon> {text('menu.hostSettings.spectators')}</h3>{/if}
                {#each game.hostClients?.filter(([, client]) => client.clientType.type === type) ?? [] as [id, client] (id)}
                  <li class:keyword-dead={client.connection !== 'connected'}>
                    <div>
                      {#if client.connection === 'couldReconnect'}<Icon>signal_cellular_connected_no_internet_4_bar</Icon>{/if}
                      {#if client.connection === 'disconnected'}<Icon>sentiment_very_dissatisfied</Icon>{/if}
                      {#if client.host}<Icon>shield</Icon>{/if}
                      <FlushInput class="lobby-player-list-player-rename" value={client.clientType.type === 'player' ? names[client.clientType.index] : String(client.clientType.index)} label="Player name" onconfirm={value => onRename(id, value)} />
                    </div>
                    <div>
                      {#if !client.host}<button class="button" aria-label="Make host" onclick={() => onTransferHost(id)}><Icon>add_moderator</Icon></button>{/if}
                      {#if client.connection !== 'disconnected'}<button class="button" aria-label="Kick player" onclick={() => onKick(id)}><Icon>person_remove</Icon></button>{/if}
                    </div>
                  </li>
                {/each}
              {/each}
            </ol></div>
          </section>
          <section class="chat-menu-colors selector-section"><div class="host-buttons">
            <button class="button" onclick={onBackToLobby}>{text('backToLobby')}</button>
            <button class="button" onclick={onEndGame}>{text('menu.hostSettings.endGame')}</button>
            <button class="button" onclick={onSkipPhase}>{text('menu.hostSettings.skipPhase')}</button>
          </div></section>
        </main>
        <footer>{text('menu.hostSettings.lastRefresh', refreshed)}</footer>
      </div>
    </div>
  </div>
</div>
