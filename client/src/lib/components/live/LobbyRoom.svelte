<script lang="ts">
  import Icon from '../Icon.svelte';
  import StyledText from '../StyledText.svelte';
  import FlushInput from '../FlushInput.svelte';
  import '../lobbyMenu.css';
  import '../lobbyChatMenu.css';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import ChatPanel from '$lib/components/live/ChatPanel.svelte';
  import LobbySettings from '$lib/components/live/LobbySettings.svelte';
  import {
    gameConnection,
    gameSession,
    type LobbyClient,
    type LobbyState,
    type RoomClientID
  } from '$lib/game';
  import { roomCode as formatRoomCode, text } from '$lib/live/format';

  interface Props {
    lobby: LobbyState;
  }

  let { lobby }: Props = $props();

  let lobbyNameDraft = $state(untrack(() => lobby.lobbyName));
  let playerNameDraft = $state('');
  let editingLobbyName = $state(false);
  let editingPlayerName = $state(false);
  let startBusy = $state(false);
  let notice = $state('');
  let noticeKind = $state<'neutral' | 'error' | 'success'>('neutral');
  let reconnectBusy = $state(false);
  let reconnectError = $state('');

  let myClient = $derived(lobby.players.find(([id]) => id === lobby.myId)?.[1]);
  let isHost = $derived(myClient?.ready === 'host');
  let isSpectator = $derived(myClient?.clientType.type === 'spectator');
  let playerEntries = $derived(lobby.players.filter(([, client]) => client.clientType.type === 'player'));
  let spectatorEntries = $derived(lobby.players.filter(([, client]) => client.clientType.type === 'spectator'));
  let playerNames = $derived(playerEntries.map(([, client]) => client.clientType.type === 'player' ? client.clientType.name : ''));
  let readyPlayers = $derived(playerEntries.filter(([, client]) => client.ready === 'ready' || client.ready === 'host').length);

  $effect(() => {
    if (!editingLobbyName) lobbyNameDraft = lobby.lobbyName;
  });

  $effect(() => {
    if (editingPlayerName) return;
    playerNameDraft = myClient?.clientType.type === 'player' ? myClient.clientType.name : '';
  });

  function connectionLabel(client: LobbyClient): string {
    if (client.connection === 'connected') return 'Online';
    if (client.connection === 'couldReconnect') return 'Seat held';
    return 'Disconnected';
  }

  function readinessLabel(client: LobbyClient): string {
    if (client.ready === 'host') return 'Host';
    if (client.clientType.type === 'spectator') return 'Spectating';
    if (client.ready === 'ready') return 'Ready';
    return 'Waiting';
  }

  function commitLobbyName(): void {
    editingLobbyName = false;
    const name = lobbyNameDraft.trim();
    if (name === lobby.lobbyName) return;
    gameSession.setLobbyName(name);
  }

  function commitPlayerName(): void {
    editingPlayerName = false;
    const name = playerNameDraft.trim();
    if (name === '' || name === (myClient?.clientType.type === 'player' ? myClient.clientType.name : '')) return;
    gameSession.setName(name);
  }

  function renamePlayer(id: RoomClientID, value: string): void {
    const name = value.trim();
    if (name !== '') gameSession.forceSetPlayerName(id, name);
  }

  async function copyInvite(): Promise<void> {
    const url = `${window.location.origin}/connect?code=${formatRoomCode(lobby.roomCode).toLocaleLowerCase('en-US')}`;
    try {
      await navigator.clipboard.writeText(url);
      notice = 'Invite link copied.';
      noticeKind = 'success';
    } catch {
      notice = `Copy this link: ${url}`;
      noticeKind = 'neutral';
    }
  }

  async function startGame(): Promise<void> {
    startBusy = true;
    notice = 'Starting the game...';
    noticeKind = 'neutral';
    const started = await gameSession.startGame();
    if (!started) {
      const snapshot = gameSession.getSnapshot();
      const rejection = snapshot.kind === 'lobby' ? snapshot.lastStartRejection : null;
      notice = rejection
        ? text(`notification.rejectStart.${rejection}`)
        : gameSession.getConnectionSnapshot().error ?? 'The game did not start.';
      noticeKind = 'error';
    }
    startBusy = false;
  }

  function leaveRoom(): void {
    gameSession.leaveRoom();
    void goto('/play');
  }

  function waitForTransportClose(): Promise<void> {
    if (gameSession.getConnectionSnapshot().status === 'closed') return Promise.resolve();

    return new Promise((resolve) => {
      let unsubscribe = () => {};
      let timeout: number | undefined;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (timeout !== undefined) window.clearTimeout(timeout);
        unsubscribe();
        resolve();
      };

      unsubscribe = gameConnection.subscribe((connection) => {
        if (connection.status === 'closed') finish();
      });
      if (finished) {
        unsubscribe();
        return;
      }
      timeout = window.setTimeout(finish, 2_000);
      gameSession.close();
    });
  }

  async function reconnect(): Promise<void> {
    reconnectBusy = true;
    reconnectError = '';

    const connection = gameSession.getConnectionSnapshot();
    if (connection.status !== 'closed' && connection.status !== 'idle') {
      await waitForTransportClose();
    }

    const recovered = await gameSession.reconnectStored();
    if (recovered) {
      notice = 'Connection restored.';
      noticeKind = 'success';
    } else {
      reconnectError = gameSession.getConnectionSnapshot().error
        ?? 'The server could not restore this seat. Try again or return to the room browser.';
    }
    reconnectBusy = false;
  }

  let collapsedChat = $state(false);
