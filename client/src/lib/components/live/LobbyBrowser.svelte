<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, untrack } from 'svelte';
  import {
    gameConnection,
    gameSession,
    gameState,
    loadReconnectData,
    type GameSessionState,
    type ReconnectData,
    type RoomCode
  } from '$lib/game';
  import { roomCode as formatRoomCode, text } from '$lib/live/format';

  interface Props {
    initialCode?: string;
    autoJoin?: boolean;
  }

  let { initialCode = '', autoJoin = false }: Props = $props();

  let enteredCode = $state(untrack(() => initialCode));
  let playerId = $state('');
  let savedReconnect = $state<ReconnectData | null>(null);
  let busy = $state<'host' | 'join' | 'reconnect' | 'server' | null>(null);
  let status = $state('');
  let statusKind = $state<'neutral' | 'error'>('neutral');
  let didAutoJoin = false;

  let lobbies = $derived($gameState.kind === 'outsideRoom' ? $gameState.lobbies : []);
  let joinRejection = $derived(
    $gameState.kind === 'outsideRoom' ? $gameState.lastJoinRejection : null
  );

  onMount(() => {
    let active = true;
    savedReconnect = loadReconnectData();

    const unsubscribe = gameState.subscribe((state) => {
      if (!active) return;
      navigateForRoomState(state);
    });

    void initialize();
    const refreshTimer = window.setInterval(() => {
      if (gameSession.getSnapshot().kind === 'outsideRoom') {
        void gameSession.requestLobbyList();
      }
    }, 2_500);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refreshTimer);
    };
  });

  async function initialize(): Promise<void> {
    const state = gameSession.getSnapshot();
    if (state.kind !== 'outsideRoom') {
      navigateForRoomState(state);
      return;
    }

    status = 'Connecting to the lobby server...';
    statusKind = 'neutral';
    const connected = await gameSession.open();
    if (!connected) {
      status = gameSession.getConnectionSnapshot().error ?? 'Could not reach the lobby server.';
      statusKind = 'error';
      return;
    }

    status = '';
    await gameSession.requestLobbyList();
    if (autoJoin && !didAutoJoin && initialCode.trim() !== '') {
      didAutoJoin = true;
      await joinWithCode(initialCode);
    }
  }

  function navigateForRoomState(state: GameSessionState): void {
    if (state.kind === 'game') {
      void goto('/game');
      return;
    }
    if (state.kind === 'lobby') {
      void goto(`/lobby/${formatRoomCode(state.roomCode).toLocaleLowerCase('en-US')}`);
    }
  }

  function parseRoomCode(value: string): RoomCode | null {
    const normalized = value.trim();
    if (!/^[0-9a-h]+$/i.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 18);
    if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
    return parsed;
  }

  function parsePlayerId(value: string): number | null {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 4_294_967_295) return null;
    return parsed;
  }

  async function host(): Promise<void> {
    busy = 'host';
    status = 'Opening a new room...';
    statusKind = 'neutral';
    const joined = await gameSession.hostRoom();
    if (!joined) {
      const state = gameSession.getSnapshot();
      const rejection = state.kind === 'outsideRoom' ? state.lastJoinRejection : null;
      status = rejection
        ? text(`notification.rejectJoin.${rejection}`)
        : gameSession.getConnectionSnapshot().error ?? 'The server could not open a room.';
      statusKind = 'error';
    }
    busy = null;
  }

  async function joinWithCode(value: string, reconnectId?: number): Promise<void> {
    const code = parseRoomCode(value);
    if (code === null) {
      status = 'Room codes use the digits 0 to 9 and letters A to H.';
      statusKind = 'error';
      return;
    }

    busy = reconnectId === undefined ? 'join' : 'reconnect';
    status = reconnectId === undefined
      ? `Joining room ${formatRoomCode(code)}...`
      : `Reconnecting to room ${formatRoomCode(code)}...`;
    statusKind = 'neutral';
    const joined = reconnectId === undefined
      ? await gameSession.joinRoom(code)
      : await gameSession.rejoinRoom(code, reconnectId);

    if (!joined) {
      const state = gameSession.getSnapshot();
      const rejection = state.kind === 'outsideRoom' ? state.lastJoinRejection : null;
      status = rejection
        ? text(`notification.rejectJoin.${rejection}`)
        : gameSession.getConnectionSnapshot().error ?? 'The room did not accept the connection.';
      statusKind = 'error';
    }
    busy = null;
  }

  async function joinManual(): Promise<void> {
    const reconnectId = parsePlayerId(playerId);
    if (playerId.trim() !== '' && reconnectId === null) {
      status = 'The reconnect ID must be a whole number.';
      statusKind = 'error';
      return;
    }
    await joinWithCode(enteredCode, reconnectId ?? undefined);
  }

  async function reconnectSaved(): Promise<void> {
    if (!savedReconnect) return;
    busy = 'reconnect';
    status = `Reconnecting to room ${formatRoomCode(savedReconnect.roomCode)}...`;
    statusKind = 'neutral';
    const joined = await gameSession.reconnectStored();
    if (!joined) {
      savedReconnect = loadReconnectData();
      const state = gameSession.getSnapshot();
      const rejection = state.kind === 'outsideRoom' ? state.lastJoinRejection : null;
      status = rejection
        ? text(`notification.rejectJoin.${rejection}`)
        : gameSession.getConnectionSnapshot().error ?? 'The saved seat is no longer available.';
      statusKind = 'error';
    }
    busy = null;
  }

  async function retryServer(): Promise<void> {
    busy = 'server';
    status = 'Connecting to the lobby server...';
    statusKind = 'neutral';
    const connected = await gameSession.open();
    if (connected) {
      status = '';
      await gameSession.requestLobbyList();
    } else {
      status = gameSession.getConnectionSnapshot().error ?? 'Could not reach the lobby server.';
      statusKind = 'error';
    }
    busy = null;
  }