</script>

<div class="lm">
  <div class="graveyard-menu-colors">
    <header>
      <div>
        <button class="button start brand" disabled={!isHost || startBusy} onclick={startGame}><Icon>play_arrow</Icon>{text('menu.lobby.button.start')}</button>
        <button class="button flush" aria-label="Copy room link" onclick={copyInvite}><Icon>link_2</Icon></button>
      </div>
      {#if isHost}<FlushInput class="lobby-name-field" value={lobbyNameDraft} label="Lobby name" onconfirm={value => gameSession.setLobbyName(value)} />{:else}<h3>{lobby.lobbyName}</h3>{/if}
    </header>
    {#if noticeKind === 'error' && notice}<p role="alert">{notice}</p>{/if}
    {#if $gameConnection.status !== 'open'}<div role="alert">{reconnectError || $gameConnection.error || 'Connection lost'}<button class="button" disabled={reconnectBusy} onclick={reconnect}>Reconnect</button></div>{/if}
    <main class="chat-menu-colors">
      <div>
        <section class="chat-menu-colors selector-section">
          <div class="lobby-name-pane">
            {#if !isSpectator}<div class="name-pane-selector"><div class="lobby-name">
              {#if myClient?.ready === 'ready'}<h2>{playerNameDraft}</h2>
              {:else}<FlushInput value={playerNameDraft} label="Player name" onconfirm={value => gameSession.setName(value)} />{/if}
            </div></div>{/if}
            <div class="name-pane-buttons">
              {#if myClient?.ready !== 'ready'}<button class="button" onclick={() => gameSession.setSpectator(!isSpectator)}><Icon>{isSpectator ? 'sports_esports' : 'visibility'}</Icon> {text(isSpectator ? 'switchToPlayer' : 'switchToSpectator')}</button>{/if}
              {#if isHost}<button class="button" onclick={() => gameSession.relinquishHost()}><Icon>remove_moderator</Icon> {text('menu.lobby.button.relinquishHost')}</button>
              {:else}<button class="button brand" class:depressed={myClient?.ready === 'ready'} onclick={() => gameSession.setReady(myClient?.ready !== 'ready')}><Icon>{myClient?.ready === 'ready' ? 'clear' : 'check'}</Icon> {text(myClient?.ready === 'ready' ? 'menu.lobby.button.unready' : 'menu.lobby.button.readyUp')}</button>{/if}
            </div>
          </div>
        </section>
        <section class="player-list-menu-colors selector-section lobby-player-list-section">
          <div class="lobby-player-list"><ol>
            {#each [...playerEntries, ...spectatorEntries] as [id, client], index (id)}
              {#if client.clientType.type === 'spectator' && index === playerEntries.length}<h3><Icon size="small">visibility</Icon> {text('menu.hostSettings.spectators')}</h3>{/if}
              <li class:keyword-dead={client.connection !== 'connected'}>
                <div>
                  {#if client.connection === 'couldReconnect'}<Icon>signal_cellular_connected_no_internet_4_bar</Icon>{:else if client.connection === 'disconnected'}<Icon>sentiment_very_dissatisfied</Icon>{/if}
                  <Icon>{client.ready === 'host' ? 'shield' : client.ready === 'ready' ? 'check' : 'schedule'}</Icon>
                  {#if isHost && client.clientType.type === 'player'}<FlushInput class="lobby-player-list-player-rename" value={client.clientType.name} label="Player name" onconfirm={value => renamePlayer(id, value)} />
                  {:else}<span class:keyword-dead={client.ready === 'notReady'}><StyledText value={client.clientType.type === 'player' ? client.clientType.name : 'Spectator'} /></span>{/if}
                </div>
                <div>
                  {#if isHost && client.ready !== 'host'}<button class="button" aria-label="Make host" onclick={() => gameSession.setPlayerHost(id)}><Icon>add_moderator</Icon></button>{/if}
                  {#if isHost && client.connection !== 'disconnected'}<button class="button" aria-label="Remove player" onclick={() => gameSession.kickPlayer(id)}><Icon>person_remove</Icon></button>{/if}
                </div>
              </li>
            {/each}
          </ol></div>
        </section>
      </div>
      <div class="vertical-line-separator"></div>
      <div><LobbySettings {lobby} disabled={!isHost} /></div>
    </main>
    <section class="lobby-chat-menu chat-menu-colors selector-section">
      <button class="button lobby-chat-menu-header" onclick={() => collapsedChat = !collapsedChat}><h2><Icon size="small">chat</Icon>{text('menu.chat.title')}</h2><Icon>{collapsedChat ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</Icon></button>
      <div hidden={collapsedChat}>
        <ChatPanel lobby messages={lobby.chatMessages} players={[]} roleList={lobby.roleList} canSend={!isSpectator} onSend={message => gameSession.sendLobbyMessage(message)} />
      </div>
    </section>
  </div>
</div>