</script>

<div class="play-menu">
  <div class="play-menu-browser graveyard-menu-colors">
    <header>
      <h2>{text('menu.play.title')}</h2>
      <div>
        <button aria-label="Refresh room list" disabled={busy !== null} onclick={() => void gameSession.requestLobbyList()}>↻</button>
        <button class="brand" disabled={busy !== null} onclick={() => void host()}>{busy === 'host' ? 'Opening room...' : text('menu.play.button.host')}</button>
      </div>
    </header>
    {#if $gameConnection.status === 'closed' || $gameConnection.status === 'error'}
      <div role="alert">{$gameConnection.error ?? 'Connection lost.'}<button disabled={busy !== null} onclick={() => void retryServer()}>Reconnect</button></div>
    {/if}
    <div class="play-menu-center">
      <table>
        <thead><tr><th aria-label="Join"></th><th>{text('menu.play.field.name')}</th><th>{text('players')}</th></tr></thead>
        <tbody>
          {#each lobbies as [code, lobby] (code)}
            <tr>
              <td><button disabled={busy !== null} onclick={() => void joinWithCode(formatRoomCode(code))}>{lobby.inGame ? 'Spectate' : text('menu.play.button.join')}</button></td>
              <td title={lobby.name}>{lobby.name}</td>
              <td><div class="play-menu-lobby-player-list">
                {#each lobby.players as [id, name] (id)}
                  <button disabled={busy !== null} onclick={() => void joinWithCode(formatRoomCode(code), id)}>{name}</button>
                {/each}
              </div></td>
            </tr>
          {/each}
        </tbody>
        <tfoot aria-hidden="true">
          {#each Array(100) as _, index (index)}<tr><td></td><td></td><td></td></tr>{/each}
        </tfoot>
      </table>
    </div>
    <footer>
      {#if savedReconnect}<button disabled={busy !== null} onclick={() => void reconnectSaved()}>Reconnect {formatRoomCode(savedReconnect.roomCode)}</button>{/if}
      <form onsubmit={(event) => { event.preventDefault(); void joinManual(); }}>
        <label>{text('menu.play.field.roomCode')} <input bind:value={enteredCode} autocomplete="off" autocapitalize="characters" /></label>
        <label>{text('menu.play.field.playerId')} <input bind:value={playerId} inputmode="numeric" type="number" min="0" /></label>
        <button disabled={busy !== null || enteredCode.trim() === ''}>{text('menu.play.button.join')}</button>
      </form>
    </footer>
    {#if status || joinRejection || $gameConnection.error}
      <p role="status">{status || (joinRejection ? text(`notification.rejectJoin.${joinRejection}`) : $gameConnection.error)}</p>
    {/if}
  </div>
</div>

<style>
  footer form { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 1rem; }
  footer label { display: flex; align-items: center; gap: 0.5rem; }
  footer input { width: 8rem; }
</style>
